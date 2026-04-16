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

// Safety fallback: if anything prevents React from mounting (async import
// failure, module-init throw inside the IIFE, or an unexpectedly slow load),
// show the window anyway after 2s so the user never stares at a hidden one.
// Armed before the async IIFE so a synchronous throw there doesn't defeat it.
// The dark native backgroundColor keeps the brief empty frame from flashing
// white. Normal success path (rAF-after-render, below) fires well before 2s
// and latches `shown`, turning this into a no-op.
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
    // Reveal only after React has committed and the browser has painted,
    // so the first visible frame already has the rendered UI. Double rAF:
    // first fires after layout, second after the browser has painted.
    requestAnimationFrame(() => requestAnimationFrame(show));
  } catch (err) {
    // If React can't mount, there's nothing to wait for — reveal immediately
    // so the user sees something instead of a hidden window until the 2s
    // fallback kicks in. Error is logged to devtools for diagnosis.
    console.error("ai-review: failed to mount React", err);
    show();
  }
})();
