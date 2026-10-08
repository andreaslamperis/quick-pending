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

export interface ShortcutInfo {
  panel: "capture" | "palette";
  keys: string;
  /** False when another app already owns the key combination. */
  registered: boolean;
}
