import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as api from "./api";
import CaptureInput from "./components/CaptureInput";
import Header from "./components/Header";
import PendingList from "./components/PendingList";
import type { PendingActions } from "./components/PendingItem";
import Settings from "./components/Settings";
import { tomorrowMorning } from "./snooze";
import { useErrorNote } from "./useErrorNote";
import { usePendings } from "./usePendings";
import type { View } from "./types";

export default function App() {
  const [view, setView] = useState<View>("active");
  // On the settings tab the (unused) active list stays loaded.
  const listView = view === "completed" ? "completed" : "active";
  const { pendings, loading, failed, reload } = usePendings(listView);
  const { error, attempt } = useErrorNote();

  // The tray menu opens this window on a specific tab.
  useEffect(() => {
    const unlisten = listen<View>("navigate", (e) => setView(e.payload));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Lists reload on their own: every change emits `pendings-changed`.
  const actions: PendingActions = {
    toggle: (p) =>
      p.status === "completed"
        ? attempt(api.reopenPending(p.id), "Couldn't reopen it. Try again.")
        : attempt(api.completePending(p.id), "Couldn't complete it. Try again."),
    edit: (id, text) => attempt(api.editPending(id, text), "Couldn't save the edit. Try again."),
    snooze:
      view === "active"
        ? (id) => attempt(api.snoozePending(id, tomorrowMorning().toISOString()), "Couldn't snooze it. Try again.")
        : undefined,
    remove: (id) => attempt(api.deletePending(id), "Couldn't delete it. Try again."),
  };

  const addPending = async (text: string) => {
    await api.createPending(text);
    setView("active");
  };

  const isSettings = view === "settings";

  return (
    <div className="app">
      <CaptureInput onSubmit={addPending} />
      <Header view={view} count={isSettings || loading ? undefined : pendings.length} onViewChange={setView} />
      {isSettings ? (
        <Settings />
      ) : (
        <PendingList
          view={listView}
          pendings={pendings}
          loading={loading}
          failed={failed}
          onRetry={reload}
          actions={actions}
        />
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
