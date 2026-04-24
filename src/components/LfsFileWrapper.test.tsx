import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LfsFileWrapper } from "./LfsFileWrapper";

vi.mock("highlight.js/lib/core", () => ({
  default: {
    highlight: (_code: string, _opts: any) => ({ value: _code }),
  },
}));

function makeProps(overrides: Partial<Parameters<typeof LfsFileWrapper>[0]> = {}) {
  return {
    fileName: "assets/logo.png",
    fileType: "modify",
    lfsPointer: { oid: "a".repeat(64), size: 102400 },
    hunks: [
      {
        changes: [
          {
            content: "version https://git-lfs.github.com/spec/v1",
            isInsert: true,
            isDelete: false,
            isNormal: false,
          },
        ],
      },
    ],
    isViewed: false,
    onToggleViewed: vi.fn(),
    previewMode: "unsupported" as const,
    oldImageSrc: null,
    newImageSrc: null,
    imageLoading: false,
    imageError: null,
    oldTextContent: null,
    newTextContent: null,
    textLoading: false,
    textError: null,
    language: "plaintext",
    status: "modified",
    comments: [],
    onAddComment: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
    ...overrides,
  };
}

describe("LfsFileWrapper", () => {
  it("shows LFS badge in header", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    expect(screen.getByText("LFS")).toBeTruthy();
  });

  it("shows file status label for modify type", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    expect(screen.getByText(/Modified:/)).toBeTruthy();
  });

  it("shows file status label for add type", () => {
    render(<LfsFileWrapper {...makeProps({ fileType: "add" })} />);
    expect(screen.getByText(/Added:/)).toBeTruthy();
  });

  it("shows file size from lfsPointer", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    expect(screen.getByText("100.0 KB")).toBeTruthy();
  });

  it("hides content when isViewed is true", () => {
    render(<LfsFileWrapper {...makeProps({ isViewed: true })} />);
    expect(screen.queryByText("Binary LFS file")).toBeNull();
  });

  it("shows unsupported placeholder for unknown types", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    expect(screen.getByText(/Binary LFS file/)).toBeTruthy();
  });

  it("shows Comment button that toggles add comment form", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    const commentBtn = screen.getByText("Comment");
    fireEvent.click(commentBtn);
    expect(screen.getByPlaceholderText(/Enter your comment/)).toBeTruthy();
  });

  it("shows collapsible pointer metadata section", () => {
    render(<LfsFileWrapper {...makeProps()} />);
    expect(screen.getByText("LFS pointer metadata")).toBeTruthy();
  });

  it("renders text preview when previewMode is text", () => {
    render(
      <LfsFileWrapper
        {...makeProps({
          previewMode: "text",
          newTextContent: "hello world",
          textLoading: false,
          status: "added",
        })}
      />
    );
    expect(screen.getByText("hello world")).toBeTruthy();
  });
});
