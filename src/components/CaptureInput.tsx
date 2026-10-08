import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface Props {
  /** Rejects if saving failed; the text is then kept for a retry. */
  onSubmit: (text: string) => Promise<unknown>;
  onCancel?: () => void;
}

export default function CaptureInput({ onSubmit, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Take focus whenever the window is focused, unless something else in it already
  // has focus (e.g. an item being edited in the main window). A leftover draft is
  // selected so typing replaces it, except unsaved text after a failed save.
  useEffect(() => {
    const focusInput = () => {
      const input = inputRef.current;
      const active = document.activeElement;
      if (!input || (active !== document.body && active !== input)) return;
      input.focus();
      if (failed) input.setSelectionRange(input.value.length, input.value.length);
      else input.select();
    };
    window.addEventListener("focus", focusInput);
    return () => window.removeEventListener("focus", focusInput);
  }, [failed]);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    // Also matches Cmd/Ctrl+Enter.
    if (e.key === "Enter") {
      e.preventDefault();
      const text = value.trim();
      if (!text || saving) return;
      setSaving(true);
      try {
        await onSubmit(text);
        setValue("");
        setFailed(false);
      } catch (err) {
        // Keep the text so nothing captured is lost; Enter retries.
        console.error(err);
        setFailed(true);
      } finally {
        setSaving(false);
      }
    } else if (e.key === "Escape") {
      setValue("");
      setFailed(false);
      onCancel?.();
    }
  };

  return (
    <div className={`capture${failed ? " capture--failed" : ""}`}>
      <span className="capture-prompt">›</span>
      <input
        ref={inputRef}
        className="capture-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What do you need to remember?"
        aria-invalid={failed}
        autoFocus
        spellCheck={false}
      />
      {saving ? (
        <span className="capture-status">Saving…</span>
      ) : failed ? (
        <span className="capture-error" role="alert">
          Couldn't save · <kbd>↵</kbd> retry
        </span>
      ) : (
        <kbd className="capture-hint">↵</kbd>
      )}
    </div>
  );
}
