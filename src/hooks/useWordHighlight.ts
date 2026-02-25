import { useEffect, useState } from "react";
import { clearMarks, markText } from "../utils/textMarker";

const CODE_SELECTOR = ".diff-code-cell, .diff-code";
const WORD_HIGHLIGHT_CLASS = "word-highlight";

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

const isSingleWord = (value: string): boolean => value.length > 1 && !/\s/.test(value);

export function useWordHighlight(searchIsActive: boolean) {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  useEffect(() => {
    const containers = document.querySelectorAll<HTMLElement>(CODE_SELECTOR);
    containers.forEach((container) => clearMarks(container, WORD_HIGHLIGHT_CLASS));

    if (searchIsActive || !highlightedWord) {
      return;
    }

    const visibleContainers = Array.from(containers).filter(isVisible);
    visibleContainers.forEach((container) => {
      markText(container, highlightedWord, WORD_HIGHLIGHT_CLASS, {
        caseSensitive: true,
        wholeWord: true,
      });
    });
  }, [highlightedWord, searchIsActive]);

  useEffect(() => {
    if (searchIsActive && highlightedWord) {
      setHighlightedWord(null);
    }
  }, [searchIsActive, highlightedWord]);

  useEffect(() => {
    const handleDoubleClick = (event: MouseEvent) => {
      if (searchIsActive) return;

      const target = event.target as HTMLElement | null;
      if (!target?.closest(CODE_SELECTOR)) return;

      const selected = window.getSelection()?.toString()?.trim() || "";
      if (isSingleWord(selected)) {
        setHighlightedWord(selected);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.detail !== 1) return;
      setHighlightedWord(null);
    };

    document.addEventListener("dblclick", handleDoubleClick);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("dblclick", handleDoubleClick);
      document.removeEventListener("click", handleClick);
    };
  }, [searchIsActive]);

  return {
    highlightedWord,
    setHighlightedWord,
  };
}
