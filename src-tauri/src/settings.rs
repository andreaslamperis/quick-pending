//! App settings and the commands behind the Settings view.

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager, State, Theme};
use tauri_plugin_autostart::ManagerExt;

use crate::db::{self, Db};

/// Stored as "true"/"false"; missing means the default, on.
const LAUNCH_AT_STARTUP: &str = "launch_at_startup";
/// "system", "light" or "dark"; missing means "dark", the app's native look.
const THEME: &str = "theme";
const THEMES: [&str; 3] = ["system", "light", "dark"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    launch_at_startup: bool,
    theme: String,
}

/// Makes the OS login item match the saved preference. Run on every launch of an
/// installed build, so a fresh install (or reinstall) starts with the OS and the
/// entry always points at the current executable.
pub fn sync_launch_at_startup(app: &AppHandle, conn: &Connection) -> db::Result<()> {
    let enabled = db::get_setting(conn, LAUNCH_AT_STARTUP)?.as_deref() != Some("false");
    set_login_item(app, enabled)
}

fn set_login_item(app: &AppHandle, enabled: bool) -> db::Result<()> {
    let autolaunch = app.autolaunch();
    let result = if enabled { autolaunch.enable() } else { autolaunch.disable() };
    result.map_err(|e| e.to_string())
}

pub fn saved_theme(conn: &Connection) -> String {
    db::get_setting(conn, THEME).ok().flatten().unwrap_or_else(|| "dark".into())
}

/// Applies the theme to every window: title bars follow it, and so does each
/// webview's `prefers-color-scheme`, which the CSS uses.
pub fn apply_theme(app: &AppHandle, theme: &str) {
    let theme = match theme {
        "light" => Some(Theme::Light),
        "dark" => Some(Theme::Dark),
        _ => None,
    };
    for win in app.webview_windows().values() {
        let _ = win.set_theme(theme);
    }
}

#[tauri::command(async)]
pub fn get_settings(app: AppHandle, db: State<Db>) -> db::Result<Settings> {
    Ok(Settings {
        launch_at_startup: app.autolaunch().is_enabled().map_err(|e| e.to_string())?,
        theme: saved_theme(&db.lock().unwrap()),
    })
}

#[tauri::command(async)]
pub fn set_launch_at_startup(app: AppHandle, db: State<Db>, enabled: bool) -> db::Result<()> {
    set_login_item(&app, enabled)?;
    db::set_setting(&db.lock().unwrap(), LAUNCH_AT_STARTUP, &enabled.to_string())
}

#[tauri::command(async)]
pub fn set_theme(app: AppHandle, db: State<Db>, theme: String) -> db::Result<()> {
    if !THEMES.contains(&theme.as_str()) {
        return Err(format!("unknown theme: {theme}"));
    }
    db::set_setting(&db.lock().unwrap(), THEME, &theme)?;
    apply_theme(&app, &theme);
    Ok(())
}
