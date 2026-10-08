export type PendingStatus = "pending" | "completed" | "snoozed";

export interface Pending {
  id: string;
  text: string;
  status: PendingStatus;
  createdAt: string;
  completedAt?: string;
  snoozedUntil?: string;
}

export type ListView = "active" | "completed";

/** Which tab the main window shows. */
export type View = ListView | "settings";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  launchAtStartup: boolean;
  theme: Theme;
}

export type ShortcutAction = "capture" | "main" | "palette";

export interface ShortcutInfo {
  action: ShortcutAction;
  name: string;
  /** e.g. "Ctrl+Alt+Z"; null when the action has no shortcut. */
  keys: string | null;
  defaultKeys: string | null;
  /** False when the keys are set but another app already owns them. */
  registered: boolean;
}
