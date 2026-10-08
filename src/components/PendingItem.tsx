import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { fullDateTime, relativeTime } from "../format";
import type { Pending } from "../types";

export interface PendingActions {
  toggle: (pending: Pending) => void;
  /** Resolves false if saving failed; the editor then stays open with the text. */
  edit: (id: string, text: string) => Promise<boolean>;
  /** Omitted where snoozing doesn't apply (the completed list). */
  snooze?: (id: string) => void;
  remove: (id: string) => void;
}

interface Props {
  pending: Pending;
  actions: PendingActions;
}

export default function PendingItem({ pending, actions }: Props) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const wasEditing = useRef(false);
  const done = pending.status === "completed";
  const time = (done && pending.completedAt) || pending.createdAt;

  // After Enter/Escape ends an edit, keep keyboard focus on this row instead of
  // dropping it to the page (a click elsewhere has already moved focus on).
  useEffect(() => {
    if (wasEditing.current && !editing && document.activeElement === document.body) {
      textRef.current?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const save = async (input: HTMLInputElement) => {
    const text = input.value.trim();
    if (text && text !== pending.text && !(await actions.edit(pending.id, text))) return;
    setEditing(false);
  };

  const handleEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      // Restore the original so the blur that follows saves nothing.
      e.currentTarget.value = pending.text;
      e.currentTarget.blur();
    }
  };

  const handleTextKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      setEditing(true);
    }
  };

  return (
    <li className={`item${done ? " item--done" : ""}`}>
      <button
        className="item-check"
        onClick={() => actions.toggle(pending)}
        aria-label={done ? "Mark as pending" : "Mark as done"}
      />
      {editing ? (
        <input
          className="item-edit"
          defaultValue={pending.text}
          onBlur={(e) => save(e.currentTarget)}
          onKeyDown={handleEditKey}
          autoFocus
          spellCheck={false}
        />
      ) : (
        <span
          ref={textRef}
          className="item-text"
          tabIndex={0}
          onDoubleClick={() => setEditing(true)}
          onKeyDown={handleTextKey}
          title="Double-click or press Enter to edit"
        >
          {pending.text}
        </span>
      )}
      <span className="item-time" title={fullDateTime(time)}>
        {relativeTime(time)}
      </span>
      <span className="item-actions">
        {actions.snooze && (
          <button onClick={() => actions.snooze?.(pending.id)} title="Hide until tomorrow 09:00">
            snooze
          </button>
        )}
        <button onClick={() => actions.remove(pending.id)}>delete</button>
      </span>
    </li>
  );
}
