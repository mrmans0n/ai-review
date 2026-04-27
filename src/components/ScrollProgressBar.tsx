import type { RefObject } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";

type ScrollProgressBarProps = {
  containerRef?: RefObject<HTMLElement | null>;
};

export function ScrollProgressBar({ containerRef }: ScrollProgressBarProps) {
  const { progress, isScrollable } = useScrollProgress(containerRef);

  if (!isScrollable) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-9 z-40 h-px bg-surface-hover/30"
      aria-hidden="true"
    >
      <div
        className="h-full bg-accent-review transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
