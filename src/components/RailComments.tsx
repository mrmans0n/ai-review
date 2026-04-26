import type { Comment } from "../types";
import { useGroupedComments } from "../hooks/useGroupedComments";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface RailCommentsProps {
  comments: Comment[];
  onGoToComment: (comment: Comment) => void;
  onOpenOverview?: () => void;
}

export function formatCommentRange(comment: Comment): string {
  if (comment.startLine <= 0 && comment.endLine <= 0) return "File";
  if (comment.startLine === comment.endLine) return `L${comment.startLine}`;
  return `L${comment.startLine}-${comment.endLine}`;
}

function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}

export function RailComments({
  comments,
  onGoToComment,
  onOpenOverview,
}: RailCommentsProps) {
  const groups = useGroupedComments(comments);

  if (comments.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-ctp-overlay0">
        No comments yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {onOpenOverview && (
        <button
          type="button"
          onClick={onOpenOverview}
          className="self-start rounded-sm border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text transition-colors"
        >
          Open overview
        </button>
      )}

      {groups.map((group) => (
        <div key={group.file} className="space-y-1.5">
          <div className="px-1 text-[11px] font-mono text-ctp-overlay0">
            <MiddleEllipsis text={group.file} />
          </div>
          {group.comments.map((comment) => (
            <button
              key={comment.id}
              type="button"
              onClick={() => onGoToComment(comment)}
              className="w-full rounded-sm border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-left hover:bg-ctp-surface0 transition-colors"
            >
              <div className="mb-1 flex items-center gap-2 min-w-0">
                <span className="min-w-0 flex-1 text-xs font-mono text-ctp-subtext">
                  <MiddleEllipsis text={getFileName(comment.file)} />
                </span>
                <span className="flex-shrink-0 rounded-sm bg-ctp-surface0 px-1.5 py-0.5 text-[11px] font-mono text-ctp-overlay0">
                  {formatCommentRange(comment)}
                </span>
                {comment.side === "old" && (
                  <span className="flex-shrink-0 text-[11px] text-orange-400">
                    deleted
                  </span>
                )}
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-ctp-text">
                {comment.text}
              </p>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
