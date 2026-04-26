import { formatCommentRange } from "./RailComments";
import type { Comment } from "../types";

interface CommentOverviewProps {
  comments: Comment[];
  onClose: () => void;
  onGoToComment: (comment: Comment) => void;
}

export function CommentOverview({
  comments,
  onClose,
  onGoToComment,
}: CommentOverviewProps) {
  // Group comments by file
  const commentsByFile = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!commentsByFile.has(comment.file)) {
      commentsByFile.set(comment.file, []);
    }
    commentsByFile.get(comment.file)!.push(comment);
  }

  // Sort files alphabetically, comments within file by startLine
  const sortedFiles = Array.from(commentsByFile.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-divider rounded-md shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-divider">
          <div className="w-0.5 h-5 bg-accent-review rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ink-primary">
            Review Overview — {comments.length} comment
            {comments.length !== 1 ? "s" : ""} across{" "}
            {commentsByFile.size} file{commentsByFile.size !== 1 ? "s" : ""}
          </h2>
          <button
            onClick={onClose}
            className="ml-auto text-ink-secondary hover:text-ink-primary transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sortedFiles.map(([file, fileComments]) => {
            const sortedComments = [...fileComments].sort(
              (a, b) => a.startLine - b.startLine
            );

            return (
              <div key={file}>
                <h3 className="text-sm font-mono text-accent-review mb-3 pb-2 border-b border-divider">
                  {file}
                </h3>
                <div className="space-y-2">
                  {sortedComments.map((comment) => (
                    <button
                      key={comment.id}
                      onClick={() => onGoToComment(comment)}
                      className="w-full text-left group"
                    >
                      <div className="px-4 py-3 hover:bg-surface-hover cursor-pointer transition-colors rounded-sm flex items-center gap-3 border border-divider">
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-mono bg-surface text-ink-secondary border border-divider">
                            {formatCommentRange(comment)}
                          </span>
                          {comment.side === "old" && (
                            <span className="text-orange-400 text-xs">deleted</span>
                          )}
                        </div>
                        <p className="text-ink-primary text-sm leading-relaxed flex-1">
                          {comment.text}
                        </p>
                        <span className="flex-shrink-0 text-ink-muted group-hover:text-ink-secondary text-xs transition-colors">
                          Go →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-divider flex justify-end">
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary bg-surface rounded-sm px-4 py-2 text-sm border border-divider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
