import type { Comment } from "../types";

export function isWholeFileComment(comment: { startLine: number; endLine: number }): boolean {
  return comment.startLine === 0 && comment.endLine === 0;
}

export function formatCommentRange(comment: Comment): string {
  if (isWholeFileComment(comment)) return "File";
  if (comment.startLine === comment.endLine) return `L${comment.startLine}`;
  return `L${comment.startLine}-${comment.endLine}`;
}
