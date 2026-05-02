import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGit } from "./useGit";
import type { GitDiffResult } from "../types";

// Mock the bridge facade
vi.mock("../lib/bridge", () => ({
  invoke: vi.fn(),
  listen: vi.fn(async () => () => {}),
  openDirectoryDialog: vi.fn(),
}));

import { invoke } from "../lib/bridge";

describe("useGit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useGit(null));

    expect(result.current.isGitRepo).toBe(false);
    expect(result.current.diffResult).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should check if directory is a git repo on mount", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "is_git_repo") {
        return Promise.resolve(true);
      }
      if (cmd === "get_unstaged_diff") {
        return Promise.resolve({
          diff: "mock diff",
          files: [],
        });
      }
      return Promise.resolve(false);
    });

    const { result } = renderHook(() => useGit("/test/repo"));

    await waitFor(() => {
      expect(result.current.isGitRepo).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith("is_git_repo", { path: "/test/repo" });
  });

  it("should load unstaged diff automatically when it's a git repo", async () => {
    const mockDiffResult: GitDiffResult = {
      diff: "diff --git a/file.ts b/file.ts\n...",
      files: [
        { path: "file.ts", status: "modified" },
      ],
    };

    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "is_git_repo") {
        return Promise.resolve(true);
      }
      if (cmd === "get_unstaged_diff") {
        return Promise.resolve(mockDiffResult);
      }
      return Promise.reject("Unknown command");
    });

    const { result } = renderHook(() => useGit("/test/repo"));

    await waitFor(() => {
      expect(result.current.diffResult).toBeTruthy();
    });

    expect(result.current.diffResult).toEqual(mockDiffResult);
    expect(invoke).toHaveBeenCalledWith("get_unstaged_diff", {
      path: "/test/repo",
    });
  });

  it("should not check git repo when workingDir is null", () => {
    renderHook(() => useGit(null));

    expect(invoke).not.toHaveBeenCalled();
  });

  it("should handle git repo check failure", async () => {
    vi.mocked(invoke).mockRejectedValue("Not a git repository");

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useGit("/test/not-a-repo"));

    await waitFor(() => {
      expect(result.current.isGitRepo).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should load unstaged diff", async () => {
    const mockDiffResult: GitDiffResult = {
      diff: "unstaged changes",
      files: [{ path: "modified.ts", status: "modified" }],
    };

    vi.mocked(invoke).mockResolvedValue(mockDiffResult);

    const { result } = renderHook(() => useGit("/test/repo"));

    await act(async () => {
      await result.current.loadDiff({ mode: "unstaged" });
    });

    expect(result.current.diffResult).toEqual(mockDiffResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(invoke).toHaveBeenCalledWith("get_unstaged_diff", {
      path: "/test/repo",
    });
  });

  it("should load staged diff", async () => {
    const mockDiffResult: GitDiffResult = {
      diff: "staged changes",
      files: [{ path: "staged.ts", status: "added" }],
    };

    vi.mocked(invoke).mockResolvedValue(mockDiffResult);

    const { result } = renderHook(() => useGit("/test/repo"));

    await act(async () => {
      await result.current.loadDiff({ mode: "staged" });
    });

    expect(result.current.diffResult).toEqual(mockDiffResult);
    expect(invoke).toHaveBeenCalledWith("get_staged_diff", {
      path: "/test/repo",
    });
  });

  it("should load commit diff", async () => {
    const mockDiffResult: GitDiffResult = {
      diff: "commit changes",
      files: [{ path: "committed.ts", status: "modified" }],
    };

    vi.mocked(invoke).mockResolvedValue(mockDiffResult);

    const { result } = renderHook(() => useGit("/test/repo"));

    await act(async () => {
      await result.current.loadDiff({
        mode: "commit",
        commitRef: "abc123",
      });
    });

    expect(result.current.diffResult).toEqual(mockDiffResult);
    expect(invoke).toHaveBeenCalledWith("get_commit_ref_diff", {
      path: "/test/repo",
      commit: "abc123",
    });
  });

  it("should skip auto-loading unstaged diff when skipAutoLoad is true", async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "is_git_repo") {
        return Promise.resolve(true);
      }
      if (cmd === "get_unstaged_diff") {
        return Promise.resolve({
          diff: "should not load",
          files: [],
        });
      }
      return Promise.reject("Unknown command");
    });

    const { result } = renderHook(() => useGit("/test/repo", true));

    await waitFor(() => {
      expect(result.current.isGitRepo).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith("is_git_repo", { path: "/test/repo" });
    expect(invoke).not.toHaveBeenCalledWith("get_unstaged_diff", expect.anything());
    expect(result.current.diffResult).toBeNull();
  });

  it("should auto-load unstaged diff when skipAutoLoad transitions from true to false", async () => {
    const mockDiffResult: GitDiffResult = {
      diff: "auto-loaded diff",
      files: [{ path: "file.ts", status: "modified" }],
    };

    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "is_git_repo") {
        return Promise.resolve(true);
      }
      if (cmd === "get_unstaged_diff") {
        return Promise.resolve(mockDiffResult);
      }
      return Promise.reject("Unknown command");
    });

    const { result, rerender } = renderHook(
      ({ skipAutoLoad }) => useGit("/test/repo", skipAutoLoad),
      { initialProps: { skipAutoLoad: true } }
    );

    await waitFor(() => {
      expect(result.current.isGitRepo).toBe(true);
    });

    expect(invoke).not.toHaveBeenCalledWith("get_unstaged_diff", expect.anything());

    // Transition skipAutoLoad to false (simulating initialModeResolved + no initialDiffMode)
    rerender({ skipAutoLoad: false });

    await waitFor(() => {
      expect(result.current.diffResult).toEqual(mockDiffResult);
    });
  });

  it("should handle diff load error", async () => {
    const errorMessage = "Failed to get diff";
    
    // Mock git repo check to avoid auto-loading
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === "is_git_repo") {
        return Promise.resolve(false);
      }
      return Promise.reject(errorMessage);
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useGit("/test/repo"));

    await waitFor(() => {
      expect(result.current.isGitRepo).toBe(false);
    });

    await act(async () => {
      await result.current.loadDiff({ mode: "unstaged" });
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
