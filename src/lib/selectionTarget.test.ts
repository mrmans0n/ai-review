import { describe, it, expect, afterEach } from "vitest";
import { getSelectionCommentTarget } from "./selectionTarget";

function makeElement(
  tag: string,
  attrs: Record<string, string> = {},
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function buildSplitRow(
  oldLine: number,
  newLine: number,
): {
  tr: HTMLElement;
  oldCode: HTMLElement;
  newCode: HTMLElement;
} {
  const tr = makeElement("tr", {
    class: `diff-line air-diff-old-line-${oldLine} air-diff-new-line-${newLine}`,
  });
  const oldGutter = makeElement("td", {
    "data-change-key": `N${oldLine}`,
    class: "diff-gutter",
  });
  const oldCode = makeElement("td", {
    "data-change-key": `N${oldLine}`,
    class: "diff-code",
  });
  const newGutter = makeElement("td", {
    "data-change-key": `N${oldLine}`,
    class: "diff-gutter",
  });
  const newCode = makeElement("td", {
    "data-change-key": `N${oldLine}`,
    class: "diff-code",
  });
  tr.append(oldGutter, oldCode, newGutter, newCode);
  return { tr, oldCode, newCode };
}

function buildDiffTable(file: string, rows: HTMLElement[]): HTMLElement {
  const wrapper = makeElement("div", { "data-diff-file": file });
  const table = makeElement("table", { class: "diff-split" });
  for (const row of rows) table.appendChild(row);
  wrapper.appendChild(table);
  document.body.appendChild(wrapper);
  return wrapper;
}

function makeSelection(
  anchorNode: Node,
  anchorOffset: number,
  focusNode: Node,
  focusOffset: number,
): Selection {
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  const range = document.createRange();
  range.setStart(anchorNode, anchorOffset);
  range.setEnd(focusNode, focusOffset);
  sel.addRange(range);
  return sel;
}

describe("getSelectionCommentTarget", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("returns correct range for same-side new selection", () => {
    const row1 = buildSplitRow(10, 12);
    const row2 = buildSplitRow(11, 13);
    row1.newCode.textContent = "line 12";
    row2.newCode.textContent = "line 13";
    buildDiffTable("file.ts", [row1.tr, row2.tr]);

    const sel = makeSelection(
      row1.newCode.firstChild!,
      0,
      row2.newCode.firstChild!,
      4,
    );
    const target = getSelectionCommentTarget(sel);

    expect(target).toEqual({
      file: "file.ts",
      startLine: 12,
      endLine: 13,
      side: "new",
    });
  });

  it("returns correct range for same-side old selection", () => {
    const row1 = buildSplitRow(10, 12);
    const row2 = buildSplitRow(11, 13);
    row1.oldCode.textContent = "old 10";
    row2.oldCode.textContent = "old 11";
    buildDiffTable("file.ts", [row1.tr, row2.tr]);

    const sel = makeSelection(
      row1.oldCode.firstChild!,
      0,
      row2.oldCode.firstChild!,
      4,
    );
    const target = getSelectionCommentTarget(sel);

    expect(target).toEqual({
      file: "file.ts",
      startLine: 10,
      endLine: 11,
      side: "old",
    });
  });

  it("normalizes cross-side selection to the anchor side", () => {
    const row1 = buildSplitRow(10, 12);
    const row2 = buildSplitRow(11, 13);
    row1.oldCode.textContent = "old 10";
    row2.newCode.textContent = "new 13";
    buildDiffTable("file.ts", [row1.tr, row2.tr]);

    // Select from old side to new side — should normalize to old
    const sel = makeSelection(
      row1.oldCode.firstChild!,
      0,
      row2.newCode.firstChild!,
      4,
    );
    const target = getSelectionCommentTarget(sel);

    expect(target).not.toBeNull();
    expect(target!.side).toBe("old");
    expect(target!.file).toBe("file.ts");
  });

  it("returns null for collapsed selection", () => {
    const row1 = buildSplitRow(10, 12);
    row1.newCode.textContent = "some code";
    buildDiffTable("file.ts", [row1.tr]);

    const sel = window.getSelection()!;
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(row1.newCode.firstChild!, 0);
    range.collapse(true);
    sel.addRange(range);

    expect(getSelectionCommentTarget(sel)).toBeNull();
  });

  it("returns null when selection is outside any diff area", () => {
    const div = document.createElement("div");
    div.textContent = "not in a diff";
    document.body.appendChild(div);

    const sel = makeSelection(div.firstChild!, 0, div.firstChild!, 5);
    expect(getSelectionCommentTarget(sel)).toBeNull();
  });

  it("returns single-line target when selection is within one line", () => {
    const row1 = buildSplitRow(10, 12);
    row1.newCode.textContent = "single line";
    buildDiffTable("file.ts", [row1.tr]);

    const sel = makeSelection(
      row1.newCode.firstChild!,
      0,
      row1.newCode.firstChild!,
      6,
    );
    const target = getSelectionCommentTarget(sel);

    expect(target).toEqual({
      file: "file.ts",
      startLine: 12,
      endLine: 12,
      side: "new",
    });
  });
});
