//! SQLite storage for pendings. All SQL lives here; commands and UI never touch it directly.

use std::path::Path;
use std::sync::Mutex;

use rusqlite::{Connection, OptionalExtension, Params, Row};
use serde::Serialize;

/// The shared connection, managed as Tauri state.
pub type Db = Mutex<Connection>;
pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pending {
    pub id: String,
    pub text: String,
    pub status: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snoozed_until: Option<String>,
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS pendings (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    snoozed_until TEXT
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);";

const COLUMNS: &str = "id, text, status, created_at, completed_at, snoozed_until";

/// Current UTC time in the same ISO 8601 format as JavaScript's `toISOString()`,
/// so timestamps from both sides compare correctly as strings.
const NOW: &str = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

pub fn open(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path).map_err(to_string)?;
    conn.execute_batch(SCHEMA).map_err(to_string)?;
    Ok(conn)
}

pub fn create(conn: &Connection, text: &str) -> Result<Pending> {
    let sql = format!(
        "INSERT INTO pendings (id, text, created_at)
         VALUES (lower(hex(randomblob(16))), ?1, {NOW})
         RETURNING {COLUMNS}"
    );
    conn.query_row(&sql, [clean(text)?], from_row).map_err(to_string)
}

/// Pending items plus snoozed ones whose snooze has expired, newest first.
pub fn list_active(conn: &Connection) -> Result<Vec<Pending>> {
    query(
        conn,
        &format!(
            "SELECT {COLUMNS} FROM pendings
             WHERE status = 'pending' OR (status = 'snoozed' AND snoozed_until <= {NOW})
             ORDER BY created_at DESC, rowid DESC"
        ),
    )
}

/// Completed items, most recently completed first.
pub fn list_completed(conn: &Connection) -> Result<Vec<Pending>> {
    query(
        conn,
        &format!(
            "SELECT {COLUMNS} FROM pendings WHERE status = 'completed' ORDER BY completed_at DESC, rowid DESC"
        ),
    )
}

pub fn complete(conn: &Connection, id: &str) -> Result<()> {
    let sql = format!(
        "UPDATE pendings SET status = 'completed', completed_at = {NOW}, snoozed_until = NULL
         WHERE id = ?1"
    );
    update(conn, &sql, [id])
}

pub fn reopen(conn: &Connection, id: &str) -> Result<()> {
    update(
        conn,
        "UPDATE pendings SET status = 'pending', completed_at = NULL, snoozed_until = NULL
         WHERE id = ?1",
        [id],
    )
}

pub fn edit(conn: &Connection, id: &str, text: &str) -> Result<()> {
    update(conn, "UPDATE pendings SET text = ?2 WHERE id = ?1", (id, clean(text)?))
}

pub fn delete(conn: &Connection, id: &str) -> Result<()> {
    update(conn, "DELETE FROM pendings WHERE id = ?1", [id])
}

/// Hides the pending until `until` (an ISO 8601 UTC timestamp).
pub fn snooze(conn: &Connection, id: &str, until: &str) -> Result<()> {
    update(
        conn,
        "UPDATE pendings SET status = 'snoozed', snoozed_until = ?2 WHERE id = ?1",
        (id, until),
    )
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| row.get(0))
        .optional()
        .map_err(to_string)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        [key, value],
    )
    .map(|_| ())
    .map_err(to_string)
}

fn query(conn: &Connection, sql: &str) -> Result<Vec<Pending>> {
    let mut stmt = conn.prepare(sql).map_err(to_string)?;
    let rows = stmt.query_map([], from_row).map_err(to_string)?;
    rows.collect::<rusqlite::Result<_>>().map_err(to_string)
}

/// Runs a statement that must affect exactly one existing pending.
fn update(conn: &Connection, sql: &str, params: impl Params) -> Result<()> {
    match conn.execute(sql, params).map_err(to_string)? {
        0 => Err("pending not found".into()),
        _ => Ok(()),
    }
}

