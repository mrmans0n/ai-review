import { useEffect, useState } from "react";
import type { Comment } from "../types";
import { useGroupedComments } from "../hooks/useGroupedComments";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface RailCommentsProps {
  comments: Comment[];
  onGoToComment: (comment: Comment) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
  onOpenOverview?: () => void;
}

export function isWholeFileComment(comment: { startLine: number; endLine: number }): boolean {
  return comment.startLine === 0 && comment.endLine === 0;
}

export function formatCommentRange(comment: Comment): string {
  if (isWholeFileComment(comment)) return "File";
  if (comment.startLine === comment.endLine) return `L${comment.startLine}`;
  return `L${comment.startLine}-${comment.endLine}`;
}

function RailCommentCard({
  comment,
  isEditing,
  onGoToComment,
  onEditComment,
  onDeleteComment,
  onStartEditComment,
  onStopEditComment,
}: {
  comment: Comment;
  isEditing: boolean;
  onGoToComment: (comment: Comment) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}) {
  const [editText, setEditText] = useState(comment.text);

  useEffect(() => {
    if (isEditing) setEditText(comment.text);
  }, [comment.text, isEditing]);

  const saveEdit = () => {
    if (!editText.trim()) return;
    onEditComment(comment.id, editText.trim());
    onStopEditComment();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onGoToComment(comment)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onGoToComment(comment);
        }
      }}
      className="w-full text-left rounded-sm border border-divider bg-surface-hover/70 px-3 py-2 transition-colors hover:border-ink-muted hover:bg-surface-hover focus:outline-none focus:ring-1 focus:ring-accent-review/50"
      data-comment-id={comment.id}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-fit rounded-sm border border-divider bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
          {formatCommentRange(comment)}
        </span>
        {comment.side === "old" && !isWholeFileComment(comment) && (
          <span className="min-w-fit rounded-sm bg-ctp-red/10 px-1.5 py-0.5 text-[10px] text-ctp-red">
            deleted
          </span>
        )}
      </div>

      {isEditing ? (
        <div
          className="mt-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                saveEdit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onStopEditComment();
              }
            }}
            className="h-24 w-full resize-none rounded-sm border border-divider bg-surface p-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-ctp-mauve focus:outline-none focus:ring-1 focus:ring-ctp-mauve/30"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editText.trim()}
              className="rounded-sm bg-ctp-mauve px-2 py-1 text-xs font-medium text-ctp-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onStopEditComment}
              className="rounded-sm px-2 py-1 text-xs text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-ink-primary">
            {comment.text}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-secondary">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartEditComment(comment.id);
              }}
              className="transition-colors hover:text-ctp-blue"
            >
              Edit
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteComment(comment.id);
              }}
              className="transition-colors hover:text-ctp-red"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function RailComments({
  comments,
  onGoToComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
  onOpenOverview,
}: RailCommentsProps) {
  const groups = useGroupedComments(comments);

  if (comments.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-ink-muted">
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
          className="self-start rounded-sm border border-divider px-2.5 py-1 text-xs text-ink-secondary hover:bg-surface-hover hover:text-ink-primary transition-colors"
        >
          Open overview
        </button>
      )}

      {groups.map((group) => (
        <div key={group.file} className="space-y-1.5">
          <div className="px-1 text-[11px] font-mono text-ink-muted">
            <MiddleEllipsis text={group.file} />
          </div>
          {group.comments.map((comment) => (
            <RailCommentCard
              key={comment.id}
              comment={comment}
              isEditing={editingCommentId === comment.id}
              onGoToComment={onGoToComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              onStartEditComment={onStartEditComment}
              onStopEditComment={onStopEditComment}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
