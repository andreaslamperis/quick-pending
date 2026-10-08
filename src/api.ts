// Typed wrappers around the Rust commands (src-tauri/src/commands.rs, settings.rs).
import { invoke } from "@tauri-apps/api/core";
import type { Pending, Settings, ShortcutInfo, Theme } from "./types";

export const listActive = () => invoke<Pending[]>("list_active");
export const listCompleted = () => invoke<Pending[]>("list_completed");
export const createPending = (text: string) => invoke<Pending>("create_pending", { text });
export const completePending = (id: string) => invoke<void>("complete_pending", { id });
export const reopenPending = (id: string) => invoke<void>("reopen_pending", { id });
export const editPending = (id: string, text: string) => invoke<void>("edit_pending", { id, text });
export const deletePending = (id: string) => invoke<void>("delete_pending", { id });
/** `until` is an ISO 8601 timestamp. */
export const snoozePending = (id: string, until: string) =>
  invoke<void>("snooze_pending", { id, until });

export const getSettings = () => invoke<Settings>("get_settings");
export const getShortcuts = () => invoke<ShortcutInfo[]>("get_shortcuts");
export const setLaunchAtStartup = (enabled: boolean) =>
  invoke<void>("set_launch_at_startup", { enabled });
export const setTheme = (theme: Theme) => invoke<void>("set_theme", { theme });
