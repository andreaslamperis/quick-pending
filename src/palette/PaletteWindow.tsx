import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as api from "../api";
import EmptyState from "../components/EmptyState";
import { snoozeOptions, type SnoozeOption } from "../snooze";
import { useErrorNote } from "../useErrorNote";
import { usePanelAnimation } from "../usePanelAnimation";
import { usePendings } from "../usePendings";
import PaletteFooter from "./PaletteFooter";
import PaletteRow, { RowInput } from "./PaletteRow";

export type Mode =
  | { kind: "list" }
  | { kind: "edit" }
  | { kind: "new" }
  | { kind: "confirm-delete" }
  | { kind: "snooze"; options: SnoozeOption[]; index: number };

const LIST: Mode = { kind: "list" };

/** The keyboard-first Pending List, opened with the global shortcut. */
export default function PaletteWindow() {
  const { pendings, loading, failed, reload } = usePendings("active");
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>(LIST);
  const { error, attempt } = useErrorNote();
  const ref = useRef<HTMLDivElement>(null);
  usePanelAnimation(ref);

  const last = pendings.length - 1;
  const current = Math.min(index, last);
  const selected = pendings[current];

  const close = () => invoke("close_panel");

  // Every time the panel opens, start fresh at the top.
  useEffect(() => {
    const reset = () => {
      setMode(LIST);
      setIndex(0);
    };
    window.addEventListener("focus", reset);
    return () => window.removeEventListener("focus", reset);
  }, []);

  useEffect(() => {
    document.querySelector(".palette-row--selected")?.scrollIntoView({ block: "nearest" });
  }, [current, pendings]);

  const complete = (id: string) => attempt(api.completePending(id), "Couldn't complete it. Try again.");

  const snoozeWith = (option: SnoozeOption) => {
    if (selected) attempt(api.snoozePending(selected.id, option.until.toISOString()), "Couldn't snooze it. Try again.");
    setMode(LIST);
  };

  // Keys for every mode except the text inputs, which handle their own.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Checked by target, not mode: an input's Enter/Escape switches the mode back to
      // "list" before the event bubbles up here.
      if (e.target instanceof HTMLInputElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let handled = true;

      if (mode.kind === "confirm-delete") {
        if ((key === "Enter" || key === "y" || key === "d") && selected) {
          attempt(api.deletePending(selected.id), "Couldn't delete it. Try again.");
          setMode(LIST);
        } else if (key === "Escape" || key === "n") setMode(LIST);
        else handled = false;
      } else if (mode.kind === "snooze") {
        const { options } = mode;
        const choice = Number(key) - 1;
        if (key === "ArrowDown") setMode({ ...mode, index: Math.min(mode.index + 1, options.length - 1) });
        else if (key === "ArrowUp") setMode({ ...mode, index: Math.max(mode.index - 1, 0) });
        else if (key === "Enter") snoozeWith(options[mode.index]);
        else if (options[choice]) snoozeWith(options[choice]);
        else if (key === "Escape") setMode(LIST);
        else handled = false;
      } else if (mode.kind === "list") {
        if (key === "ArrowDown") setIndex(Math.min(current + 1, last));
        else if (key === "ArrowUp") setIndex(Math.max(current - 1, 0));
        else if (key === "Escape") close();
        else if (key === "n") setMode({ kind: "new" });
        else if (!selected) handled = false;
        else if (key === "Enter") complete(selected.id);
        else if (key === "e") setMode({ kind: "edit" });
        else if (key === "d") setMode({ kind: "confirm-delete" });
        else if (key === "s") setMode({ kind: "snooze", options: snoozeOptions(), index: 0 });
        else handled = false;
      } else handled = false;

      // Also stops the shortcut letter from being typed into a newly opened input.
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // On failure the input stays open with the text, so nothing typed is lost.
  const saveEdit = async (text: string) => {
    if (selected && text !== selected.text) {
      if (!(await attempt(api.editPending(selected.id, text), "Couldn't save the edit. Try again."))) return;
    }
    setMode(LIST);
  };

  const create = async (text: string) => {
    if (!(await attempt(api.createPending(text), "Couldn't add it. Try again."))) return;
    setIndex(0); // newest first, so the new item lands on top
    setMode(LIST);
  };

  const showEmpty = !loading && pendings.length === 0 && mode.kind !== "new";

  return (
    <div className="palette" ref={ref}>
      <header className="palette-header">
        <span className="palette-title">Pendings</span>
        {!loading && <span className="header-count">{pendings.length}</span>}
      </header>

      <div className="palette-body">
        {showEmpty ? (
          failed ? (
            <p className="list-message">
              Couldn't load pendings.{" "}
              <button className="link-button" onClick={reload}>
                Retry
              </button>
            </p>
          ) : (
            <EmptyState>
              <p className="empty-hint">
                Or press <kbd>N</kbd> to add one here.
              </p>
            </EmptyState>
          )
        ) : (
          <ul className="palette-list" role="listbox" aria-label="Pendings">
            {mode.kind === "new" && (
              <li className="palette-row palette-row--selected">
                <span className="palette-marker">+</span>
                <RowInput initial="" placeholder="New pending…" onSave={create} onCancel={() => setMode(LIST)} />
              </li>
            )}
            {pendings.map((p, i) => (
              <PaletteRow
                key={p.id}
                pending={p}
                selected={i === current && mode.kind !== "new"}
                editing={i === current && mode.kind === "edit"}
                confirming={i === current && mode.kind === "confirm-delete"}
                onSelect={() => setIndex(i)}
                onComplete={() => complete(p.id)}
                onEdit={() => {
                  setIndex(i);
                  setMode({ kind: "edit" });
                }}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setMode(LIST)}
              />
            ))}
          </ul>
        )}
      </div>

      <PaletteFooter mode={mode} error={error} onSnooze={snoozeWith} />
    </div>
  );
}
