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
// Safety: .catch swallows the rejection in non-Tauri contexts (pnpm dev in a
// plain browser); a 2s setTimeout safety net guarantees the window appears
// even if first paint never happens (e.g. a fatal render error). The revealed
// flag keeps .show() idempotent under HMR and across rAF + setTimeout.
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  getCurrentWindow()
    .show()
    .catch(() => {
      /* non-Tauri preview or already-shown window */
    });
};
requestAnimationFrame(reveal);
setTimeout(reveal, 2000);
