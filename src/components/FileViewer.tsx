import hljs from "highlight.js/lib/core";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";

interface FileViewerProps {
  fileName: string;
  content: string;
  language: string;
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
}

export function FileViewer({
  fileName,
  content,
  language,
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

  const handleLineClick = (lineNumber: number) => {
    onLineClick(fileName, lineNumber, "new");
  };

  // Get comments for a specific line
  const getCommentsForLine = (lineNumber: number): Comment[] => {
    return comments.filter(
      (c) =>
        c.file === fileName &&
        c.side === "new" &&
        c.startLine <= lineNumber &&
        c.endLine >= lineNumber
    );
  };

  return (
    <div className="bg-gray-900 rounded overflow-hidden">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const lineComments = getCommentsForLine(lineNumber);
        const isAddingComment =
          addingCommentAt &&
          addingCommentAt.file === fileName &&
          addingCommentAt.startLine === lineNumber &&
          addingCommentAt.side === "new";

        return (
          <div key={lineNumber}>
            <div className="flex hover:bg-gray-800 transition-colors">
              {/* Line number gutter */}
              <div
                className="flex-shrink-0 w-16 px-3 py-1 text-right text-gray-500 bg-gray-850 border-r border-gray-700 select-none cursor-pointer hover:bg-gray-700 hover:text-gray-300 transition-colors"
                onClick={() => handleLineClick(lineNumber)}
                title="Click to add comment"
              >
                {lineNumber}
              </div>

              {/* Code content */}
              <div className="flex-1 px-4 py-1 overflow-x-auto">
                <code
                  className="font-mono text-sm text-gray-200"
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
                  startLine={lineNumber}
                  endLine={lineNumber}
                  side="new"
                  onSubmit={onAddComment}
                  onCancel={onCancelComment}
                />
              </div>
            )}

            {/* Display comments */}
            {lineComments.length > 0 && !isAddingComment && (
              <div className="ml-16">
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
