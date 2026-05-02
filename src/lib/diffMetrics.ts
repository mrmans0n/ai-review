export const DIFF_LINE_HEIGHT = 20;
export const DIFF_FILE_HEADER_HEIGHT = 40;
export const DIFF_HUNK_SEPARATOR_HEIGHT = 32;

type HunkLike = { changes?: unknown[] };
type FileLike = { hunks?: HunkLike[] | null } | null | undefined;

export function estimateFileHeight(file: FileLike): number {
  const hunks = file?.hunks;
  if (!hunks || hunks.length === 0) return 0;

  let lineCount = 0;
  for (const hunk of hunks) {
    lineCount += hunk.changes?.length ?? 0;
  }

  const separators = Math.max(0, hunks.length - 1);

  return lineCount * DIFF_LINE_HEIGHT + separators * DIFF_HUNK_SEPARATOR_HEIGHT;
}
