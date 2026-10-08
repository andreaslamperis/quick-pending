import { useEffect, useRef, useState } from "react";
import * as api from "../api";
import type { Settings as SettingsData, ShortcutAction, Theme } from "../types";
import { useErrorNote } from "../useErrorNote";
import { useShortcuts } from "../useShortcuts";
import ShortcutField from "./ShortcutField";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);
  const { shortcuts, reload: reloadShortcuts } = useShortcuts();
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const { error, attempt } = useErrorNote();

  // Leaving the Settings tab mid-recording must turn shortcuts back on.
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  useEffect(() => () => void (recordingRef.current && api.resumeShortcuts()), []);

  useEffect(() => {
    api.getSettings().then(setSettings, (err) => {
      console.error(err);
      setFailed(true);
    });
  }, []);

  if (failed) return <p className="list-message">Couldn't load settings.</p>;
  if (!settings) return null;

  const change = async (update: Partial<SettingsData>, op: Promise<unknown>, message: string) => {
    if (await attempt(op, message)) setSettings({ ...settings, ...update });
  };

  const toggleStartup = () => {
    const enabled = !settings.launchAtStartup;
    change({ launchAtStartup: enabled }, api.setLaunchAtStartup(enabled), "Couldn't change launch at startup.");
  };

  return (
    <section className="settings">
      <label className="setting">
        <span>Launch at startup</span>
        <input type="checkbox" checked={settings.launchAtStartup} onChange={toggleStartup} />
      </label>
      <div className="setting">
        <span>Theme</span>
        <div className="segmented">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              className={`segment${settings.theme === value ? " segment--active" : ""}`}
              aria-pressed={settings.theme === value}
              onClick={() => change({ theme: value }, api.setTheme(value), "Couldn't change the theme.")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <h2 className="settings-heading">Shortcuts</h2>
      {shortcuts.map((s) => (
        <ShortcutField
          key={s.action}
          info={s}
          recording={recording === s.action}
          onRecordingChange={(on) => setRecording(on ? s.action : null)}
          onChange={reloadShortcuts}
        />
      ))}
      <p className="settings-note">
        Shortcuts work from any app and need Ctrl, Alt or Win. Quick Pending keeps running in the tray: double-click
        its icon to open this window, right-click for the menu.
      </p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
