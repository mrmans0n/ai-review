import type { MutableRefObject } from "react";
import hljs from "highlight.js/lib/core";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";

interface FileViewerProps {
  fileName: string;
  content: string;
  language: string;
  isViewed: boolean;
  onToggleViewed: () => void;
  onLineClick: (file: string, line: number, side: "old" | "new") => void;
  addingCommentAt: {
    file: string;
    startLine: number;
    endLine: number;
    side: "old" | "new";
  } | null;
  onAddComment: (text: string) => void;
  onCancelComment: () => void;
  comments: Comment[];
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
  hoveredLine: { file: string; line: number; side: "old" | "new" } | null;
  onHoverLine: (line: { file: string; line: number; side: "old" | "new" } | null) => void;
  lastFocusedLine: { file: string; line: number; side: "old" | "new" } | null;
  selectingRange: { file: string; startLine: number; side: "old" | "new" } | null;
  onStartSelectingRange: (range: { file: string; startLine: number; side: "old" | "new" } | null) => void;
  selectedRange: { file: string; startLine: number; endLine: number; side: "old" | "new" } | null;
  onSelectedRangeChange: (range: { file: string; startLine: number; endLine: number; side: "old" | "new" } | null) => void;
  hoveredCommentIds: string[] | null;
  onHoverCommentIds: (ids: string[] | null) => void;
  onShiftClickLine: (file: string, startLine: number, endLine: number, side: "old" | "new") => void;
  suppressNextClick: MutableRefObject<boolean>;
  searchQuery: string;
  highlightedWord: string | null;
}

