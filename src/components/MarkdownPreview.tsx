import { useCallback } from "react";
import { useMarkdownRenderer } from "../hooks/useMarkdownRenderer";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";

interface MarkdownPreviewProps {
  markdown: string;
  fileName: string;
  comments: Comment[];
  addingCommentAt: {
    file: string;
    startLine: number;
    endLine: number;
    side: "old" | "new";
  } | null;
  onAddComment: (text: string) => void;
  onCancelComment: () => void;
  onBlockClick: (startLine: number, endLine: number) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
  hoveredCommentIds: string[] | null;
  onHoverCommentIds: (ids: string[] | null) => void;
}

function findSourceLines(element: HTMLElement): { start: number; end: number } | null {
  let el: HTMLElement | null = element;
  while (el) {
    const start = el.getAttribute("data-source-start");
    const end = el.getAttribute("data-source-end");
    if (start && end) {
      return { start: parseInt(start, 10), end: parseInt(end, 10) };
    }
    el = el.parentElement;
  }
  return null;
}

export function MarkdownPreview({
  markdown,
  fileName,
  comments,
  addingCommentAt,
  onAddComment,
  onCancelComment,
  onBlockClick,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
  onHoverCommentIds,
}: MarkdownPreviewProps) {
  const { content } = useMarkdownRenderer(markdown);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Don't trigger on links
      if (target.closest("a")) return;
      // Don't trigger on interactive elements within comment widgets
      if (target.closest("[data-comment-widget]")) return;

      const lines = findSourceLines(target);
      if (lines) {
        onBlockClick(lines.start, lines.end);
      }
    },
    [onBlockClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as HTMLElement;
      if (target.closest("a")) return;
      if (target.closest("[data-comment-widget]")) return;

      const lines = findSourceLines(target);
      if (lines) {
        e.preventDefault();
        onBlockClick(lines.start, lines.end);
      }
    },
    [onBlockClick]
  );

  // Group comments by the block they belong to, keyed by endLine
  const commentsByBlock = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (comment.file !== fileName) continue;
    const key = `${comment.endLine}`;
    if (!commentsByBlock.has(key)) commentsByBlock.set(key, []);
    commentsByBlock.get(key)!.push(comment);
  }

  // Build inline widgets that will be rendered after matching blocks
  const blockWidgets: Array<{
    afterLine: number;
    element: React.ReactNode;
  }> = [];

  for (const [lineKey, blockComments] of commentsByBlock) {
    const afterLine = parseInt(lineKey, 10);
    blockWidgets.push({
      afterLine,
      element: (
        <div
          key={`comments-${lineKey}`}
          data-comment-widget
          className="my-2"
          onMouseEnter={() => onHoverCommentIds(blockComments.map((c) => c.id))}
          onMouseLeave={() => onHoverCommentIds(null)}
        >
          <CommentWidget
            comments={blockComments}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
            editingId={editingCommentId}
            onStartEdit={onStartEditComment}
            onStopEdit={onStopEditComment}
          />
        </div>
      ),
    });
  }

  // Add comment form widget
  const showAddForm =
    addingCommentAt && addingCommentAt.file === fileName;

  if (showAddForm) {
    blockWidgets.push({
      afterLine: addingCommentAt!.endLine,
      element: (
        <div key="add-comment-form" data-comment-widget className="my-2">
          <AddCommentForm
            file={addingCommentAt!.file}
            startLine={addingCommentAt!.startLine}
            endLine={addingCommentAt!.endLine}
            side={addingCommentAt!.side}
            onSubmit={onAddComment}
            onCancel={onCancelComment}
          />
        </div>
      ),
    });
  }

  // Sort widgets by line so they appear in order
  blockWidgets.sort((a, b) => a.afterLine - b.afterLine);

  return (
    <div
      className="markdown-preview"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="document"
      aria-label={`Rendered preview of ${fileName}`}
    >
      <div className="markdown-body">{content}</div>
      {blockWidgets.length > 0 && (
        <div className="markdown-preview-widgets">
          {blockWidgets.map((w) => w.element)}
        </div>
      )}
    </div>
  );
}
