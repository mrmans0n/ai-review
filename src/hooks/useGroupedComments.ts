import { useMemo } from "react";
import type { Comment } from "../types";

export interface CommentGroup {
  file: string;
  comments: Comment[];
}

function groupComments(comments: Comment[]): CommentGroup[] {
  const groups = new Map<string, Comment[]>();

  for (const comment of comments) {
    if (!groups.has(comment.file)) {
      groups.set(comment.file, []);
    }
    groups.get(comment.file)!.push(comment);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, fileComments]) => ({
      file,
      comments: [...fileComments].sort((a, b) => a.startLine - b.startLine),
    }));
}

export function useGroupedComments(comments: Comment[]): CommentGroup[] {
  return useMemo(() => groupComments(comments), [comments]);
}
