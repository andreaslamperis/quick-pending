import { useState, type KeyboardEvent } from "react";
import { fullDateTime, relativeTime } from "../format";
import type { Pending } from "../types";

interface Props {
  pending: Pending;
  selected: boolean;
  editing: boolean;
  confirming: boolean;
  onSelect: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onSaveEdit: (text: string) => Promise<unknown>;
  onCancelEdit: () => void;
}

export default function PaletteRow(props: Props) {
  const { pending, selected, editing, confirming } = props;
  const className = [
    "palette-row",
    selected && "palette-row--selected",
    confirming && "palette-row--confirm",
  ]
    .filter(Boolean)
    .join(" ");

  // Rows aren't focusable on purpose: Enter must only reach the palette's key handler.
  return (
    <li className={className} onClick={props.onSelect} onDoubleClick={props.onEdit} aria-selected={selected}>
      <span className="palette-marker">{selected ? "›" : ""}</span>
      {editing ? (
        <RowInput initial={pending.text} onSave={props.onSaveEdit} onCancel={props.onCancelEdit} />
      ) : (
        <span className="palette-text">{pending.text}</span>
      )}
      <span className="palette-time" title={fullDateTime(pending.createdAt)}>
        {relativeTime(pending.createdAt)}
      </span>
      <span
        className="palette-check"
        title="Complete"
        onClick={(e) => {
          e.stopPropagation();
          props.onComplete();
        }}
      />
    </li>
  );
}

interface RowInputProps {
  initial: string;
  placeholder?: string;
  /** If this rejects or the parent keeps the input open, the text stays for a retry. */
  onSave: (text: string) => Promise<unknown>;
  onCancel: () => void;
}

/** Inline text input: Enter saves, Escape cancels. */
export function RowInput({ initial, placeholder, onSave, onCancel }: RowInputProps) {
  const [busy, setBusy] = useState(false);

  const handleKey = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = e.currentTarget.value.trim();
      if (!text) return onCancel();
      if (busy) return;
      setBusy(true);
      await onSave(text).catch(console.error);
      setBusy(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      className="palette-input"
      defaultValue={initial}
      placeholder={placeholder}
      onKeyDown={handleKey}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      spellCheck={false}
    />
  );
}
