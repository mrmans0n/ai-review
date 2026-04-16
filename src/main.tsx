import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./index.css";

// Reveal the Tauri window only after first paint. The window starts hidden
// (see src-tauri/tauri.conf.json) to avoid a white flash before the webview
// has produced a frame.
let shown = false;
const show = () => {
  if (shown) return;
  try {
    getCurrentWindow()
      .show()
      .then(() => {
        shown = true;
      })
      .catch(() => {
        // Don't latch `shown` on failure — leave the 2s safety timeout as a
        // real retry path instead of a silent no-op.
      });
  } catch {
    // Non-Tauri context (e.g. `pnpm dev` in a browser) — getCurrentWindow()
    // throws without __TAURI_INTERNALS__. Retry is harmless.
  }
};

// Register reveal paths BEFORE mounting React. If module evaluation or the
// initial render throws synchronously, the safety timeout is already armed
// and the window can still be revealed — otherwise it would stay hidden
// forever, which is the exact failure this net is meant to catch.
requestAnimationFrame(() => requestAnimationFrame(show));
setTimeout(show, 2000);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