fn from_row(row: &Row) -> rusqlite::Result<Pending> {
    Ok(Pending {
        id: row.get(0)?,
        text: row.get(1)?,
        status: row.get(2)?,
        created_at: row.get(3)?,
        completed_at: row.get(4)?,
        snoozed_until: row.get(5)?,
    })
}

fn clean(text: &str) -> Result<&str> {
    match text.trim() {
        "" => Err("text cannot be empty".into()),
        text => Ok(text),
    }
}

fn to_string(err: rusqlite::Error) -> String {
    err.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA).unwrap();
        conn
    }

    fn texts(items: Vec<Pending>) -> Vec<String> {
        items.into_iter().map(|p| p.text).collect()
    }

    #[test]
    fn create_and_list() {
        let conn = db();
        let p = create(&conn, "  Reply to George  ").unwrap();
        assert_eq!(p.text, "Reply to George");
        assert_eq!(p.status, "pending");
        assert_eq!(p.id.len(), 32);
        assert!(p.created_at.ends_with('Z'));
        create(&conn, "Check CI").unwrap();
        // Newest first.
        assert_eq!(texts(list_active(&conn).unwrap()), ["Check CI", "Reply to George"]);
    }

    #[test]
    fn rejects_empty_text() {
        let conn = db();
        assert!(create(&conn, "   ").is_err());
        let p = create(&conn, "x").unwrap();
        assert!(edit(&conn, &p.id, "").is_err());
    }

    #[test]
    fn edit_updates_text() {
        let conn = db();
        let p = create(&conn, "old").unwrap();
        edit(&conn, &p.id, "new").unwrap();
        assert_eq!(texts(list_active(&conn).unwrap()), ["new"]);
    }

    #[test]
    fn complete_and_reopen() {
        let conn = db();
        let p = create(&conn, "task").unwrap();
        complete(&conn, &p.id).unwrap();
        assert!(list_active(&conn).unwrap().is_empty());
        let done = list_completed(&conn).unwrap();
        assert_eq!(done[0].status, "completed");
        assert!(done[0].completed_at.is_some());

        reopen(&conn, &p.id).unwrap();
        assert!(list_completed(&conn).unwrap().is_empty());
        assert_eq!(list_active(&conn).unwrap()[0].completed_at, None);
    }

    #[test]
    fn delete_removes() {
        let conn = db();
        let p = create(&conn, "task").unwrap();
        delete(&conn, &p.id).unwrap();
        assert!(list_active(&conn).unwrap().is_empty());
        assert!(delete(&conn, &p.id).is_err());
    }

    #[test]
    fn snooze_hides_until_expired() {
        let conn = db();
        let future = create(&conn, "later").unwrap();
        let past = create(&conn, "expired").unwrap();
        snooze(&conn, &future.id, "2999-01-01T09:00:00.000Z").unwrap();
        snooze(&conn, &past.id, "2000-01-01T09:00:00.000Z").unwrap();
        assert_eq!(texts(list_active(&conn).unwrap()), ["expired"]);
    }

    #[test]
    fn unknown_id_is_an_error() {
        let conn = db();
        assert!(complete(&conn, "nope").is_err());
        assert!(edit(&conn, "nope", "x").is_err());
        assert!(snooze(&conn, "nope", "2999-01-01T00:00:00.000Z").is_err());
    }

    #[test]
    fn settings_round_trip() {
        let conn = db();
        assert_eq!(get_setting(&conn, "k").unwrap(), None);
        set_setting(&conn, "k", "a").unwrap();
        set_setting(&conn, "k", "b").unwrap();
        assert_eq!(get_setting(&conn, "k").unwrap().as_deref(), Some("b"));
    }

    #[test]
    fn persists_across_connections() {
        let path = std::env::temp_dir().join(format!("qp-test-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        {
            let conn = open(&path).unwrap();
            create(&conn, "survives restart").unwrap();
        }
        let conn = open(&path).unwrap();
        assert_eq!(texts(list_active(&conn).unwrap()), ["survives restart"]);
        drop(conn);
        std::fs::remove_file(&path).unwrap();
    }
}
