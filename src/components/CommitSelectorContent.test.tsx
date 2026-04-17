import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommitSelectorContent, CommitSelectorContentProps } from "./CommitSelectorContent";
import type { CommitInfo, BranchInfo, GgStackInfo, GgStackEntry, WorktreeInfo } from "../types";

const makeProps = (overrides: Partial<CommitSelectorContentProps> = {}): CommitSelectorContentProps => ({
  commits: [
    {
      hash: "abc123def456",
      short_hash: "abc123d",
      message: "Test commit",
      author: "Dev",
      date: "today",
      refs: "HEAD -> main",
    },
  ] as CommitInfo[],
  branches: [
    {
      name: "main",
      short_hash: "abc123d",
      subject: "Latest",
      author: "Dev",
      date: "today",
    },
  ] as BranchInfo[],
  loading: false,
  hasGgStacks: false,
  ggStacks: [] as GgStackInfo[],
  hasWorktrees: false,
  worktrees: [] as WorktreeInfo[],
  ggStackEntries: [] as GgStackEntry[],
  selectedStack: null,
  onSelectCommit: vi.fn(),
  onSelectRange: vi.fn(),
  onSelectBranch: vi.fn(),
  onSelectStack: vi.fn(),
  onSelectStackEntry: vi.fn(),
  onSelectStackDiff: vi.fn(),
  onSelectWorktree: vi.fn(),
  onSelectRef: vi.fn(),
  refError: null,
  onBackToStacks: vi.fn(),
  variant: "inline",
  ...overrides,
});

describe("CommitSelectorContent", () => {
  describe("inline variant", () => {
    it("does not render the 'Select Commit' header", () => {
      render(<CommitSelectorContent {...makeProps()} />);
      expect(screen.queryByText("Select Commit")).not.toBeInTheDocument();
    });

    it("renders commits list", () => {
      render(<CommitSelectorContent {...makeProps()} />);
      expect(screen.getByText("Test commit")).toBeInTheDocument();
    });

    it("calls onSelectCommit when a commit is clicked", () => {
      const onSelectCommit = vi.fn();
      render(<CommitSelectorContent {...makeProps({ onSelectCommit })} />);
      fireEvent.click(screen.getByText("Test commit"));
      expect(onSelectCommit).toHaveBeenCalled();
    });

    it("shows loading state", () => {
      render(<CommitSelectorContent {...makeProps({ loading: true })} />);
      expect(screen.getByText("Loading commits...")).toBeInTheDocument();
    });

    it("switches to branches tab and shows branches", () => {
      render(<CommitSelectorContent {...makeProps()} />);
      fireEvent.click(screen.getByText("Branches"));
      expect(screen.getByText("main")).toBeInTheDocument();
    });
  });

  describe("modal variant", () => {
    it("renders the 'Select Commit' header", () => {
      render(<CommitSelectorContent {...makeProps({ variant: "modal" })} />);
      expect(screen.getByText("Select Commit")).toBeInTheDocument();
    });
  });
});
