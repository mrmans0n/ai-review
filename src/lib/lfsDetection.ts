import type { Comment } from "../types";

const LFS_POINTER_SIGNATURE = "version https://git-lfs.github.com/spec/v1";

interface Change {
  content: string;
  [key: string]: unknown;
}

interface Hunk {
  changes: Change[];
  [key: string]: unknown;
}

export function isLfsPointerDiff(hunks: Hunk[]): boolean {
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      if (change.content.includes(LFS_POINTER_SIGNATURE)) {
        return true;
      }
    }
  }
  return false;
}

export function isWholeFileComment(comment: Comment): boolean {
  return comment.startLine === 0 && comment.endLine === 0;
}
