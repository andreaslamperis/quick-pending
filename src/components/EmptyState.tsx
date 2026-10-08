import type { ReactNode } from "react";
import { useShortcuts } from "../useShortcuts";
import Keys from "./Keys";

/** Shown when there is nothing pending. `children` adds a window-specific hint. */
export default function EmptyState({ children }: { children?: ReactNode }) {
  const capture = useShortcuts().shortcuts.find((s) => s.action === "capture");

  return (
    <div className="empty-state">
      <p className="empty-title">You're clear 🎉</p>
      <p>No pending items.</p>
      {capture?.keys && (
        <p className="empty-hint">
          Press <Keys shortcut={capture.keys} /> to capture something.
        </p>
      )}
      {children}
    </div>
  );
}
