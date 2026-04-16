import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Reveal the Tauri window only after first paint. The window starts hidden
// (see src-tauri/tauri.conf.json) to avoid a white flash before the webview
// has produced a frame.
let shown = false;
const show = () => {
  if (shown) return;
  shown = true;
  try {
    getCurrentWindow()
      .show()
      .catch(() => {
        // Non-Tauri context (e.g. `pnpm dev` in a browser) — no window to show.
      });
  } catch {
    // Non-Tauri context — getCurrentWindow() may throw without __TAURI_INTERNALS__.
  }
};

// Double rAF: first fires after layout, second after the browser has painted.
requestAnimationFrame(() => requestAnimationFrame(show));

// Safety timeout — if bootstrapping throws before rAF callbacks fire, never
// leave the user staring at an invisible window. Idempotent with the rAF path.
setTimeout(show, 2000);
