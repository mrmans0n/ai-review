import { resolveLineFromNode } from "./resolveLineFromNode";

export type CommentTarget = {
  file: string;
  startLine: number;
  endLine: number;
  side: "old" | "new";
};

export function escapeAttributeSelector(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

export function collectSelectedLines(
  range: Range,
  file: string,
  side: "old" | "new",
): number[] {
  const fileEl = document.querySelector(
    `[data-diff-file="${escapeAttributeSelector(file)}"]`,
  );
  if (!fileEl) return [];

  const lines = new Set<number>();
  const nodes = fileEl.querySelectorAll(
    "td.diff-code[data-change-key], tr.diff-widget",
  );
  for (const node of nodes) {
    try {
      if (!range.intersectsNode(node)) continue;
    } catch {
      continue;
    }

    const info = resolveLineFromNode(node);
    if (info && info.file === file && info.side === side) {
      lines.add(info.line);
    }
  }

  return [...lines].sort((a, b) => a - b);
}

export function getSelectionCommentTarget(
  selection: Selection,
): CommentTarget | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const startInfo = resolveLineFromNode(range.startContainer);
  const endInfo = resolveLineFromNode(range.endContainer);
  const anchorInfo = resolveLineFromNode(selection.anchorNode) ?? startInfo;
  const focusInfo = resolveLineFromNode(selection.focusNode) ?? endInfo;

  if (!anchorInfo && !startInfo) return null;

  const target = anchorInfo ?? startInfo!;

  // Happy path: both endpoints on same file + same side
  if (
    startInfo &&
    endInfo &&
    startInfo.file === endInfo.file &&
    startInfo.side === endInfo.side
  ) {
    return {
      file: startInfo.file,
      startLine: Math.min(startInfo.line, endInfo.line),
      endLine: Math.max(startInfo.line, endInfo.line),
      side: startInfo.side,
    };
  }

  // Cross-side or partial: collect only lines on anchor's side
  const selectedLines = collectSelectedLines(range, target.file, target.side);
  if (selectedLines.length > 0) {
    return {
      file: target.file,
      startLine: selectedLines[0],
      endLine: selectedLines[selectedLines.length - 1],
      side: target.side,
    };
  }

  // Last resort: find any endpoint on anchor's side
  const sameFileEndpoint = [startInfo, endInfo, focusInfo].find(
    (info) => info && info.file === target.file && info.side === target.side,
  );
  if (sameFileEndpoint) {
    return {
      file: target.file,
      startLine: Math.min(target.line, sameFileEndpoint.line),
      endLine: Math.max(target.line, sameFileEndpoint.line),
      side: target.side,
    };
  }

  // Single-line fallback
  return {
    file: target.file,
    startLine: target.line,
    endLine: target.line,
    side: target.side,
  };
}
