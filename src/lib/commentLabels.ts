import type { Comment } from "../types";

export function isFileLevelComment(comment: Comment): boolean {
  return comment.startLine === 0 && comment.endLine === 0;
}

export function formatCommentRange(comment: Comment): string {
  if (isFileLevelComment(comment)) return "File";

  return comment.startLine === comment.endLine
    ? `L${comment.startLine}`
    : `L${comment.startLine}-${comment.endLine}`;
}

export function formatPromptCommentLocation(comment: Comment): string {
  const deleted = comment.side === "old" ? " (deleted)" : "";

  if (isFileLevelComment(comment)) {
    return `${comment.file}:file${deleted}`;
  }

  const lineRef = comment.startLine === comment.endLine
    ? `${comment.startLine}`
    : `${comment.startLine}-${comment.endLine}`;

  return `${comment.file}:${lineRef}${deleted}`;
}
