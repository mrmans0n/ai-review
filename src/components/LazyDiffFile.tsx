import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type LazyDiffFileProps = {
  estimatedHeight: number;
  forceMount?: boolean;
  onMount?: () => void;
  mountKey?: string | number;
  rootMargin?: string;
  children: ReactNode;
};

export function LazyDiffFile({
  estimatedHeight,
  forceMount = false,
  onMount,
  mountKey = 0,
  rootMargin = "150% 0px",
  children,
}: LazyDiffFileProps) {
  const supportsIO = typeof IntersectionObserver !== "undefined";
  const [observed, setObserved] = useState(false);
  const mounted = observed || forceMount || !supportsIO;
  const ref = useRef<HTMLDivElement>(null);
  const onMountRef = useRef(onMount);
  const lastNotifiedMountKeyRef = useRef<string | number | null>(null);

  useEffect(() => {
    onMountRef.current = onMount;
  }, [onMount]);

  useEffect(() => {
    if (forceMount) setObserved(true);
  }, [forceMount]);

  useEffect(() => {
    if (!mounted || lastNotifiedMountKeyRef.current === mountKey) return;
    lastNotifiedMountKeyRef.current = mountKey;
    onMountRef.current?.();
  }, [mounted, mountKey]);

  useEffect(() => {
    if (mounted) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setObserved(true);
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
