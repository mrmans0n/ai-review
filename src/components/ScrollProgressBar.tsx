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
      className="w-full h-[2px] bg-gray-700/30 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full transition-[width] duration-100 ease-out opacity-60"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        }}
      />
    </div>
  );
}
