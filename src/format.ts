const LOCALE = "en-GB";
const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "just now", "2 min ago", "Today 11:42", "Yesterday", "Mon", "3 Oct", "3 Oct 2025" */
export function relativeTime(timestamp: string, now = new Date()): string {
  const date = new Date(timestamp);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  // Rounded, so a daylight-saving day still counts as one day.
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return `Today ${date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString(LOCALE, { weekday: "short" });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}

/** Full date and time, for tooltips. */
export function fullDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString(LOCALE, { dateStyle: "medium", timeStyle: "short" });
}

/** "Fri 09:00" */
export function shortDateTime(date: Date): string {
  return date.toLocaleString(LOCALE, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

const isMac = navigator.userAgent.includes("Mac");

/** "CommandOrControl+Shift+Space" → ["Ctrl", "Shift", "Space"] */
export function shortcutKeys(shortcut: string): string[] {
  return shortcut.replace("CommandOrControl", isMac ? "Cmd" : "Ctrl").split("+");
}
