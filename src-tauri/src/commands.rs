//! Tauri commands exposing the pending store to the frontend.
//!
//! Every successful change emits `pendings-changed` so all open windows reload.
//! Commands that touch the database are `async` so they run off the main thread:
//! a slow or locked database must never freeze the windows, tray or shortcuts.

use tauri::{AppHandle, Emitter, State};

use crate::db::{self, Db, Pending, Result};

pub fn notify_changed<T>(app: &AppHandle, result: Result<T>) -> Result<T> {
    if result.is_ok() {
        let _ = app.emit("pendings-changed", ());
    }
    result
}

#[tauri::command(async)]
pub fn create_pending(app: AppHandle, db: State<Db>, text: String) -> Result<Pending> {
    notify_changed(&app, db::create(&db.lock().unwrap(), &text))
}

#[tauri::command(async)]
pub fn list_active(db: State<Db>) -> Result<Vec<Pending>> {
    db::list_active(&db.lock().unwrap())
}

#[tauri::command(async)]
pub fn list_completed(db: State<Db>) -> Result<Vec<Pending>> {
    db::list_completed(&db.lock().unwrap())
}

#[tauri::command(async)]
pub fn complete_pending(app: AppHandle, db: State<Db>, id: String) -> Result<()> {
    notify_changed(&app, db::complete(&db.lock().unwrap(), &id))
}

#[tauri::command(async)]
pub fn reopen_pending(app: AppHandle, db: State<Db>, id: String) -> Result<()> {
    notify_changed(&app, db::reopen(&db.lock().unwrap(), &id))
}

#[tauri::command(async)]
pub fn edit_pending(app: AppHandle, db: State<Db>, id: String, text: String) -> Result<()> {
    notify_changed(&app, db::edit(&db.lock().unwrap(), &id, &text))
}

#[tauri::command(async)]
pub fn delete_pending(app: AppHandle, db: State<Db>, id: String) -> Result<()> {
    notify_changed(&app, db::delete(&db.lock().unwrap(), &id))
}

#[tauri::command(async)]
pub fn snooze_pending(app: AppHandle, db: State<Db>, id: String, until: String) -> Result<()> {
    notify_changed(&app, db::snooze(&db.lock().unwrap(), &id, &until))
}
