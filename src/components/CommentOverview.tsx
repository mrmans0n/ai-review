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
      className="fixed inset-0 bg-ctp-base/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-md shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
          <div className="w-0.5 h-5 bg-ctp-peach rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ctp-text">
            Review Overview — {comments.length} comment
            {comments.length !== 1 ? "s" : ""} across{" "}
            {commentsByFile.size} file{commentsByFile.size !== 1 ? "s" : ""}
          </h2>
          <button
            onClick={onClose}
            className="ml-auto text-ctp-subtext hover:text-ctp-text transition-colors"
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
                <h3 className="text-sm font-mono text-ctp-mauve mb-3 pb-2 border-b border-ctp-surface1">
                  {file}
                </h3>
                <div className="space-y-2">
                  {sortedComments.map((comment) => (
                    <button
                      key={comment.id}
                      onClick={() => onGoToComment(comment)}
                      className="w-full text-left group"
                    >
                      <div className="px-4 py-3 border-b border-ctp-surface1/50 last:border-0 hover:bg-ctp-surface0 cursor-pointer transition-colors rounded-sm flex items-center gap-3 border border-ctp-surface1">
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-mono bg-ctp-surface0 text-ctp-subtext border border-ctp-surface1">
                            {comment.startLine === comment.endLine
                              ? `L${comment.startLine}`
                              : `L${comment.startLine}-${comment.endLine}`}
                          </span>
                          {comment.side === "old" && (
                            <span className="text-orange-400 text-xs">deleted</span>
                          )}
                        </div>
                        <p className="text-ctp-text text-sm leading-relaxed flex-1">
                          {comment.text}
                        </p>
                        <span className="flex-shrink-0 text-ctp-overlay0 group-hover:text-ctp-subtext text-xs transition-colors">
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

        <div className="px-6 py-4 border-t border-ctp-surface1 flex justify-end">
          <button
            onClick={onClose}
            className="text-ctp-subtext hover:text-ctp-text bg-ctp-surface0 rounded-sm px-4 py-2 text-sm border border-ctp-surface1 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
