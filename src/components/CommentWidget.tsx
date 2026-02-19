import { useState } from "react";
import hljs from "highlight.js/lib/core";
import { parseCommentText } from "../lib/parseCommentText";
import type { CommentSegment } from "../lib/parseCommentText";
import type { Comment } from "../types";

interface CommentWidgetProps {
  comments: Comment[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
}

function renderCommentText(text: string): React.ReactNode {
  const segments = parseCommentText(text);
  if (segments.length === 0) return text;
  return segments.map((seg: CommentSegment, i: number) => {
    if (seg.type === "text") {
      return (
        <span key={i} className="whitespace-pre-wrap">
          {seg.content}
        </span>
      );
    }
    let highlightedHtml: string;
    try {
      const result = seg.language
        ? hljs.highlight(seg.content, { language: seg.language, ignoreIllegals: true })
        : hljs.highlightAuto(seg.content);
      highlightedHtml = result.value;
    } catch {
      highlightedHtml = seg.content;
    }
    return (
      <pre key={i} className="bg-gray-900 rounded p-2 my-1 overflow-x-auto text-sm">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    );
  });
}

export function CommentWidget({
  comments,
  onEdit,
  onDelete,
  editingId,
  onStartEdit,
  onStopEdit,
}: CommentWidgetProps) {
  const [editText, setEditText] = useState("");

  const handleStartEdit = (comment: Comment) => {
    setEditText(comment.text);
    onStartEdit(comment.id);
  };

  const handleSaveEdit = (id: string) => {
    onEdit(id, editText);
    onStopEdit();
    setEditText("");
  };

  const handleCancelEdit = () => {
    onStopEdit();
    setEditText("");
  };

  return (
    <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500 p-3 my-2">
      {comments.map((comment) => (
        <div key={comment.id} className="mb-2 last:mb-0">
          {editingId === comment.id ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-gray-800 text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSaveEdit(comment.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-yellow-100 text-sm mb-1">
                {renderCommentText(comment.text)}
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-400">
                <span>
                  Lines {comment.startLine}
                  {comment.endLine !== comment.startLine && `-${comment.endLine}`}
                </span>
                <span>•</span>
                <button
                  onClick={() => handleStartEdit(comment)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
