import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import CaptureInput from "./components/CaptureInput";
import { usePanelAnimation } from "./usePanelAnimation";

/** The floating Quick Capture bar, opened with the global shortcut. */
export default function CaptureWindow() {
  const ref = useRef<HTMLDivElement>(null);
  usePanelAnimation(ref);

  // submit_capture saves first and only closes the window if that succeeded.
  return (
    <div className="capture-window" ref={ref}>
      <CaptureInput
        onSubmit={(text) => invoke("submit_capture", { text })}
        onCancel={() => invoke("close_panel")}
      />
    </div>
  );
}
