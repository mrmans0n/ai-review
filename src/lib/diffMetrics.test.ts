import { describe, expect, it } from "vitest";
import {
  DIFF_FILE_HEADER_HEIGHT,
  DIFF_HUNK_SEPARATOR_HEIGHT,
  DIFF_LINE_HEIGHT,
  estimateFileHeight,
} from "./diffMetrics";

describe("estimateFileHeight", () => {
  it("returns just header height for a file with no hunks", () => {
    const file = { hunks: [] };
    expect(estimateFileHeight(file)).toBe(DIFF_FILE_HEADER_HEIGHT);
  });

  it("sums change-line height across all hunks", () => {
    const file = {
      hunks: [
        { changes: new Array(10).fill({}) },
        { changes: new Array(5).fill({}) },
      ],
    };
    expect(estimateFileHeight(file)).toBe(
      DIFF_FILE_HEADER_HEIGHT + 15 * DIFF_LINE_HEIGHT + DIFF_HUNK_SEPARATOR_HEIGHT
    );
  });

  it("adds one separator between each pair of hunks (n-1 separators)", () => {
    const file = {
      hunks: [
        { changes: new Array(2).fill({}) },
        { changes: new Array(2).fill({}) },
        { changes: new Array(2).fill({}) },
      ],
    };
    expect(estimateFileHeight(file)).toBe(
      DIFF_FILE_HEADER_HEIGHT + 6 * DIFF_LINE_HEIGHT + 2 * DIFF_HUNK_SEPARATOR_HEIGHT
    );
  });

  it("falls back to header height when hunks is missing", () => {
    expect(estimateFileHeight({})).toBe(DIFF_FILE_HEADER_HEIGHT);
    expect(estimateFileHeight(null)).toBe(DIFF_FILE_HEADER_HEIGHT);
  });
});
