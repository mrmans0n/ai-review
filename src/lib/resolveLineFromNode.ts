export interface LineInfo {
  file: string;
  line: number;
  side: "old" | "new";
}

/**
 * Walks up the DOM from a node and returns line info, or null.
 * Handles two contexts:
 * - Diff view: <td data-change-key="N42"> inside [data-diff-file]
 * - FileViewer: <div data-line-number="42" data-line-side="new"> inside [data-file-viewer]
 */
export function resolveLineFromNode(node: Node | null): LineInfo | null {
  if (!node) return null;

  let el = node instanceof HTMLElement ? node : node.parentElement;

  // Path 1: Diff view — walk up to find td[data-change-key]
  while (el && el.tagName !== "TABLE") {
    if (el.tagName === "TD" && el.getAttribute("data-change-key")) {
      const changeKey = el.getAttribute("data-change-key")!;
      const lineNum = Number.parseInt(changeKey.slice(1), 10);
      if (Number.isNaN(lineNum)) return null;

      const type = changeKey[0]; // N=normal, I=insert, D=delete
      const side: "old" | "new" = type === "D" ? "old" : "new";
      const fileEl = el.closest("[data-diff-file]");
      const file = fileEl?.getAttribute("data-diff-file") || "";

      return { file, line: lineNum, side };
    }
    el = el.parentElement;
  }

  // Path 2: FileViewer — walk up to find [data-line-number]
  el = node instanceof HTMLElement ? node : node.parentElement;
  while (el) {
    if (el.getAttribute("data-line-number")) {
      const lineNum = Number.parseInt(el.getAttribute("data-line-number")!, 10);
      if (Number.isNaN(lineNum)) return null;

      const side = (el.getAttribute("data-line-side") as "old" | "new") || "new";
      const fileEl = el.closest("[data-file-viewer]");
      const file = fileEl?.getAttribute("data-file-viewer") || "";

      return { file, line: lineNum, side };
    }
    el = el.parentElement;
  }

  return null;
}
