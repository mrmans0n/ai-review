import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHunkExpansion } from "./useHunkExpansion";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

// Minimal hunk structure matching react-diff-view's HunkData
const makeHunk = (oldStart: number, oldLines: number, newStart: number, newLines: number) => ({
  content: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
  oldStart,
  oldLines,
  newStart,
  newLines,
  changes: Array.from({ length: newLines }, (_, i) => ({
    type: "normal" as const,
    isNormal: true,
    oldLineNumber: oldStart + i,
    newLineNumber: newStart + i,
    content: `line ${newStart + i}`,
  })),
});

describe("useHunkExpansion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return original hunks when no expansion has occurred", () => {
    const hunks = [makeHunk(10, 5, 10, 5)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    expect(result.current.hunks).toBe(hunks);
  });

  it("should reset expanded state when file path changes", () => {
    const hunks = [makeHunk(10, 5, 10, 5)];
    const { result, rerender } = renderHook(
      ({ filePath }) => useHunkExpansion(filePath, hunks, "/repo", "unstaged", null),
      { initialProps: { filePath: "a.ts" } }
    );

    // Rerender with a different file path
    rerender({ filePath: "b.ts" });
    expect(result.current.hunks).toBe(hunks);
  });

  it("should fetch file source via read_file_content for unstaged mode", async () => {
    const fileContent = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\nline 11\nline 12\nline 13\nline 14\nline 15\nline 16\nline 17\nline 18\nline 19\nline 20";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(10, 3, 10, 3)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 5, 9);
    });

    expect(invoke).toHaveBeenCalledWith("read_file_content", {
      path: "/repo",
      filePath: "test.ts",
    });
  });

  it("should fetch file source via get_file_at_ref for commit mode", async () => {
    const fileContent = "line 1\nline 2\nline 3";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(2, 1, 2, 1)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "commit", "abc123")
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 1, 1);
    });

    expect(invoke).toHaveBeenCalledWith("get_file_at_ref", {
      path: "/repo",
      gitRef: "abc123",
      filePath: "test.ts",
    });
  });

  it("should fetch file source via get_file_at_ref with :0 for staged mode", async () => {
    const fileContent = "line 1\nline 2\nline 3";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(2, 1, 2, 1)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "staged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 1, 1);
    });

    expect(invoke).toHaveBeenCalledWith("get_file_at_ref", {
      path: "/repo",
      gitRef: ":0",
      filePath: "test.ts",
    });
  });

  it("should fallback to read_file_content when get_file_at_ref fails", async () => {
    const fileContent = "line 1\nline 2\nline 3";
    vi.mocked(invoke)
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce(fileContent);

    const hunks = [makeHunk(2, 1, 2, 1)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "commit", "abc123")
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 1, 1);
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "get_file_at_ref", {
      path: "/repo",
      gitRef: "abc123",
      filePath: "test.ts",
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "read_file_content", {
      path: "/repo",
      filePath: "test.ts",
    });
  });

  it("should cache file source across multiple expansions", async () => {
    const fileContent = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\nline 11\nline 12\nline 13\nline 14\nline 15\nline 16\nline 17\nline 18\nline 19\nline 20\nline 21\nline 22\nline 23\nline 24\nline 25\nline 26\nline 27\nline 28\nline 29\nline 30";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(10, 3, 10, 3), makeHunk(20, 3, 20, 3)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 5, 9);
    });

    await act(async () => {
      await result.current.expandRange("test.ts", 13, 19);
    });

    // Should only invoke once — second call uses cache
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
