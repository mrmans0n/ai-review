import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

type LazyDiffFileProps = {
  estimatedHeight: number;
  forceMount?: boolean;
  rootMargin?: string;
  children: ReactNode;
};

export function LazyDiffFile({
  estimatedHeight,
  forceMount = false,
  rootMargin = "150% 0px",
  children,
}: LazyDiffFileProps) {
  const supportsIO = typeof IntersectionObserver !== "undefined";
  const [observed, setObserved] = useState(false);
  const mounted = observed || forceMount || !supportsIO;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceMount) setObserved(true);
  }, [forceMount]);

  useEffect(() => {
    if (mounted) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          flushSync(() => setObserved(true));
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  const style: CSSProperties = {
    contentVisibility: "auto",
    containIntrinsicSize: `auto ${estimatedHeight}px`,
  };

  return (
    <div ref={ref} style={style} data-lazy-diff-state={mounted ? "mounted" : "pending"}>
      {mounted ? children : null}
    </div>
  );
}
