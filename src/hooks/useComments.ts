import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Comment } from "../types";

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const addComment = (
    file: string,
    startLine: number,
    endLine: number,
    side: "old" | "new",
    text: string
  ) => {
    const newComment: Comment = {
      id: uuidv4(),
      file,
      startLine,
      endLine,
      side,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
    return newComment.id;
  };

  const updateComment = (id: string, text: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === id ? { ...comment, text } : comment
      )
    );
  };

  const deleteComment = (id: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));
  };

  const startEditing = (id: string) => {
    setEditingCommentId(id);
  };

  const stopEditing = () => {
    setEditingCommentId(null);
  };

  const clearAll = () => setComments([]);

  return {
    comments,
    addComment,
    updateComment,
    deleteComment,
    editingCommentId,
    startEditing,
    stopEditing,
    clearAll,
  };
}
