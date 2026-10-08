import { shortcutKeys } from "../format";

/** A shortcut such as "CommandOrControl+Shift+Space", drawn as key caps. */
export default function Keys({ shortcut }: { shortcut: string }) {
  return (
    <span className="keys">
      {shortcutKeys(shortcut).map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </span>
  );
}
