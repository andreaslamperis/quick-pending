//! System tray icon and menu: the app's home while it runs in the background.
//! Double-click the icon to open the main window; right-click for the menu.

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
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
        // A left click would open the menu before a double-click completes. macOS has
        // no double-click on menu bar items, so there the menu stays on left click.
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } = event {
                open_main(tray.app_handle(), "active");
            }
        })
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

/// For the Open Pendings shortcut: opens the main window, or hides it if it's already
/// the window in front.
pub fn toggle_main(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else { return };
    let in_front = win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false);
    if in_front {
        let _ = win.hide();
    } else {
        open_main(app, "active");
    }
}