export function FileViewer({
  fileName,
  content,
  language,
  isViewed,
  onToggleViewed,
  onLineClick,
  addingCommentAt,
  onAddComment,
  onCancelComment,
  comments,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
  hoveredLine,
  onHoverLine,
  lastFocusedLine,
  selectingRange,
  onStartSelectingRange,
  selectedRange,
  onSelectedRangeChange,
  hoveredCommentIds,
  onHoverCommentIds,
  onShiftClickLine,
  suppressNextClick,
  searchQuery,
  highlightedWord,
}: FileViewerProps) {
  const lines = content.split("\n");

  // Highlight the entire content
  let highlightedLines: string[] = [];
  try {
    if (language && language !== "plaintext") {
      const result = hljs.highlight(content, {
        language,
        ignoreIllegals: true,
      });
      highlightedLines = result.value.split("\n");
    } else {
      highlightedLines = lines;
    }
  } catch (error) {
    console.error("Syntax highlighting failed:", error);
    highlightedLines = lines;
  }

  // Get comments for a specific line (only where endLine matches, for widget placement)
  const getCommentsAtEndLine = (lineNumber: number): Comment[] => {
    return comments.filter(
      (c) =>
        c.file === fileName &&
        c.side === "new" &&
        c.endLine === lineNumber
    );
  };

  // Check if a line should be highlighted (selection, adding comment, or hovered comment)
  const isLineHighlighted = (lineNumber: number): boolean => {
    if (selectedRange && selectedRange.file === fileName && selectedRange.side === "new") {
      if (lineNumber >= selectedRange.startLine && lineNumber <= selectedRange.endLine) {
        return true;
      }
    }
    if (addingCommentAt && addingCommentAt.file === fileName && addingCommentAt.side === "new") {
      if (lineNumber >= addingCommentAt.startLine && lineNumber <= addingCommentAt.endLine) {
        return true;
      }
    }
    if (hoveredCommentIds && hoveredCommentIds.length > 0) {
      for (const c of comments) {
        if (
          hoveredCommentIds.includes(c.id) &&
          c.file === fileName &&
          c.side === "new" &&
          lineNumber >= c.startLine &&
          lineNumber <= c.endLine
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const isGutterHovered = (lineNumber: number): boolean => {
    return (
      hoveredLine !== null &&
      hoveredLine.file === fileName &&
      hoveredLine.line === lineNumber &&
      hoveredLine.side === "new"
    );
  };

  const handleGutterMouseDown = (lineNumber: number) => {
    onStartSelectingRange({
      file: fileName,
      startLine: lineNumber,
      side: "new",
    });
    onSelectedRangeChange({
      file: fileName,
      startLine: lineNumber,
      endLine: lineNumber,
      side: "new",
    });
  };

  const handleGutterMouseEnter = (lineNumber: number) => {
    onHoverLine({ file: fileName, line: lineNumber, side: "new" });

    if (selectingRange && selectingRange.file === fileName && selectingRange.side === "new") {
      const startLine = Math.min(selectingRange.startLine, lineNumber);
      const endLine = Math.max(selectingRange.startLine, lineNumber);
      onSelectedRangeChange({
        file: fileName,
        startLine,
        endLine,
        side: "new",
      });
    }
  };

  const handleGutterClick = (lineNumber: number, event: React.MouseEvent) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }

    if (event.shiftKey && lastFocusedLine && lastFocusedLine.file === fileName && lastFocusedLine.side === "new") {
      const startLine = Math.min(lastFocusedLine.line, lineNumber);
      const endLine = Math.max(lastFocusedLine.line, lineNumber);
      onShiftClickLine(fileName, startLine, endLine, "new");
    } else {
      onLineClick(fileName, lineNumber, "new");
    }
  };

  return (
    <div className="bg-gray-900 rounded overflow-hidden border border-gray-700" data-file-viewer={fileName} data-search-query={searchQuery} data-highlighted-word={highlightedWord || ""}>
      <div
        className={`px-4 py-2 border-b border-gray-700 flex items-center justify-between transition-colors ${
          isViewed ? "bg-gray-800/80 text-gray-400 cursor-pointer" : "bg-gray-800"
        }`}
        onClick={() => {
          if (isViewed) {
            onToggleViewed();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-300"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isViewed}
              onChange={onToggleViewed}
              className="h-4 w-4 rounded border-gray-500 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            Viewed
          </label>
          <span className="text-sm text-gray-200 font-medium">{fileName}</span>
        </div>
        <span className="text-xs text-gray-400">{lines.length} lines</span>
      </div>

      {!isViewed && lines.map((line, index) => {
        const lineNumber = index + 1;
        const lineComments = getCommentsAtEndLine(lineNumber);
        const isAddingComment =
          addingCommentAt &&
          addingCommentAt.file === fileName &&
          addingCommentAt.endLine === lineNumber &&
          addingCommentAt.side === "new";
        const highlighted = isLineHighlighted(lineNumber);
        const gutterHovered = isGutterHovered(lineNumber);

        return (
          <div key={lineNumber} data-line-number={lineNumber} data-line-side="new">
            <div className={`flex transition-colors ${highlighted ? "bg-blue-900/20" : "hover:bg-gray-800"}`}>
              {/* Line number gutter */}
              <div
                className={`relative flex-shrink-0 w-16 px-3 py-1 text-right text-gray-500 border-r border-gray-700 select-none cursor-pointer transition-colors ${
                  highlighted
                    ? "bg-blue-900/30 text-blue-400"
                    : "bg-gray-850 hover:bg-gray-700 hover:text-gray-300"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleGutterMouseDown(lineNumber);
                }}
                onMouseEnter={() => handleGutterMouseEnter(lineNumber)}
                onClick={(e) => handleGutterClick(lineNumber, e)}
                title="Click to add comment"
              >
                {gutterHovered && (
                  <span
                    className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 cursor-pointer text-white opacity-80 hover:opacity-100 transition-all"
                    title="Add comment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M10 2c-4.418 0-8 2.91-8 6.5S5.582 15 10 15c.382 0 .757-.022 1.124-.063l3.33 2.152a.5.5 0 00.771-.42v-2.97C17.09 12.266 18 10.48 18 8.5 18 4.91 14.418 2 10 2z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {lineNumber}
              </div>

              {/* Code content */}
              <div className="diff-code-cell flex-1 px-4 py-1 overflow-x-auto">
                <code
                  className="diff-code font-mono text-sm text-gray-200 whitespace-pre"
                  dangerouslySetInnerHTML={{
                    __html: highlightedLines[index] || line,
                  }}
                />
              </div>
            </div>

            {/* Add comment form */}
            {isAddingComment && (
              <div className="ml-16">
                <AddCommentForm
                  file={fileName}
                  startLine={addingCommentAt!.startLine}
                  endLine={addingCommentAt!.endLine}
                  side="new"
                  onSubmit={onAddComment}
                  onCancel={onCancelComment}
                  prefilledCode={
                    lines
                      .slice(addingCommentAt!.startLine - 1, addingCommentAt!.endLine)
                      .join("\n") || undefined
                  }
                  language={language}
                />
              </div>
            )}

            {/* Display comments */}
            {lineComments.length > 0 && !isAddingComment && (
              <div
                className="ml-16"
                onMouseEnter={() => onHoverCommentIds(lineComments.map((c) => c.id))}
                onMouseLeave={() => onHoverCommentIds(null)}
              >
                <CommentWidget
                  comments={lineComments}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  editingId={editingCommentId}
                  onStartEdit={onStartEditComment}
                  onStopEdit={onStopEditComment}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
