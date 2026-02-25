import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "./useSearch";

describe("useSearch", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();

    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: vi.fn(),
        writable: true,
      });
    } else {
      vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
    }
  });

  it("opens with Cmd/Ctrl+F and prevents native search", () => {
    const { result } = renderHook(() => useSearch());
    const preventDefault = vi.fn();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
      }));
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true });
      Object.defineProperty(event, "preventDefault", { value: preventDefault });
      window.dispatchEvent(event);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it("marks matches in visible code cells and navigates", () => {
    document.body.innerHTML = `
      <div class="diff-code">const value = 1;</div>
      <div class="diff-code">const another = value + 2;</div>
      <div style="display:none" class="diff-code">value should not match</div>
    `;

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.open();
      result.current.setQuery("value");
    });

    expect(result.current.matches).toHaveLength(2);
    expect(document.querySelectorAll("mark.search-match")).toHaveLength(2);
    expect(document.querySelectorAll("mark.search-match-current")).toHaveLength(1);
    expect(result.current.currentMatchIndex).toBe(0);

    act(() => {
      result.current.next();
    });

    expect(result.current.currentMatchIndex).toBe(1);

    act(() => {
      result.current.prev();
    });

    expect(result.current.currentMatchIndex).toBe(0);
  });

  it("marks matches that span across nested elements", () => {
    document.body.innerHTML = `
      <div class="diff-code"><span>val</span><span>ue</span> + another value</div>
    `;

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.open();
      result.current.setQuery("value");
    });

    expect(result.current.matches).toHaveLength(2);
    expect(document.querySelectorAll("mark.search-match")).toHaveLength(2);
  });

  it("closes with Escape and clears matches", () => {
    document.body.innerHTML = `<div class="diff-code">const value = 1;</div>`;

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.open();
      result.current.setQuery("value");
    });

    expect(result.current.matches).toHaveLength(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe("");
    expect(document.querySelectorAll("mark.search-match")).toHaveLength(0);
  });
});
