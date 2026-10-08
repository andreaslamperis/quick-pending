import { useEffect, useState } from "react";
import * as api from "./api";
import type { ShortcutInfo } from "./types";

// Shortcuts are fixed for the app's lifetime, so each window fetches them once.
let cached: Promise<ShortcutInfo[]> | null = null;

export function useShortcuts(): ShortcutInfo[] {
  const [shortcuts, setShortcuts] = useState<ShortcutInfo[]>([]);
  useEffect(() => {
    cached ??= api.getShortcuts();
    cached.then(setShortcuts, (err) => {
      console.error(err);
      cached = null;
    });
  }, []);
  return shortcuts;
}
