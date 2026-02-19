import { useScrollProgress } from "../hooks/useScrollProgress";

export function ScrollProgressBar() {
  const { progress, isScrollable } = useScrollProgress();

  if (!isScrollable) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-[3px] bg-gray-700/50 z-40 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full transition-[width] duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        }}
      />
    </div>
  );
}
