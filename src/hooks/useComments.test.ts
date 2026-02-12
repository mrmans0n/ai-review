import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComments } from "./useComments";

describe("useComments", () => {
  it("should initialize with empty comments", () => {
    const { result } = renderHook(() => useComments());
    expect(result.current.comments).toEqual([]);
    expect(result.current.editingCommentId).toBeNull();
  });

  it("should add a comment", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment(
        "file.ts",
        10,
        15,
        "new",
        "This is a test comment"
      );
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0]).toMatchObject({
      file: "file.ts",
      startLine: 10,
      endLine: 15,
      side: "new",
      text: "This is a test comment",
    });
    expect(result.current.comments[0].id).toBe(commentId!);
    expect(result.current.comments[0].createdAt).toBeTruthy();
  });

  it("should add multiple comments", () => {
    const { result } = renderHook(() => useComments());

    act(() => {
      result.current.addComment("file1.ts", 1, 2, "old", "Comment 1");
      result.current.addComment("file2.ts", 5, 10, "new", "Comment 2");
      result.current.addComment("file3.ts", 20, 25, "old", "Comment 3");
    });

    expect(result.current.comments).toHaveLength(3);
    expect(result.current.comments[0].text).toBe("Comment 1");
    expect(result.current.comments[1].text).toBe("Comment 2");
    expect(result.current.comments[2].text).toBe("Comment 3");
  });

  it("should update a comment", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment(
        "file.ts",
        1,
        2,
        "new",
        "Original text"
      );
    });

    act(() => {
      result.current.updateComment(commentId!, "Updated text");
    });

    expect(result.current.comments[0].text).toBe("Updated text");
    expect(result.current.comments[0].id).toBe(commentId!);
  });

  it("should not modify other comments when updating", () => {
    const { result } = renderHook(() => useComments());

    let id1: string, id2: string;
    act(() => {
      id1 = result.current.addComment("file1.ts", 1, 2, "new", "Comment 1");
      id2 = result.current.addComment("file2.ts", 3, 4, "old", "Comment 2");
    });

    act(() => {
      result.current.updateComment(id1!, "Updated Comment 1");
    });

    expect(result.current.comments[0].text).toBe("Updated Comment 1");
    expect(result.current.comments[1].text).toBe("Comment 2");
  });

  it("should delete a comment", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment(
        "file.ts",
        1,
        2,
        "new",
        "To be deleted"
      );
    });

    expect(result.current.comments).toHaveLength(1);

    act(() => {
      result.current.deleteComment(commentId!);
    });

    expect(result.current.comments).toHaveLength(0);
  });

  it("should delete only the specified comment", () => {
    const { result } = renderHook(() => useComments());

    let id1: string, id2: string, id3: string;
    act(() => {
      id1 = result.current.addComment("file1.ts", 1, 2, "new", "Keep 1");
      id2 = result.current.addComment("file2.ts", 3, 4, "old", "Delete");
      id3 = result.current.addComment("file3.ts", 5, 6, "new", "Keep 2");
    });

    act(() => {
      result.current.deleteComment(id2!);
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBe(id1!);
    expect(result.current.comments[1].id).toBe(id3!);
  });

  it("should start editing a comment", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment("file.ts", 1, 2, "new", "Comment");
    });

    expect(result.current.editingCommentId).toBeNull();

    act(() => {
      result.current.startEditing(commentId!);
    });

    expect(result.current.editingCommentId).toBe(commentId!);
  });

  it("should stop editing", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment("file.ts", 1, 2, "new", "Comment");
      result.current.startEditing(commentId!);
    });

    expect(result.current.editingCommentId).toBe(commentId!);

    act(() => {
      result.current.stopEditing();
    });

    expect(result.current.editingCommentId).toBeNull();
  });

  it("should maintain editing state across comment updates", () => {
    const { result } = renderHook(() => useComments());

    let commentId: string;
    act(() => {
      commentId = result.current.addComment("file.ts", 1, 2, "new", "Comment");
      result.current.startEditing(commentId!);
    });

    act(() => {
      result.current.updateComment(commentId!, "Updated");
    });

    expect(result.current.editingCommentId).toBe(commentId!);
    expect(result.current.comments[0].text).toBe("Updated");
  });
});
