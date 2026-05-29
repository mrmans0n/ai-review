export interface LineInfo {
  file: string;
  line: number;
  side: "old" | "new";
}

function elementFromNode(node: Node | null): HTMLElement | null {
  if (!node) return null;
  return node instanceof HTMLElement ? node : node.parentElement;
}

function parseChangeKeyLine(changeKey: string): number | null {
  const lineNum = Number.parseInt(changeKey.slice(1), 10);
  return Number.isNaN(lineNum) ? null : lineNum;
}

function lineFromRowClass(row: Element | null, side: "old" | "new"): number | null {
  if (!row) return null;
  const match = row.className.match(new RegExp(`(?:^|\\s)air-diff-${side}-line-(\\d+)(?:\\s|$)`));
  if (!match) return null;
  const lineNum = Number.parseInt(match[1], 10);
  return Number.isNaN(lineNum) ? null : lineNum;
}

function sideFromDiffCell(cell: HTMLTableCellElement, changeKey: string): "old" | "new" {
  const type = changeKey[0];
  if (type === "D") return "old";
  if (type === "I") return "new";

  const row = cell.parentElement;
  const table = cell.closest("table.diff-split");
  if (table && row) {
    const index = [...row.children].indexOf(cell);
    if (index === 0 || index === 1) return "old";
    if (index === 2 || index === 3) return "new";
  }

  return "new";
}

function closestDiffCell(el: HTMLElement | null): HTMLTableCellElement | null {
  while (el && el.tagName !== "TABLE") {
    if (el instanceof HTMLTableCellElement && el.getAttribute("data-change-key")) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function previousDiffLine(row: Element | null): Element | null {
  let current = row?.previousElementSibling ?? null;
  while (current) {
    if (current.classList.contains("diff-line")) return current;
    current = current.previousElementSibling;
  }
  return null;
}

function resolveWidgetSide(el: HTMLElement): "old" | "new" {
  if (el.closest(".split-widget-old")) return "old";
  if (el.closest(".split-widget-new")) return "new";

  const cell = el.closest("td.diff-widget-content");
  const row = cell?.parentElement;
  if (cell && row?.parentElement) {
    const cells = [...row.children];
    const index = cells.indexOf(cell);
    if (cells.length === 2 && index === 0) return "old";
    if (cells.length === 2 && index === 1) return "new";
  }

  return "new";
}

function resolveFromWidget(el: HTMLElement): LineInfo | null {
  const widgetRow = el.closest("tr.diff-widget");
  if (!widgetRow) return null;

  const side = resolveWidgetSide(el);
  const line = lineFromRowClass(previousDiffLine(widgetRow), side);
  if (line == null) return null;

  const fileEl = el.closest("[data-diff-file]");
  const file = fileEl?.getAttribute("data-diff-file") || "";
  return { file, line, side };
}

/**
 * Walks up the DOM from a node and returns line info, or null.
 * Handles two contexts:
 * - Diff view: cells and inline widgets inside [data-diff-file]
 * - FileViewer: <div data-line-number="42" data-line-side="new"> inside [data-file-viewer]
 */
export function resolveLineFromNode(node: Node | null): LineInfo | null {
  const start = elementFromNode(node);
  if (!start) return null;

  const widgetInfo = resolveFromWidget(start);
  if (widgetInfo) return widgetInfo;

  const cell = closestDiffCell(start);
  if (cell) {
    const changeKey = cell.getAttribute("data-change-key")!;
    const side = sideFromDiffCell(cell, changeKey);
    const line = lineFromRowClass(cell.parentElement, side) ?? parseChangeKeyLine(changeKey);
    if (line == null) return null;

    const fileEl = cell.closest("[data-diff-file]");
    const file = fileEl?.getAttribute("data-diff-file") || "";
    return { file, line, side };
  }

  let el: HTMLElement | null = start;
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
