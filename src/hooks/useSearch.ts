import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearMarks, markText } from "../utils/textMarker";

const SEARCH_CELL_SELECTOR = ".diff-code, .diff-code-cell";
const SEARCH_CLASS = "search-match";
const SEARCH_CURRENT_CLASS = "search-match-current";
const RE_MARK_DEBOUNCE_MS = 100;

const isVisible = (element: HTMLElement): boolean => {
  if (element.hidden) return false;

  let node: HTMLElement | null = element;
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    node = node.parentElement;
  }

  return true;
};

export function useSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const debounceTimeoutRef = useRef<number | null>(null);

  const clearAllMarks = useCallback(() => {
    document.querySelectorAll<HTMLElement>(SEARCH_CELL_SELECTOR).forEach((container) => {
      clearMarks(container, SEARCH_CURRENT_CLASS);
      clearMarks(container, SEARCH_CLASS);
    });
  }, []);

  const updateCurrentMatch = useCallback((index: number, nextMatches: HTMLElement[]) => {
    nextMatches.forEach((match) => match.classList.remove(SEARCH_CURRENT_CLASS));

    if (!nextMatches.length || index < 0) return;

    const current = nextMatches[index];
    current.classList.add(SEARCH_CURRENT_CLASS);
    current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const applyMarks = useCallback((preferredIndex: number) => {
    clearAllMarks();

    if (!isOpen || !query.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const nextMatches: HTMLElement[] = [];
    const containers = Array.from(document.querySelectorAll<HTMLElement>(SEARCH_CELL_SELECTOR))
      .filter(isVisible);

    containers.forEach((container) => {
      nextMatches.push(...markText(container, query, SEARCH_CLASS));
    });

    setMatches(nextMatches);

    if (nextMatches.length > 0) {
      const clampedIndex = Math.min(
        Math.max(preferredIndex, 0),
        nextMatches.length - 1,
      );
      setCurrentMatchIndex(clampedIndex);
      updateCurrentMatch(clampedIndex, nextMatches);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [clearAllMarks, isOpen, query, updateCurrentMatch]);

  useEffect(() => {
    applyMarks(0);
  }, [applyMarks]);

  useEffect(() => {
    const diffContainer = document.querySelector<HTMLElement>(".diff-view");
    if (!diffContainer || !isOpen || !query.trim()) return;

    const observer = new MutationObserver(() => {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = window.setTimeout(() => {
        observer.disconnect();
        applyMarks(currentMatchIndex < 0 ? 0 : currentMatchIndex);
        observer.observe(diffContainer, { childList: true, subtree: true });
      }, RE_MARK_DEBOUNCE_MS);
    });

    observer.observe(diffContainer, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [isOpen, query, currentMatchIndex, applyMarks]);

  const next = useCallback(() => {
    if (matches.length === 0) return;

    const nextIndex = currentMatchIndex < 0
      ? 0
      : (currentMatchIndex + 1) % matches.length;

    setCurrentMatchIndex(nextIndex);
    updateCurrentMatch(nextIndex, matches);
  }, [matches, currentMatchIndex, updateCurrentMatch]);

  const prev = useCallback(() => {
    if (matches.length === 0) return;

    const prevIndex = currentMatchIndex < 0
      ? matches.length - 1
      : (currentMatchIndex - 1 + matches.length) % matches.length;

    setCurrentMatchIndex(prevIndex);
    updateCurrentMatch(prevIndex, matches);
  }, [matches, currentMatchIndex, updateCurrentMatch]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setMatches([]);
    setCurrentMatchIndex(-1);
    clearAllMarks();
  }, [clearAllMarks]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        open();
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open, close]);

  useEffect(() => {
    return () => {
      clearAllMarks();
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [clearAllMarks]);

  return useMemo(() => ({
    query,
    setQuery,
    isOpen,
    open,
    close,
    matches,
    currentMatchIndex,
    next,
    prev,
  }), [query, isOpen, open, close, matches, currentMatchIndex, next, prev]);
}
