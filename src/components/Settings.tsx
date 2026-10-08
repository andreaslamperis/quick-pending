import { useEffect, useState } from "react";
import * as api from "../api";
import type { Settings as SettingsData, ShortcutInfo, Theme } from "../types";
import { useErrorNote } from "../useErrorNote";
import { useShortcuts } from "../useShortcuts";
import Keys from "./Keys";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const SHORTCUT_NAMES: Record<ShortcutInfo["panel"], string> = {
  capture: "Quick Capture",
  palette: "Pending List",
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);
  const shortcuts = useShortcuts();
  const { error, attempt } = useErrorNote();

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
      {shortcuts.map((s) => (
        <div key={s.panel} className="setting">
          <span>{SHORTCUT_NAMES[s.panel]}</span>
          <span className="setting-value">
            {!s.registered && <span className="setting-warning">In use by another app</span>}
            <Keys shortcut={s.keys} />
          </span>
        </div>
      ))}
      <p className="settings-note">Quick Pending keeps running in the tray. Quit it from the tray menu.</p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
