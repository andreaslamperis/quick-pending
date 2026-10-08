//! Floating panels summoned by global shortcuts (see shortcuts.rs): Quick Capture and
//! the Pending List palette.
//!
//! Both windows are created hidden at startup (see tauri.conf.json) and only shown/hidden
//! here, so opening them is instantaneous.

use tauri::{AppHandle, Manager, PhysicalPosition, State, WebviewWindow};

use crate::commands::notify_changed;
use crate::db::{self, Db};

pub const CAPTURE: &str = "capture";
pub const PALETTE: &str = "palette";

/// Vertical position of a panel's top edge, as a fraction of the screen height.
const TOP_OFFSET: f64 = 0.2;

pub fn is_panel(label: &str) -> bool {
    label == CAPTURE || label == PALETTE
}

pub fn toggle(app: &AppHandle, label: &str) {
    match app.get_webview_window(label) {
        Some(win) if win.is_visible().unwrap_or(false) => dismiss(&win),
        _ => show(app, label),
    }
}

pub fn show(app: &AppHandle, label: &str) {
    let Some(win) = app.get_webview_window(label) else { return };
    position_top_center(&win);
    let _ = win.show();
    let _ = win.set_focus();
}

/// Hides a panel without touching app focus (used when it loses focus).
pub fn hide(win: &WebviewWindow) {
    let _ = win.hide();
}

/// Hides a panel and hands focus back to the app the user was in.
fn dismiss(win: &WebviewWindow) {
    hide(win);
    // On macOS hiding a window leaves this app active; hiding the app returns focus.
    #[cfg(target_os = "macos")]
    let _ = win.app_handle().hide();
}

/// Centers the window horizontally near the top of the monitor the cursor is on.
fn position_top_center(win: &WebviewWindow) {
    let app = win.app_handle();
    let monitor = app
        .cursor_position()
        .ok()
        .and_then(|p| app.monitor_from_point(p.x, p.y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    let (Some(monitor), Ok(size), Ok(scale)) = (monitor, win.outer_size(), win.scale_factor())
    else {
        return;
    };

    // The window is resized to the target monitor's DPI once it lands there.
    let width = size.width as f64 / scale * monitor.scale_factor();
    let origin = monitor.position();
    let screen = monitor.size();
    let x = origin.x as f64 + (screen.width as f64 - width) / 2.0;
    let y = origin.y as f64 + screen.height as f64 * TOP_OFFSET;
    let _ = win.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

/// Saves the captured text and closes Quick Capture.
#[tauri::command(async)]
pub fn submit_capture(app: AppHandle, db: State<Db>, text: String) -> db::Result<()> {
    notify_changed(&app, db::create(&db.lock().unwrap(), &text))?;
    if let Some(win) = app.get_webview_window(CAPTURE) {
        dismiss(&win);
    }
    Ok(())
}

/// Closes the panel that calls it.
#[tauri::command]
pub fn close_panel(window: WebviewWindow) {
    dismiss(&window);
}
