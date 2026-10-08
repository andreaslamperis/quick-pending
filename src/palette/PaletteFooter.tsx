import { shortDateTime } from "../format";
import type { SnoozeOption } from "../snooze";
import type { Mode } from "./PaletteWindow";

interface Props {
  mode: Mode;
  /** A failed action, shown in place of the warning slot. */
  error: string | null;
  onSnooze: (option: SnoozeOption) => void;
}

const HINTS: Record<Mode["kind"], [string, string][]> = {
  list: [
    ["↑↓", "navigate"],
    ["↵", "complete"],
    ["E", "edit"],
    ["S", "snooze"],
    ["D", "delete"],
    ["N", "new"],
    ["Esc", "close"],
  ],
  edit: [
    ["↵", "save"],
    ["Esc", "cancel"],
  ],
  new: [
    ["↵", "add"],
    ["Esc", "cancel"],
  ],
  "confirm-delete": [
    ["↵", "delete"],
    ["Esc", "cancel"],
  ],
  snooze: [
    ["↑↓", "choose"],
    ["↵", "snooze"],
    ["Esc", "cancel"],
  ],
};

export default function PaletteFooter({ mode, error, onSnooze }: Props) {
  return (
    <footer className="palette-footer">
      {mode.kind === "snooze" && (
        <ul className="snooze-menu">
          {mode.options.map((option, i) => (
            <li
              key={option.label}
              className={`snooze-option${i === mode.index ? " snooze-option--selected" : ""}`}
              onClick={() => onSnooze(option)}
            >
              <kbd>{i + 1}</kbd>
              <span className="snooze-label">{option.label}</span>
              <span className="snooze-time">{shortDateTime(option.until)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="palette-hints">
        {error ? (
          <span className="palette-warning" role="alert">
            {error}
          </span>
        ) : (
          mode.kind === "confirm-delete" && <span className="palette-warning">Delete this pending?</span>
        )}
        {HINTS[mode.kind].map(([key, label]) => (
          <span key={key} className="palette-hint">
            <kbd>{key}</kbd> {label}
          </span>
        ))}
      </div>
    </footer>
  );
}
