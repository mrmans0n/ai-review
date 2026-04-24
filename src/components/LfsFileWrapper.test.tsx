import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LfsFileWrapper } from "./LfsFileWrapper";
import type { Comment, DiffModeConfig, CommitInfo, BranchInfo } from "../types";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

function makeChange(type: string, content: string) {
  return { type, content, isNormal: type === "normal" };
}

const lfsHunks = [
  {
    changes: [
      makeChange("insert", "+version https://git-lfs.github.com/spec/v1"),
      makeChange("insert", "+oid sha256:abc123"),
      makeChange("insert", "+size 12345"),
    ],
  },
];

const baseProps = {
  fileName: "test.png",
  fileStatus: "added",
  hunks: lfsHunks,
  workingDir: "/repo",
  diffMode: { mode: "unstaged" } as DiffModeConfig,
  selectedCommit: null as CommitInfo | null,
  selectedBranch: null as BranchInfo | null,
  comments: [] as Comment[],
  onAddComment: vi.fn(),
  onEditComment: vi.fn(),
  onDeleteComment: vi.fn(),
  editingCommentId: null as string | null,
  onStartEditComment: vi.fn(),
  onStopEditComment: vi.fn(),
};

describe("LfsFileWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collapsible LFS metadata section", () => {
    render(<LfsFileWrapper {...baseProps} />);
    expect(screen.getByText(/LFS pointer metadata/i)).toBeInTheDocument();
  });

  it("renders add comment button for whole-file comments", () => {
    render(<LfsFileWrapper {...baseProps} />);
    expect(screen.getByText(/Add comment/i)).toBeInTheDocument();
  });

  it("renders existing whole-file comments", () => {
    const comments: Comment[] = [
      {
        id: "c1",
        file: "test.png",
        startLine: 0,
        endLine: 0,
        side: "new",
        text: "This image looks great",
        createdAt: "2026-01-01",
      },
    ];
    render(<LfsFileWrapper {...baseProps} comments={comments} />);
    expect(screen.getByText("This image looks great")).toBeInTheDocument();
  });
});
