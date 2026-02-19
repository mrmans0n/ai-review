import { useEffect, useState } from "react";

type ScrollProgressState = {
  progress: number;
  isScrollable: boolean;
};

function getScrollProgressState(): ScrollProgressState {
  const { documentElement } = document;
  const maxScroll = documentElement.scrollHeight - window.innerHeight;
  const isScrollable = documentElement.scrollHeight > window.innerHeight;

  if (!isScrollable || maxScroll <= 0) {
    return { progress: 0, isScrollable: false };
  }

  const rawProgress = (window.scrollY / maxScroll) * 100;
  const progress = Math.min(100, Math.max(0, rawProgress));

  return { progress, isScrollable: true };
}

export function useScrollProgress(): ScrollProgressState {
  const [state, setState] = useState<ScrollProgressState>(() => {
    if (typeof window === "undefined") {
      return { progress: 0, isScrollable: false };
    }

    return getScrollProgressState();
  });

  useEffect(() => {
    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      setState(getScrollProgressState());
    };

    const requestUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return state;
}
