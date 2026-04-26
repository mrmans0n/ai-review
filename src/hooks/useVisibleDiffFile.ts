import { useEffect, useMemo, useState, type RefObject } from "react";

type UseVisibleDiffFileOptions = {
  containerRef: RefObject<HTMLElement | null>;
  filePaths: string[];
  enabled?: boolean;
  suppressRef?: RefObject<boolean>;
};

function getFilePathFromElement(element: Element): string | undefined {
  return element instanceof HTMLElement ? element.dataset.diffFile : undefined;
}

function pickVisibleFile(
  entries: Iterable<IntersectionObserverEntry>,
  root: HTMLElement
): string | undefined {
  const rootTop = root.getBoundingClientRect().top;
  const candidates = Array.from(entries)
    .filter((entry) => entry.isIntersecting && entry.boundingClientRect.bottom > rootTop)
    .map((entry) => ({
      entry,
      filePath: getFilePathFromElement(entry.target),
      topDistance: entry.boundingClientRect.top - rootTop,
    }))
    .filter((candidate): candidate is {
      entry: IntersectionObserverEntry;
      filePath: string;
      topDistance: number;
    } => Boolean(candidate.filePath));

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const aAtOrBelowTop = a.topDistance >= 0;
    const bAtOrBelowTop = b.topDistance >= 0;

    if (aAtOrBelowTop && !bAtOrBelowTop) return -1;
    if (!aAtOrBelowTop && bAtOrBelowTop) return 1;

    if (aAtOrBelowTop && bAtOrBelowTop) {
      return a.topDistance - b.topDistance;
    }

    return b.topDistance - a.topDistance;
  });

  return candidates[0].filePath;
}

export function useVisibleDiffFile({
  containerRef,
  filePaths,
  enabled = true,
  suppressRef,
}: UseVisibleDiffFileOptions): string | undefined {
  const [visibleFile, setVisibleFile] = useState<string | undefined>();
  const filePathKey = useMemo(() => filePaths.join("\0"), [filePaths]);

  useEffect(() => {
    if (!enabled) {
      setVisibleFile(undefined);
      return;
    }

    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const allowedPaths = new Set(filePaths);
    const observedElements = Array.from(root.querySelectorAll("[data-diff-file]"))
      .filter((element) => {
        const filePath = getFilePathFromElement(element);
        return filePath && allowedPaths.has(filePath);
      });

    if (observedElements.length === 0) {
      setVisibleFile(undefined);
      return;
    }

    const visibleEntries = new Map<Element, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleEntries.set(entry.target, entry);
          } else {
            visibleEntries.delete(entry.target);
          }
        }

        if (suppressRef?.current) return;

        const nextVisibleFile = pickVisibleFile(visibleEntries.values(), root);
        if (nextVisibleFile) {
          setVisibleFile(nextVisibleFile);
        }
      },
      {
        root,
        rootMargin: "-12px 0px -70% 0px",
        threshold: [0, 0.01],
      }
    );

    for (const element of observedElements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerRef, enabled, filePathKey, suppressRef]);

  return visibleFile;
}
