import { useEffect, useState, type RefObject } from "react";

type ScrollProgressState = {
  progress: number;
  isScrollable: boolean;
};

function getScrollProgressFromElement(
  el: HTMLElement | null
): ScrollProgressState {
  if (!el) return { progress: 0, isScrollable: false };

  const maxScroll = el.scrollHeight - el.clientHeight;
  const isScrollable = el.scrollHeight > el.clientHeight;

  if (!isScrollable || maxScroll <= 0) {
    return { progress: 0, isScrollable: false };
  }

  const rawProgress = (el.scrollTop / maxScroll) * 100;
  const progress = Math.min(100, Math.max(0, rawProgress));

  return { progress, isScrollable: true };
}

export function useScrollProgress(
  containerRef?: RefObject<HTMLElement | null>
): ScrollProgressState {
  const [state, setState] = useState<ScrollProgressState>({
    progress: 0,
    isScrollable: false,
  });

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      setState(getScrollProgressFromElement(el));
    };

    const requestUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    };

    // Initial calculation
    requestUpdate();

    el.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    // Also observe content size changes (e.g., loading more files)
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(requestUpdate)
        : null;
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      resizeObserver?.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [containerRef]);

  return state;
}
