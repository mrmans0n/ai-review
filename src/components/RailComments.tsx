import { useEffect, useMemo, useState } from "react";
import type { Comment } from "../types";
import { formatCommentRange } from "../lib/commentLabels";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface RailCommentsProps {
  comments: Comment[];
  onGoToComment: (comment: Comment) => void;
  onOpenOverview: () => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}

interface CommentCardProps {
  comment: Comment;
  isEditing: boolean;
  onGoToComment: (comment: Comment) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}

function CommentCard({
  comment,
  isEditing,
  onGoToComment,
  onEditComment,
  onDeleteComment,
  onStartEditComment,
  onStopEditComment,
}: CommentCardProps) {
  const [editText, setEditText] = useState(comment.text);

  useEffect(() => {
    if (isEditing) setEditText(comment.text);
  }, [comment.text, isEditing]);

  const saveEdit = () => {
    const nextText = editText.trim();
    if (nextText) {
      onEditComment(comment.id, nextText);
      onStopEditComment();
    }
  };

  return (
    <article
      className="rounded-sm border border-ctp-surface1 bg-ctp-surface0/70 px-3 py-2 text-left transition-colors hover:border-ctp-overlay0 hover:bg-ctp-surface0"
      onClick={() => {
        if (!isEditing) onGoToComment(comment);
      }}
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono text-ctp-subtext min-w-0">
            <MiddleEllipsis text={comment.file} />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-sm border border-ctp-surface1 bg-ctp-mantle px-1.5 py-0.5 text-[10px] font-mono text-ctp-subtext">
              {formatCommentRange(comment)}
            </span>
            {comment.side === "old" && (
              <span className="text-[10px] text-ctp-peach">deleted</span>
            )}
          </div>
        </div>
        {!isEditing && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartEditComment(comment.id);
              }}
              className="rounded-sm px-1.5 py-0.5 text-[11px] text-ctp-mauve transition-colors hover:bg-ctp-surface1 hover:text-ctp-blue"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteComment(comment.id);
              }}
              className="rounded-sm px-1.5 py-0.5 text-[11px] text-ctp-subtext transition-colors hover:bg-ctp-surface1 hover:text-ctp-red"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                saveEdit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onStopEditComment();
              }
            }}
            className="w-full resize-none rounded-sm border border-ctp-surface1 bg-ctp-mantle p-2 text-sm text-ctp-text placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none focus:ring-1 focus:ring-ctp-mauve/30"
            rows={3}
            autoFocus
            placeholder="Edit comment..."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={editText.trim().length === 0}
              className="rounded-sm bg-ctp-mauve px-2 py-1 text-xs font-medium text-ctp-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onStopEditComment}
              className="rounded-sm px-2 py-1 text-xs text-ctp-subtext transition-colors hover:bg-ctp-surface1 hover:text-ctp-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-ctp-text">
          {comment.text}
        </p>
      )}
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
  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        const byFile = a.file.localeCompare(b.file);
        if (byFile !== 0) return byFile;
        return a.startLine - b.startLine || a.endLine - b.endLine;
      }),
    [comments]
  );

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-ctp-surface1">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ctp-surface1">
        <div className="w-0.5 h-3.5 bg-ctp-mauve rounded-full flex-shrink-0" />
        <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
          Draft Comments
        </span>
        {comments.length > 0 && (
          <button
            type="button"
            onClick={onOpenOverview}
            className="ml-auto rounded-sm px-1.5 py-0.5 text-[11px] text-ctp-subtext transition-colors hover:bg-ctp-surface1 hover:text-ctp-text"
          >
            Overview
          </button>
        )}
      </div>
      {sortedComments.length === 0 ? (
        <div className="px-4 py-5 text-center text-sm text-ctp-overlay0">
          No draft comments
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-auto p-2">
          {sortedComments.map((comment) => (
            <CommentCard
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
      )}
    </section>
  );
}
