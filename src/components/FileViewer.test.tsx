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
    <div
      data-testid="add-comment-form"
      data-file={props.file}
      data-start={props.startLine}
      data-end={props.endLine}
      data-prefilled={props.prefilledCode ?? ""}
    />
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
    onFileCommentClick: vi.fn(),
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

    it("keeps the file header sticky below the app titlebar", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      const header = container.querySelector("[data-file-viewer='src/app.ts'] > div");
      expect(header?.className).toContain("sticky");
      expect(header?.className).toContain("top-9");
      expect(header?.className).toContain("z-10");
    });

    it("renders data-line-number, data-line-side, and comment anchors on each line", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      const lineEls = container.querySelectorAll("[data-line-number]");
      expect(lineEls.length).toBe(3);
      expect(lineEls[0].getAttribute("data-line-number")).toBe("1");
      expect(lineEls[0].getAttribute("data-line-side")).toBe("new");
      expect(lineEls[0].getAttribute("data-comment-file")).toBe("src/app.ts");
      expect(lineEls[0].getAttribute("data-comment-line")).toBe("1");
      expect(lineEls[0].getAttribute("data-comment-side")).toBe("new");
      expect(lineEls[2].getAttribute("data-line-number")).toBe("3");
    });

    it("renders a file-level comment anchor", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      expect(container.querySelector("[data-comment-file-anchor='src/app.ts']")).toBeTruthy();
    });
  });

  describe("sticky header material", () => {
    it("uses translucent backdrop blur while preserving contrast for unviewed files", () => {
      const props = makeProps();
      const { container } = render(<FileViewer {...props} />);
      const header = container.querySelector(".sticky.top-9");

      expect(header?.className).toContain("bg-canvas/85");
      expect(header?.className).toContain("backdrop-blur-xl");
    });

    it("keeps the viewed header translucent and clickable", () => {
      const props = makeProps({ isViewed: true });
      const { container } = render(<FileViewer {...props} />);
      const header = container.querySelector(".sticky.top-9");

      expect(header?.className).toContain("bg-canvas/70");
      expect(header?.className).toContain("backdrop-blur-xl");
      expect(header?.className).toContain("cursor-pointer");
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
      expect(row1?.className).toContain("bg-ctp-blue/10");
      expect(row2?.className).toContain("bg-ctp-blue/10");
      expect(row3?.className).not.toContain("bg-ctp-blue/10");
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
      expect(row1?.className).not.toContain("bg-ctp-blue/10");
      expect(row2?.className).toContain("bg-ctp-blue/10");
      expect(row3?.className).toContain("bg-ctp-blue/10");
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

  describe("file-level comments", () => {
    it("calls onFileCommentClick from the header comment action", () => {
      const props = makeProps();
      render(<FileViewer {...props} />);
      fireEvent.click(screen.getByText("Comment"));
      expect(props.onFileCommentClick).toHaveBeenCalledWith("src/app.ts");
    });

    it("shows whole-file add comment form without attaching it to line zero", () => {
      const props = makeProps({
        addingCommentAt: {
          file: "src/app.ts",
          startLine: 0,
          endLine: 0,
          side: "new",
        },
      });
      const { container } = render(<FileViewer {...props} />);
      const form = screen.getByTestId("add-comment-form");
      expect(form.getAttribute("data-start")).toBe("0");
      expect(form.getAttribute("data-end")).toBe("0");
      expect(container.querySelector("[data-line-number='0']")).toBeNull();
      expect(form.closest("[data-line-number]")).toBeNull();
    });

    it("does not render whole-file comments as line comments", () => {
      const comments: Comment[] = [
        {
          id: "c-file",
          file: "src/app.ts",
          startLine: 0,
          endLine: 0,
          side: "new",
          text: "file comment",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      const { container } = render(<FileViewer {...makeProps({ comments })} />);
      expect(screen.getByTestId("comment-widget").getAttribute("data-comment-count")).toBe("1");
      expect(container.querySelector("[data-line-number='0']")).toBeNull();
      expect(screen.getByTestId("comment-widget").closest("[data-line-number]")).toBeNull();
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

    it("passes selected lines as prefilledCode to AddCommentForm", () => {
      // content: "line one\nline two\nline three" — startLine=2, endLine=3
      const props = makeProps({
        addingCommentAt: {
          file: "src/app.ts",
          startLine: 2,
          endLine: 3,
          side: "new",
        },
      });
      render(<FileViewer {...props} />);
      const form = screen.getByTestId("add-comment-form");
      expect(form.getAttribute("data-prefilled")).toBe("line two\nline three");
    });
  });
});
