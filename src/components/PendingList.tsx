import EmptyState from "./EmptyState";
import PendingItem, { type PendingActions } from "./PendingItem";
import type { ListView, Pending } from "../types";

interface Props {
  view: ListView;
  pendings: Pending[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  actions: PendingActions;
}

export default function PendingList({ view, pendings, loading, failed, onRetry, actions }: Props) {
  // Local loads take milliseconds; render nothing rather than flash an empty state.
  if (loading) return null;

  if (failed && pendings.length === 0) {
    return (
      <p className="list-message">
        Couldn't load pendings.{" "}
        <button className="link-button" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }

  if (pendings.length === 0) {
    return view === "active" ? <EmptyState /> : <p className="list-message">Nothing completed yet.</p>;
  }

  return (
    <ul className="list">
      {pendings.map((p) => (
        <PendingItem key={p.id} pending={p} actions={actions} />
      ))}
    </ul>
  );
}
