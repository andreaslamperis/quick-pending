import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as api from "./api";
import type { ListView, Pending } from "./types";

interface PendingsState {
  pendings: Pending[];
  /** True until the first load finishes, so empty states don't flash. */
  loading: boolean;
  /** The last load failed; `pendings` holds the previous result. */
  failed: boolean;
}

/**
 * Loads a pending list and keeps it current: reloads whenever any window changes
 * data (Rust emits `pendings-changed`), when this window gains focus, and every
 * minute, which also refreshes relative times and brings back expired snoozes.
 */
export function usePendings(view: ListView) {
  const [state, setState] = useState<PendingsState>({ pendings: [], loading: true, failed: false });
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let current = true;
    const load = view === "active" ? api.listActive : api.listCompleted;
    load().then(
      (pendings) => current && setState({ pendings, loading: false, failed: false }),
      (err) => {
        console.error(err);
        if (current) setState((s) => ({ ...s, loading: false, failed: true }));
      },
    );
    return () => {
      current = false;
    };
  }, [view, version]);

  useEffect(() => {
    const unlisten = listen("pendings-changed", reload);
    window.addEventListener("focus", reload);
    const timer = setInterval(reload, 60_000);
    return () => {
      unlisten.then((fn) => fn());
      window.removeEventListener("focus", reload);
      clearInterval(timer);
    };
  }, []);

  return { ...state, reload };
}
