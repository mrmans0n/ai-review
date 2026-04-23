import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMarkdownRenderer } from "./useMarkdownRenderer";

describe("useMarkdownRenderer", () => {
  it("returns a React element tree for valid markdown", () => {
    const { result } = renderHook(() => useMarkdownRenderer("# Hello\n\nWorld"));
    expect(result.current.content).not.toBeNull();
  });

  it("returns a valid element for empty content", () => {
    const { result } = renderHook(() => useMarkdownRenderer(""));
    expect(result.current.content).not.toBeNull();
  });

  it("memoizes the result for the same input", () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownRenderer(content),
      { initialProps: { content: "# Same" } }
    );
    const first = result.current;
    rerender({ content: "# Same" });
    expect(result.current).toBe(first);
  });

  it("recomputes when content changes", () => {
    const { result, rerender } = renderHook(
      ({ content }) => useMarkdownRenderer(content),
      { initialProps: { content: "# First" } }
    );
    const first = result.current;
    rerender({ content: "# Second" });
    expect(result.current).not.toBe(first);
  });
});
