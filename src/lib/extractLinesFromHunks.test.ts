import { describe, it, expect } from "vitest";
import { extractLinesFromHunks } from "./extractLinesFromHunks";

function insertChange(lineNumber: number, content: string) {
  return { type: "insert", isNormal: false, lineNumber, content };
}
function deleteChange(lineNumber: number, content: string) {
  return { type: "delete", isNormal: false, lineNumber, content };
}
function normalChange(oldLine: number, newLine: number, content: string) {
  return { isNormal: true, type: "normal", oldLineNumber: oldLine, newLineNumber: newLine, content };
}

const hunks = [
  {
    changes: [
      normalChange(1, 1, "line one"),
      deleteChange(2, "old line two"),
      insertChange(2, "new line two"),
      normalChange(3, 3, "line three"),
    ],
  },
];

describe("extractLinesFromHunks", () => {
  it("extracts single inserted line on new side", () => {
    expect(extractLinesFromHunks(hunks, 2, 2, "new")).toBe("new line two");
  });

  it("extracts single deleted line on old side", () => {
    expect(extractLinesFromHunks(hunks, 2, 2, "old")).toBe("old line two");
  });

  it("extracts range of lines on new side including context", () => {
    expect(extractLinesFromHunks(hunks, 1, 3, "new")).toBe("line one\nnew line two\nline three");
  });

  it("extracts range of lines on old side", () => {
    expect(extractLinesFromHunks(hunks, 1, 3, "old")).toBe("line one\nold line two\nline three");
  });

  it("returns undefined when no lines found in range", () => {
    expect(extractLinesFromHunks(hunks, 99, 100, "new")).toBeUndefined();
  });

  it("handles empty hunks array", () => {
    expect(extractLinesFromHunks([], 1, 1, "new")).toBeUndefined();
  });

  it("returns raw content without any marker prefix", () => {
    const result = extractLinesFromHunks(hunks, 2, 2, "new");
    expect(result).toBe("new line two");
  });
});
