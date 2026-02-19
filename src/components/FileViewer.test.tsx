import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileViewer } from "./FileViewer";
import type { Comment } from "../types";

// Mock highlight.js to avoid needing language grammars
vi.mock("highlight.js/lib/core", () => ({
  default: {
    highlight: (_code: string, _opts: any) => ({ value: _code }),
  },
}));

// Mock sub-components to simplify tests
vi.mock("./AddCommentForm", () => ({
  AddCommentForm: (props: any) => (
    <div data-testid="add-comment-form" data-file={props.file} data-start={props.startLine} data-end={props.endLine} />
  ),
}));
vi.mock("./CommentWidget", () => ({
  CommentWidget: (props: any) => (
    <div data-testid="comment-widget" data-comment-count={props.comments.length} />
  ),
}));

function makeProps(overrides: Partial<Parameters<typeof FileViewer>[0]> = {}) {
  const suppressNextClick = { current: false };
  return {
    fileName: "src/app.ts",
    content: "line one\nline two\nline three",
    language: "plaintext",
    isViewed: false,
    onToggleViewed: vi.fn(),
    onLineClick: vi.fn(),
    addingCommentAt: null,
    onAddComment: vi.fn(),
    onCancelComment: vi.fn(),
    comments: [] as Comment[],
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
    hoveredLine: null,
    onHoverLine: vi.fn(),
    lastFocusedLine: null,
    selectingRange: null,
    onStartSelectingRange: vi.fn(),
    selectedRange: null,
    onSelectedRangeChange: vi.fn(),
    hoveredCommentIds: null,
    onHoverCommentIds: vi.fn(),
    onShiftClickLine: vi.fn(),
    suppressNextClick,
    searchQuery: "",
    ...overrides,
  };
}

