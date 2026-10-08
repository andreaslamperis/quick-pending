import { useEffect, useState } from "react";

/**
 * A short-lived error message for failed actions. `attempt` runs an operation and
 * reports whether it succeeded, showing `message` if it didn't.
 */
export function useErrorNote() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const attempt = async (op: Promise<unknown>, message: string): Promise<boolean> => {
    try {
      await op;
      return true;
    } catch (err) {
      console.error(err);
      setError(message);
      return false;
    }
  };

  return { error, attempt };
}
