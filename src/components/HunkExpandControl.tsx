const EXPAND_LINES = 15;

interface HunkExpandControlProps {
  /** Previous hunk (null if this is the top-of-file gap) */
  previousHunk: any | null;
  /** Next hunk (null if this is the bottom-of-file gap) */
  nextHunk: any | null;
  /** Total lines in the file (needed for bottom-of-file) */
  totalLines: number;
  /** Called with (start, end) line numbers to expand */
  onExpand: (start: number, end: number) => void;
}

export function HunkExpandControl({
  previousHunk,
  nextHunk,
  totalLines,
  onExpand,
}: HunkExpandControlProps) {
  // Calculate the gap boundaries
  let gapStart: number;
  let gapEnd: number;

  if (!previousHunk && nextHunk) {
    // Top of file — gap from line 1 to the start of the first hunk
    gapStart = 1;
    gapEnd = nextHunk.oldStart - 1;
  } else if (previousHunk && !nextHunk) {
    // Bottom of file — gap from end of last hunk to end of file
    gapStart = previousHunk.oldStart + previousHunk.oldLines;
    gapEnd = totalLines;
  } else if (previousHunk && nextHunk) {
    // Between hunks
    gapStart = previousHunk.oldStart + previousHunk.oldLines;
    gapEnd = nextHunk.oldStart - 1;
  } else {
    return null;
  }

  const collapsedCount = gapEnd - gapStart + 1;

  if (collapsedCount <= 0) {
    return null;
  }

  const showSplit = collapsedCount > EXPAND_LINES;

  const handleExpandUp = () => {
    // Expand EXPAND_LINES from the top of the gap (closer to previousHunk)
    const start = gapStart;
    const end = Math.min(gapStart + EXPAND_LINES - 1, gapEnd);
    onExpand(start, end);
  };

  const handleExpandDown = () => {
    // Expand EXPAND_LINES from the bottom of the gap (closer to nextHunk)
    const start = Math.max(gapEnd - EXPAND_LINES + 1, gapStart);
    const end = gapEnd;
    onExpand(start, end);
  };

  const handleExpandAll = () => {
    onExpand(gapStart, gapEnd);
  };

  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 py-1 px-4">
      {showSplit ? (
        <>
          {previousHunk && (
            <button
              onClick={handleExpandDown}
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
              title={`Show ${EXPAND_LINES} lines below`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 8 1ZM3.47 9.22a.75.75 0 0 1 1.06 0L8 12.69l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              Expand {EXPAND_LINES} lines
            </button>
          )}
          {nextHunk && (
            <button
              onClick={handleExpandUp}
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
              title={`Show ${EXPAND_LINES} lines above`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M12.53 6.78a.75.75 0 0 1-1.06 0L8 3.31 4.53 6.78a.75.75 0 0 1-1.06-1.06l4-4a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06ZM8 15a.75.75 0 0 1-.75-.75v-6.5a.75.75 0 0 1 1.5 0v6.5A.75.75 0 0 1 8 15Z" clipRule="evenodd" />
              </svg>
              Expand {EXPAND_LINES} lines
            </button>
          )}
          <button
            onClick={handleExpandAll}
            className="hover:text-blue-400 transition-colors flex items-center gap-1"
            title={`Show all ${collapsedCount} lines`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 0 1 0 1.06L8 9.06 3.47 4.53a.75.75 0 0 1 1.06-1.06L8 6.94l3.47-3.47a.75.75 0 0 1 1.06 0ZM12.53 9.47a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94l3.47-3.47a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Expand all ({collapsedCount} lines)
          </button>
        </>
      ) : (
        <button
          onClick={handleExpandAll}
          className="hover:text-blue-400 transition-colors flex items-center gap-1"
          title={`Show all ${collapsedCount} lines`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 0 1 0 1.06L8 9.06 3.47 4.53a.75.75 0 0 1 1.06-1.06L8 6.94l3.47-3.47a.75.75 0 0 1 1.06 0ZM12.53 9.47a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94l3.47-3.47a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Expand all ({collapsedCount} lines)
        </button>
      )}
    </div>
  );
}
