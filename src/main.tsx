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

// Reveal the Tauri window only after the first frame has been committed, so
// the user never sees an empty/white native frame. requestAnimationFrame fires
// after the browser has laid out and painted at least once.
//
// Safety:
// - try/catch guards against getCurrentWindow() throwing synchronously in
//   non-Tauri contexts (pnpm dev plain-browser preview has no
//   window.__TAURI_INTERNALS__ and the accessor throws, not rejects).
// - .catch swallows the async rejection path (already-shown window, IPC
//   transient failure).
// - The 2s setTimeout safety net guarantees the window appears even if first
//   paint never happens (e.g. a fatal render error prevents rAF work).
// - The revealed flag keeps .show() idempotent under HMR and across rAF +
//   setTimeout (Tauri path only; non-Tauri throws are deterministic and a
//   retry won't change the outcome).
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  try {
    getCurrentWindow()
      .show()
      .catch(() => {
        /* already-shown window or IPC transient */
      });
  } catch {
    /* non-Tauri runtime (e.g. pnpm dev browser preview) — no native window */
  }
};
requestAnimationFrame(reveal);
setTimeout(reveal, 2000);
