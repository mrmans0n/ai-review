import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Children,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { useMarkdownRenderer } from "../hooks/useMarkdownRenderer";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";

interface MarkdownPreviewProps {
  content: string;
  fileName: string;
  comments: Comment[];
  onAddComment: (
    file: string,
    startLine: number,
    endLine: number,
    side: "old" | "new",
    text: string
  ) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}

interface CommentAnchor {
  startLine: number;
  endLine: number;
}

function findSourceAnchor(target: EventTarget): CommentAnchor | null {
  let el = target as HTMLElement | null;
  while (el) {
    const start = el.getAttribute("data-source-start");
    const end = el.getAttribute("data-source-end");
    if (start && end) {
      return { startLine: parseInt(start, 10), endLine: parseInt(end, 10) };
    }
    el = el.parentElement;
  }
  return null;
}

export function MarkdownPreview({
  content,
  fileName,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
}: MarkdownPreviewProps) {
  const { content: rendered } = useMarkdownRenderer(content);
  const [addingAt, setAddingAt] = useState<CommentAnchor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const anchor = findSourceAnchor(e.target);
    if (anchor) {
      setAddingAt(anchor);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      const anchor = findSourceAnchor(e.target);
      if (anchor) {
        e.preventDefault();
        setAddingAt(anchor);
      }
    }
  }, []);

  const handleSubmitComment = useCallback(
    (text: string) => {
      if (addingAt) {
        onAddComment(fileName, addingAt.startLine, addingAt.endLine, "new", text);
        setAddingAt(null);
      }
    },
    [onAddComment, fileName, addingAt]
  );

  // Make rendered blocks keyboard-accessible
  useEffect(() => {
    if (!containerRef.current) return;
    const blocks = containerRef.current.querySelectorAll("[data-source-start]");
    blocks.forEach((block) => {
      const el = block as HTMLElement;
      if (!el.getAttribute("tabindex")) {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
      }
    });
  }, [rendered]);

  // Only show new-side comments for this file
  const fileComments = comments.filter(
    (c) => c.file === fileName && c.side === "new"
  );
  const placedCommentIds = new Set<string>();

  // Walk the top-level children of the rendered tree and interleave comments
  const interleaved: ReactNode[] = [];

  if (isValidElement(rendered)) {
    const children = Children.toArray((rendered as ReactElement<{ children?: ReactNode }>).props.children);
    for (const child of children) {
      interleaved.push(child);

      if (isValidElement(child)) {
        const props = child.props as Record<string, unknown>;
        const start = props["data-source-start"];
        const end = props["data-source-end"];
        if (typeof start === "number" && typeof end === "number") {
          // Find comments whose range overlaps this block
          const blockComments = fileComments.filter(
            (c) =>
              !placedCommentIds.has(c.id) &&
              c.startLine >= start &&
              c.endLine <= end
          );
          for (const comment of blockComments) {
            placedCommentIds.add(comment.id);
          }
          if (blockComments.length > 0) {
            interleaved.push(
              <div key={`comment-block-${start}-${end}`} className="ml-4 mr-4 mb-2">
                <CommentWidget
                  comments={blockComments}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  editingId={editingCommentId}
                  onStartEdit={onStartEditComment}
                  onStopEdit={onStopEditComment}
                />
              </div>
            );
          }

          // Show add-comment form after this block if it matches
          if (
            addingAt &&
            addingAt.startLine === start &&
            addingAt.endLine === end
          ) {
            interleaved.push(
              <div key="add-comment-form" className="ml-4 mr-4 mb-2">
                <AddCommentForm
                  file={fileName}
                  startLine={addingAt.startLine}
                  endLine={addingAt.endLine}
                  side="new"
                  onSubmit={handleSubmitComment}
                  onCancel={() => setAddingAt(null)}
                />
              </div>
            );
          }
        }
      }
    }
  }

  // Orphaned comments (not placed after any block)
  const orphanedComments = fileComments.filter(
    (c) => !placedCommentIds.has(c.id)
  );

  return (
    <div
      className="markdown-preview"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="markdown-body p-4">{interleaved}</div>

      {orphanedComments.length > 0 && (
        <div className="border-t border-ctp-surface1 mt-4 pt-4 px-4">
          <div className="text-xs text-ctp-subtext mb-2">
            Comments on lines not visible in preview:
          </div>
          {orphanedComments.map((comment) => (
            <div key={comment.id} className="ml-4 mr-4 mb-2">
              <CommentWidget
                comments={[comment]}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                editingId={editingCommentId}
                onStartEdit={onStartEditComment}
                onStopEdit={onStopEditComment}
              />
            </div>
          ))}
        </div>
      )}

      {/* Fallback: show add-comment form at bottom if it wasn't interleaved */}
      {addingAt &&
        !interleaved.some(
          (n) => isValidElement(n) && n.key === "add-comment-form"
        ) && (
          <div className="ml-4 mr-4 mb-2">
            <AddCommentForm
              file={fileName}
              startLine={addingAt.startLine}
              endLine={addingAt.endLine}
              side="new"
              onSubmit={handleSubmitComment}
              onCancel={() => setAddingAt(null)}
            />
          </div>
        )}
    </div>
  );
}
