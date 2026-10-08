//! System tray icon and menu: the app's home while it runs in the background.

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Emitter, Manager};

use crate::panels;

pub fn create(app: &App) -> tauri::Result<()> {
    let title = MenuItemBuilder::new("Quick Pending").enabled(false).build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&title)
        .separator()
        .text("capture", "Capture Pending")
        .text("pendings", "Open Pendings")
        .text("history", "History")
        .separator()
        .text("settings", "Settings")
        .text("quit", "Quit")
        .build()?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().cloned().expect("app icon is bundled"))
        .tooltip("Quick Pending")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "capture" => panels::show(app, panels::CAPTURE),
            "pendings" => open_main(app, "active"),
            "history" => open_main(app, "completed"),
            "settings" => open_main(app, "settings"),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Shows the main window on a view: "active", "completed" or "settings".
pub fn open_main(app: &AppHandle, view: &str) {
    let Some(win) = app.get_webview_window("main") else { return };
    let _ = win.show();
    let _ = win.unminimize();
    let _ = win.set_focus();
    let _ = app.emit_to("main", "navigate", view);
}
