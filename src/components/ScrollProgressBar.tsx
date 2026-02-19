import { useScrollProgress } from "../hooks/useScrollProgress";

export function ScrollProgressBar() {
  const { progress, isScrollable } = useScrollProgress();

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
