import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as api from "./api";
import type { ShortcutInfo } from "./types";

/** The global shortcuts, kept current when they change in Settings. */
export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutInfo[]>([]);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let current = true;
    api.getShortcuts().then((s) => current && setShortcuts(s), console.error);
    return () => {
      current = false;
    };
  }, [version]);

  useEffect(() => {
    const unlisten = listen("shortcuts-changed", reload);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return { shortcuts, reload };
}
