import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMarkdownRenderer } from "./useMarkdownRenderer";

describe("useMarkdownRenderer", () => {
  it("returns null content for empty string", () => {
    const { result } = renderHook(() => useMarkdownRenderer(""));
    expect(result.current.content).toBeNull();
  });

  it("renders a simple paragraph", () => {
    const { result } = renderHook(() => useMarkdownRenderer("Hello world"));
    expect(result.current.content).not.toBeNull();
  });

  it("memoizes output for same input", () => {
    const { result, rerender } = renderHook(
      ({ md }) => useMarkdownRenderer(md),
      { initialProps: { md: "# Heading" } }
    );
    const first = result.current.content;
    rerender({ md: "# Heading" });
    expect(result.current.content).toBe(first);
  });

  it("re-renders when input changes", () => {
    const { result, rerender } = renderHook(
      ({ md }) => useMarkdownRenderer(md),
      { initialProps: { md: "# First" } }
    );
    const first = result.current.content;
    rerender({ md: "# Second" });
    expect(result.current.content).not.toBe(first);
  });
});
