import { useScrollProgress } from "../hooks/useScrollProgress";

export function ScrollProgressBar() {
  const { progress, isScrollable } = useScrollProgress();

  if (!isScrollable) return null;

  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <div
        className="scroll-progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
