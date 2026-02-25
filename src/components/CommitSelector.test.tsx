import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommitSelector, fuzzyMatch } from "./CommitSelector";
import type { BranchInfo, CommitInfo, GgStackInfo, GgStackEntry, WorktreeInfo } from "../types";

describe("CommitSelector fuzzy search", () => {
  const testCommits: CommitInfo[] = [
    {
      hash: "abc123def456",
      short_hash: "abc123d",
      message: "Fix authentication bug in login page",
      author: "John Doe",
      date: "2 days ago",
      refs: "HEAD -> main, origin/main",
    },
    {
      hash: "def789ghi012",
      short_hash: "def789g",
      message: "Add user profile API endpoint",
      author: "Jane Smith",
      date: "3 days ago",
      refs: "feature/user-profile",
    },
  ];

  const testBranches: BranchInfo[] = [
    {
      name: "main",
      short_hash: "abc123d",
      subject: "Stabilize release",
      author: "John Doe",
      date: "1 day ago",
    },
    {
      name: "origin/feature/branch-selector",
      short_hash: "def789g",
      subject: "Add branch browsing",
      author: "Jane Smith",
      date: "3 hours ago",
    },
  ];

  it("should match commit by message", () => {
    const filtered = testCommits.filter((c) =>
      fuzzyMatch(`${c.message} ${c.hash} ${c.short_hash} ${c.author} ${c.refs}`, "fixauth")
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].message).toContain("Fix authentication");
  });

  it("should match commit by hash", () => {
    const filtered = testCommits.filter((c) =>
      fuzzyMatch(`${c.message} ${c.hash} ${c.short_hash} ${c.author} ${c.refs}`, "def789")
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].hash).toContain("def789");
  });

  it("should match commit by author", () => {
    const filtered = testCommits.filter((c) =>
      fuzzyMatch(`${c.message} ${c.hash} ${c.short_hash} ${c.author} ${c.refs}`, "jane")
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].author).toBe("Jane Smith");
  });

  it("should match branch by name", () => {
    const filtered = testBranches.filter((b) =>
      fuzzyMatch(`${b.name} ${b.short_hash} ${b.subject} ${b.author}`, "branchsel")
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toContain("branch-selector");
  });

  it("should match branch by subject", () => {
    const filtered = testBranches.filter((b) =>
      fuzzyMatch(`${b.name} ${b.short_hash} ${b.subject} ${b.author}`, "browse")
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].subject).toContain("browsing");
  });

  it("should return false when no match", () => {
    expect(fuzzyMatch("main abc123", "zzzz")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(fuzzyMatch("Jane Smith", "JANE")).toBe(true);
  });

  it("should match empty query", () => {
    expect(fuzzyMatch("anything", "")).toBe(true);
  });
});

describe("CommitSelector worktrees tab", () => {
  const makeProps = (overrides: Partial<Parameters<typeof CommitSelector>[0]> = {}) => ({
    isOpen: true,
    commits: [] as CommitInfo[],
    branches: [] as BranchInfo[],
    loading: false,
    hasGgStacks: false,
    ggStacks: [] as GgStackInfo[],
    hasWorktrees: false,
    worktrees: [] as WorktreeInfo[],
    ggStackEntries: [] as GgStackEntry[],
    selectedStack: null,
    onSelectCommit: vi.fn(),
    onSelectBranch: vi.fn(),
    onSelectStack: vi.fn(),
    onSelectStackEntry: vi.fn(),
    onSelectStackDiff: vi.fn(),
    onSelectWorktree: vi.fn(),
    onSelectRef: vi.fn(),
    onBackToStacks: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  });

  it("shows worktrees tab only when hasWorktrees is true and calls onSelectWorktree", () => {
    const onSelectWorktree = vi.fn();
    const worktrees: WorktreeInfo[] = [
      {
        path: "/Users/dev/repos/ai-review/wt-feature",
        branch: "feature/worktrees",
        commit_hash: "abc1234",
        is_main: false,
      },
    ];

    render(
      <CommitSelector
        {...makeProps({
          hasWorktrees: true,
          worktrees,
          onSelectWorktree,
        })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Worktrees" }));
    fireEvent.click(screen.getByText("feature/worktrees"));

    expect(onSelectWorktree).toHaveBeenCalledWith(worktrees[0]);
  });

  it("does not show worktrees tab when hasWorktrees is false", () => {
    render(<CommitSelector {...makeProps({ hasWorktrees: false, worktrees: [] })} />);
    expect(screen.queryByRole("button", { name: "Worktrees" })).not.toBeInTheDocument();
  });
});
