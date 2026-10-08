//! Global shortcuts: which key combination triggers which action. Users change them in
//! Settings; each one is stored in the settings table and can also be left unset.

use std::collections::HashMap;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Modifiers, Shortcut};

use crate::db::{self, Db};
use crate::{panels, tray};

struct Action {
    id: &'static str,
    name: &'static str,
    default: Option<&'static str>,
}

const ACTIONS: [Action; 3] = [
    Action { id: "capture", name: "Capture Pending", default: Some("CommandOrControl+Shift+Space") },
    Action { id: "main", name: "Open Pendings", default: None },
    Action { id: "palette", name: "Pending List", default: Some("CommandOrControl+Alt+P") },
];

/// The keys assigned to each action id; an action without an entry has no shortcut.
pub type Assigned = Mutex<HashMap<&'static str, String>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutInfo {
    action: &'static str,
    name: &'static str,
    keys: Option<String>,
    default_keys: Option<&'static str>,
    /// False when the keys are set but another app already owns them.
    registered: bool,
}

fn setting_key(action: &str) -> String {
    format!("shortcut.{action}")
}

/// Saved shortcuts, falling back to the defaults. A stored "" means "no shortcut".
pub fn load(conn: &Connection) -> HashMap<&'static str, String> {
    ACTIONS
        .iter()
        .filter_map(|action| {
            let saved = db::get_setting(conn, &setting_key(action.id)).ok().flatten();
            let keys = saved.or_else(|| action.default.map(String::from))?;
            (!keys.is_empty()).then_some((action.id, keys))
        })
        .collect()
}

/// Parses keys such as "Ctrl+Alt+Z". Shift alone isn't enough: Shift+A just types "A".
fn parse(keys: &str) -> Result<Shortcut, String> {
    let shortcut: Shortcut = keys.parse().map_err(|_| "That key can't be used in a shortcut.".to_string())?;
    if !shortcut.mods.intersects(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SUPER) {
        return Err("Include Ctrl, Alt or Win in the shortcut.".into());
    }
    Ok(shortcut)
}

/// Registers every assigned shortcut from scratch and returns the actions whose keys
/// another app already owns.
pub fn register_all(app: &AppHandle, assigned: &HashMap<&'static str, String>) -> Vec<&'static str> {
    let manager = app.global_shortcut();
    let _ = manager.unregister_all();
    assigned
        .iter()
        .filter(|(_, keys)| manager.register(keys.as_str()).is_err())
        .map(|(id, _)| *id)
        .collect()
}

/// Runs the action bound to a pressed shortcut.
pub fn trigger(app: &AppHandle, pressed: &Shortcut) {
    let action = {
        let assigned = app.state::<Assigned>();
        let assigned = assigned.lock().unwrap();
        assigned
            .iter()
            .find(|(_, keys)| keys.parse::<Shortcut>().is_ok_and(|s| s == *pressed))
            .map(|(id, _)| *id)
    };
    match action {
        Some("capture") => panels::toggle(app, panels::CAPTURE),
        Some("palette") => panels::toggle(app, panels::PALETTE),
        Some("main") => tray::toggle_main(app),
        _ => {}
    }
}

#[tauri::command]
pub fn get_shortcuts(app: AppHandle, assigned: State<Assigned>) -> Vec<ShortcutInfo> {
    let assigned = assigned.lock().unwrap();
    ACTIONS
        .iter()
        .map(|action| {
            let keys = assigned.get(action.id).cloned();
            ShortcutInfo {
                action: action.id,
                name: action.name,
                registered: keys.as_deref().is_some_and(|k| app.global_shortcut().is_registered(k)),
                keys,
                default_keys: action.default,
            }
        })
        .collect()
}

/// Turns all shortcuts off while Settings records a new one, so pressing a combination
/// that is already in use reaches the recorder instead of triggering its action.
#[tauri::command]
pub fn pause_shortcuts(app: AppHandle) {
    let _ = app.global_shortcut().unregister_all();
}

#[tauri::command]
pub fn resume_shortcuts(app: AppHandle, assigned: State<Assigned>) {
    register_all(&app, &assigned.lock().unwrap());
}

/// Assigns `keys` to `action` (None removes its shortcut) and turns shortcuts back on.
/// If another app owns the keys, the previous shortcut is kept.
#[tauri::command(async)]
pub fn set_shortcut(
    app: AppHandle,
    db: State<Db>,
    assigned: State<Assigned>,
    action: String,
    keys: Option<String>,
) -> db::Result<()> {
    let action = ACTIONS.iter().find(|a| a.id == action).ok_or("unknown action")?;
    let mut assigned = assigned.lock().unwrap();

    if let Some(keys) = &keys {
        let wanted = parse(keys)?;
        let taken_by = ACTIONS.iter().find(|other| {
            other.id != action.id
                && assigned.get(other.id).is_some_and(|k| k.parse::<Shortcut>().is_ok_and(|s| s == wanted))
        });
        if let Some(other) = taken_by {
            register_all(&app, &assigned);
            return Err(format!("Already used for {}.", other.name));
        }
    }

    let previous = assigned.get(action.id).cloned();
    match &keys {
        Some(keys) => assigned.insert(action.id, keys.clone()),
        None => assigned.remove(action.id),
    };
    if register_all(&app, &assigned).contains(&action.id) {
        match previous {
            Some(previous) => assigned.insert(action.id, previous),
            None => assigned.remove(action.id),
        };
        register_all(&app, &assigned);
        return Err("Another app is using that shortcut. Pick a different one.".into());
    }

    db::set_setting(&db.lock().unwrap(), &setting_key(action.id), keys.as_deref().unwrap_or(""))?;
    let _ = app.emit("shortcuts-changed", ());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requires_ctrl_alt_or_win() {
        assert!(parse("Ctrl+Alt+Z").is_ok());
        assert!(parse("Alt+F").is_ok());
        assert!(parse("Super+Shift+K").is_ok());
        assert!(parse("CommandOrControl+Shift+Space").is_ok());
        assert!(parse("Shift+A").is_err());
        assert!(parse("Z").is_err());
    }

    #[test]
    fn rejects_unknown_keys() {
        assert!(parse("Ctrl+Alt+Nope").is_err());
        assert!(parse("Ctrl+Alt").is_err());
        assert!(parse("").is_err());
    }

    #[test]
    fn accepts_browser_key_codes() {
        // The recorder sends KeyboardEvent.code names (layout independent).
        assert_eq!(parse("Ctrl+Alt+KeyZ").unwrap(), parse("Ctrl+Alt+Z").unwrap());
        assert!(parse("Ctrl+Alt+ArrowUp").is_ok());
        assert!(parse("Ctrl+Alt+Digit1").is_ok());
    }

    #[test]
    fn loads_defaults_saved_and_cleared() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);").unwrap();

        let defaults = load(&conn);
        assert_eq!(defaults.get("capture").map(String::as_str), Some("CommandOrControl+Shift+Space"));
        assert_eq!(defaults.get("main"), None);

        db::set_setting(&conn, "shortcut.main", "Ctrl+Alt+F").unwrap();
        db::set_setting(&conn, "shortcut.capture", "").unwrap();
        let saved = load(&conn);
        assert_eq!(saved.get("main").map(String::as_str), Some("Ctrl+Alt+F"));
        assert_eq!(saved.get("capture"), None);
        assert_eq!(saved.get("palette").map(String::as_str), Some("CommandOrControl+Alt+P"));
    }
}
