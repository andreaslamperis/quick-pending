mod commands;
mod db;
mod panels;
mod settings;
mod tray;

use std::sync::Mutex;

use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Passed when the OS launches the app at login, so it starts quietly in the tray.
const AUTOSTART_ARG: &str = "--autostart";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch just opens the running app.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::open_main(app, "active");
        }))
        .plugin(tauri_plugin_autostart::Builder::new().arg(AUTOSTART_ARG).build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(label) = panels::for_shortcut(shortcut) {
                            panels::toggle(app, label);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // A menu-bar utility: no Dock icon.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let conn = db::open(&dir.join("quick-pending.db"))?;

            // Installed builds start with the OS unless turned off in Settings.
            // Dev builds never register themselves.
            if !cfg!(debug_assertions) {
                if let Err(err) = settings::sync_launch_at_startup(app.handle(), &conn) {
                    eprintln!("failed to update launch at startup: {err}");
                }
            }
            settings::apply_theme(app.handle(), &settings::saved_theme(&conn));
            app.manage(Mutex::new(conn));

            // A shortcut taken by another app shouldn't stop Quick Pending from starting.
            for (_, keys) in panels::SHORTCUTS {
                if let Err(err) = app.global_shortcut().register(keys) {
                    eprintln!("failed to register {keys}: {err}");
                }
            }

            tray::create(app)?;
            if !std::env::args().any(|arg| arg == AUTOSTART_ARG) {
                tray::open_main(app.handle(), "active");
            }
            Ok(())
        })
        .on_window_event(|window, event| match (window.label(), event) {
            // Like Spotlight: clicking elsewhere closes a panel.
            (label, WindowEvent::Focused(false)) if panels::is_panel(label) => {
                if let Some(win) = window.app_handle().get_webview_window(label) {
                    panels::hide(&win);
                }
            }
            // Closing the main window only hides it; the app keeps running in the tray.
            ("main", WindowEvent::CloseRequested { api, .. }) => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            panels::submit_capture,
            panels::close_panel,
            commands::create_pending,
            commands::list_active,
            commands::list_completed,
            commands::complete_pending,
            commands::reopen_pending,
            commands::edit_pending,
            commands::delete_pending,
            commands::snooze_pending,
            settings::get_settings,
            settings::get_shortcuts,
            settings::set_launch_at_startup,
            settings::set_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Quick Pending");
}
