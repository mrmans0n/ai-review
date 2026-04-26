import { useState } from "react";
import type { Comment } from "../types";
import { useGroupedComments } from "../hooks/useGroupedComments";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface RailCommentsProps {
  comments: Comment[];
  onGoToComment: (comment: Comment) => void;
  onOpenOverview?: () => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
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

function CommentCard({
  comment,
  onGoToComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
}: {
  comment: Comment;
  onGoToComment: (comment: Comment) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}) {
  const [editText, setEditText] = useState(comment.text);
  const isEditing = editingCommentId === comment.id;

  if (isEditing) {
    return (
      <div className="rounded-sm border border-ctp-surface1 bg-ctp-mantle px-3 py-2">
        <div className="mb-1 flex items-center gap-2 min-w-0">
          <span className="min-w-0 flex-1 text-xs font-mono text-ctp-subtext">
            <MiddleEllipsis text={getFileName(comment.file)} />
          </span>
          <span className="flex-shrink-0 rounded-sm bg-ctp-surface0 px-1.5 py-0.5 text-[11px] font-mono text-ctp-overlay0">
            {formatCommentRange(comment)}
          </span>
        </div>
        <textarea
          className="mt-1 w-full rounded-sm border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text focus:border-accent-review focus:outline-none resize-y"
          rows={3}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (editText.trim()) {
                onEditComment(comment.id, editText.trim());
                onStopEditComment();
              }
            } else if (e.key === "Escape") {
              onStopEditComment();
            }
          }}
          autoFocus
        />
        <div className="mt-1 flex gap-1 justify-end">
          <button
            type="button"
            onClick={() => onStopEditComment()}
            className="px-2 py-0.5 text-[11px] text-ctp-subtext hover:text-ctp-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (editText.trim()) {
                onEditComment(comment.id, editText.trim());
                onStopEditComment();
              }
            }}
            className="px-2 py-0.5 text-[11px] rounded-sm bg-accent-review text-accent-review-text hover:opacity-90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <article
      role="button"
      aria-label={`Comment on ${comment.file} ${formatCommentRange(comment)}`}
      tabIndex={0}
      onClick={() => onGoToComment(comment)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onGoToComment(comment);
        }
      }}
      className="w-full rounded-sm border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-left hover:bg-ctp-surface0 transition-colors cursor-pointer"
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
      <div className="mt-1 flex gap-2 justify-end" onKeyDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditText(comment.text);
            onStartEditComment(comment.id);
          }}
          className="text-[11px] text-ctp-overlay0 hover:text-ctp-text transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteComment(comment.id);
          }}
          className="text-[11px] text-ctp-overlay0 hover:text-ctp-red transition-colors"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export function RailComments({
  comments,
  onGoToComment,
  onOpenOverview,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
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
            <CommentCard
              key={comment.id}
              comment={comment}
              onGoToComment={onGoToComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              editingCommentId={editingCommentId}
              onStartEditComment={onStartEditComment}
              onStopEditComment={onStopEditComment}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
