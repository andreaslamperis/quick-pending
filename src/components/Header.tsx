import type { View } from "../types";

interface Props {
  view: View;
  /** Omitted on views without a list. */
  count?: number;
  onViewChange: (view: View) => void;
}

const tabs: { view: View; label: string }[] = [
  { view: "active", label: "Pendings" },
  { view: "completed", label: "History" },
  { view: "settings", label: "Settings" },
];

export default function Header({ view, count, onViewChange }: Props) {
  return (
    <header className="header">
      <nav className="header-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            className={`header-tab${tab.view === view ? " header-tab--active" : ""}`}
            onClick={() => onViewChange(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {count !== undefined && <span className="header-count">{count}</span>}
    </header>
  );
}