describe("FileViewer", () => {
  describe("data attributes", () => {
    it("renders data-file-viewer on root element", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      const root = container.querySelector("[data-file-viewer='src/app.ts']");
      expect(root).toBeTruthy();
    });

    it("renders data-line-number and data-line-side on each line", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      const lineEls = container.querySelectorAll("[data-line-number]");
      expect(lineEls.length).toBe(3);
      expect(lineEls[0].getAttribute("data-line-number")).toBe("1");
      expect(lineEls[0].getAttribute("data-line-side")).toBe("new");
      expect(lineEls[2].getAttribute("data-line-number")).toBe("3");
    });
  });

  describe("gutter click", () => {
    it("calls onLineClick on gutter click", () => {
      const props = makeProps();
      render(<FileViewer {...props} />);
      // The gutter elements have title="Click to add comment"
      const gutters = screen.getAllByTitle("Click to add comment");
      fireEvent.click(gutters[1]); // click line 2
      expect(props.onLineClick).toHaveBeenCalledWith("src/app.ts", 2, "new");
    });

    it("calls onShiftClickLine on shift+click with lastFocusedLine", () => {
      const props = makeProps({
        lastFocusedLine: { file: "src/app.ts", line: 1, side: "new" },
      });
      render(<FileViewer {...props} />);
      const gutters = screen.getAllByTitle("Click to add comment");
      fireEvent.click(gutters[2], { shiftKey: true }); // shift+click line 3
      expect(props.onShiftClickLine).toHaveBeenCalledWith("src/app.ts", 1, 3, "new");
    });

    it("suppressNextClick prevents click from firing", () => {
      const suppressNextClick = { current: true };
      const props = makeProps({ suppressNextClick });
      render(<FileViewer {...props} />);
      const gutters = screen.getAllByTitle("Click to add comment");
      fireEvent.click(gutters[0]);
      expect(props.onLineClick).not.toHaveBeenCalled();
      expect(suppressNextClick.current).toBe(false);
    });
  });

  describe("mouseDown starts drag selection", () => {
    it("calls onStartSelectingRange and onSelectedRangeChange on mouseDown", () => {
      const props = makeProps();
      render(<FileViewer {...props} />);
      const gutters = screen.getAllByTitle("Click to add comment");
      fireEvent.mouseDown(gutters[1]); // mouseDown on line 2
      expect(props.onStartSelectingRange).toHaveBeenCalledWith({
        file: "src/app.ts",
        startLine: 2,
        side: "new",
      });
      expect(props.onSelectedRangeChange).toHaveBeenCalledWith({
        file: "src/app.ts",
        startLine: 2,
        endLine: 2,
        side: "new",
      });
    });
  });

  describe("line highlighting", () => {
    it("highlights lines within selectedRange", () => {
      const props = makeProps({
        selectedRange: {
          file: "src/app.ts",
          startLine: 1,
          endLine: 2,
          side: "new",
        },
      });
      const { container } = render(<FileViewer {...props} />);
      // Lines 1 and 2 should have the highlight class, line 3 should not
      const lineRows = container.querySelectorAll("[data-line-number]");
      // The flex row is the first child div of each line
      const row1 = lineRows[0].querySelector(".flex");
      const row2 = lineRows[1].querySelector(".flex");
      const row3 = lineRows[2].querySelector(".flex");
      expect(row1?.className).toContain("bg-blue-900/20");
      expect(row2?.className).toContain("bg-blue-900/20");
      expect(row3?.className).not.toContain("bg-blue-900/20");
    });

    it("highlights lines matching hovered comment", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          file: "src/app.ts",
          startLine: 2,
          endLine: 3,
          side: "new",
          text: "fix this",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      const props = makeProps({
        comments,
        hoveredCommentIds: ["c1"],
      });
      const { container } = render(<FileViewer {...props} />);
      const lineRows = container.querySelectorAll("[data-line-number]");
      const row1 = lineRows[0].querySelector(".flex");
      const row2 = lineRows[1].querySelector(".flex");
      const row3 = lineRows[2].querySelector(".flex");
      expect(row1?.className).not.toContain("bg-blue-900/20");
      expect(row2?.className).toContain("bg-blue-900/20");
      expect(row3?.className).toContain("bg-blue-900/20");
    });
  });

  describe("comment hover", () => {
    it("sets hoveredCommentIds on comment widget mouseEnter/mouseLeave", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          file: "src/app.ts",
          startLine: 1,
          endLine: 1,
          side: "new",
          text: "hello",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      const props = makeProps({ comments });
      render(<FileViewer {...props} />);
      const widget = screen.getByTestId("comment-widget").parentElement!;
      fireEvent.mouseEnter(widget);
      expect(props.onHoverCommentIds).toHaveBeenCalledWith(["c1"]);
      fireEvent.mouseLeave(widget);
      expect(props.onHoverCommentIds).toHaveBeenCalledWith(null);
    });
  });

  describe("gutter hover icon", () => {
    it("shows comment icon when hoveredLine matches", () => {
      const props = makeProps({
        hoveredLine: { file: "src/app.ts", line: 2, side: "new" },
      });
      const { container } = render(<FileViewer {...props} />);
      // The blue circle icon should appear for line 2
      const icons = container.querySelectorAll("span.rounded-full");
      expect(icons.length).toBe(1);
      // Verify it's on line 2 by checking parent
      const lineEl = icons[0].closest("[data-line-number]");
      expect(lineEl?.getAttribute("data-line-number")).toBe("2");
    });
  });

  describe("add comment form placement", () => {
    it("shows add comment form at endLine", () => {
      const props = makeProps({
        addingCommentAt: {
          file: "src/app.ts",
          startLine: 1,
          endLine: 2,
          side: "new",
        },
      });
      render(<FileViewer {...props} />);
      const form = screen.getByTestId("add-comment-form");
      expect(form.getAttribute("data-start")).toBe("1");
      expect(form.getAttribute("data-end")).toBe("2");
      // Form should appear after line 2 (the endLine)
      const lineEl = form.closest("[data-line-number]");
      expect(lineEl?.getAttribute("data-line-number")).toBe("2");
    });
  });
});
