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
      className="w-full h-[2px] bg-ctp-surface1/30 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-ctp-peach transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
