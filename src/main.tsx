import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import CaptureWindow from "./CaptureWindow";
import PaletteWindow from "./palette/PaletteWindow";
import "./styles.css";

// Every window loads this bundle; the window label decides what to render.
const windows = { capture: CaptureWindow, palette: PaletteWindow };
const label = getCurrentWindow().label as keyof typeof windows;
const Root = windows[label] ?? App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
