import { useEffect, useState } from "react";
import * as api from "../api";
import { heldModifiers, shortcutFromEvent } from "../format";
import type { ShortcutInfo } from "../types";
import Keys from "./Keys";

interface Props {
  info: ShortcutInfo;
  /** Only one field records at a time; Settings decides which. */
  recording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onChange: () => void;
}

/** One global shortcut in Settings: shows it, and records a new one on "Change". */
export default function ShortcutField({ info, recording, onRecordingChange, onChange }: Props) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = async (keys: string | null) => {
    try {
      await api.setShortcut(info.action, keys);
      setError(null);
      onRecordingChange(false);
      onChange();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    }
  };

  const start = async () => {
    setError(null);
    setPreview("");
    await api.pauseShortcuts();
    onRecordingChange(true);
  };

  const cancel = () => {
    setError(null);
    onRecordingChange(false);
    api.resumeShortcuts();
  };

  // While recording, every key press in the window belongs to the recorder.
  useEffect(() => {
    if (!recording) return;

    const onKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.key === "Escape" && !heldModifiers(e)) return cancel();

      const keys = shortcutFromEvent(e);
      if (!keys) return setPreview(heldModifiers(e) + "+");
      setPreview(keys);
      // Saving turns shortcuts back on; keep them paused if the user must try again.
      if (!(await save(keys))) api.pauseShortcuts();
    };
    // Releasing a modifier updates a modifiers-only preview ("Ctrl+Alt+…" → "Ctrl+…").
    const onKeyUp = (e: KeyboardEvent) => {
      const held = heldModifiers(e);
      setPreview((p) => (p.endsWith("+") ? (held ? held + "+" : "") : p));
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    // Leaving the window ends recording, so shortcuts never stay off.
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", cancel);
    };
  }, [recording]);

  const isDefault = info.keys === info.defaultKeys;

  return (
    <div className="shortcut-field">
      <div className="setting">
        <span>{info.name}</span>
        <span className="setting-value">
          {recording ? (
            <span className="shortcut-recording">{preview ? preview.replace(/\+$/, "+…") : "Press a shortcut…"}</span>
          ) : info.keys ? (
            <>
              {!info.registered && <span className="setting-warning">In use by another app</span>}
              <Keys shortcut={info.keys} />
            </>
          ) : (
            <span className="shortcut-unset">Not set</span>
          )}
          {recording ? (
            <button className="link-button" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <>
              <button className="link-button" onClick={start}>
                {info.keys ? "Change" : "Set"}
              </button>
              {info.keys && (
                <button className="link-button link-button--muted" onClick={() => save(null)}>
                  Clear
                </button>
              )}
              {!isDefault && info.defaultKeys && (
                <button className="link-button link-button--muted" onClick={() => save(info.defaultKeys)}>
                  Reset
                </button>
              )}
            </>
          )}
        </span>
      </div>
      {error ? (
        <p className="setting-error" role="alert">
          {error}
        </p>
      ) : (
        // Windows hands a combination another app owns straight to that app, so the
        // recorder never sees it. Say so rather than look broken.
        recording && (
          <p className="setting-hint">
            Esc to cancel. If nothing shows up when you press keys, another app is already using that combination.
          </p>
        )
      )}
    </div>
  );
}
