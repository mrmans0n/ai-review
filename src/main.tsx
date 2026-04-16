import { getCurrentWindow } from "@tauri-apps/api/window";
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

// Arm the reveal paths BEFORE touching React. The static import graph of this
// file is intentionally minimal (Tauri window API + CSS) so that a throw
// during React, ReactDOM, or App module initialization cannot prevent the
// safety timeout from being registered — otherwise the window would stay
// hidden forever, which is the exact failure this net is meant to catch.
requestAnimationFrame(() => requestAnimationFrame(show));
setTimeout(show, 2000);

// Dynamically import React + App so their module-init failures fall through
// to the safety net above instead of aborting this module's evaluation.
(async () => {
  try {
    const [{ StrictMode }, { createRoot }, { default: App }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./App"),
    ]);
    createRoot(document.getElementById("root") as HTMLElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (err) {
    // Any failure here is surfaced as an empty (but visible) window via the
    // reveal safety net above, plus an error in devtools. Better than a
    // silently-hidden window.
    console.error("ai-review: failed to mount React", err);
  }
})();
