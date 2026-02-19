import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWordHighlight } from "./useWordHighlight";

describe("useWordHighlight", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("highlights an exact case-sensitive word on double click and clears on single click", () => {
    document.body.innerHTML = `
      <div class="diff-code">const value = 1; const valueX = value + VALUE;</div>
      <div class="diff-code-cell">value should match here too</div>
    `;

    renderHook(() => useWordHighlight(false));

    const firstCell = document.querySelector(".diff-code") as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = firstCell.firstChild as Text;
    const start = textNode.textContent!.indexOf("value");
    range.setStart(textNode, start);
    range.setEnd(textNode, start + "value".length);
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      firstCell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    const marks = document.querySelectorAll("mark.word-highlight");
    expect(marks).toHaveLength(3);
    expect(Array.from(marks).every((m) => m.textContent === "value")).toBe(true);

    act(() => {
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelectorAll("mark.word-highlight")).toHaveLength(0);
  });

  it("does nothing for invalid selections and when search is active", () => {
    document.body.innerHTML = `<div class="diff-code">const value = another value</div>`;

    const { rerender } = renderHook(({ active }) => useWordHighlight(active), {
      initialProps: { active: false },
    });

    const cell = document.querySelector(".diff-code") as HTMLElement;

    act(() => {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(cell);
      selection?.addRange(range);
      cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(document.querySelectorAll("mark.word-highlight")).toHaveLength(0);

    rerender({ active: true });

    act(() => {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      const range = document.createRange();
      const textNode = cell.firstChild as Text;
      const start = textNode.textContent!.indexOf("value");
      range.setStart(textNode, start);
      range.setEnd(textNode, start + "value".length);
      selection?.addRange(range);
      cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    expect(document.querySelectorAll("mark.word-highlight")).toHaveLength(0);
  });
});
