import { describe, it, expect } from "vitest";
import { isLfsPointerDiff, isWholeFileComment } from "./lfsDetection";

function makeChange(type: string, content: string) {
  return { type, content, isNormal: type === "normal" };
}

const lfsAddHunks = [
  {
    changes: [
      makeChange("insert", "+version https://git-lfs.github.com/spec/v1"),
      makeChange("insert", "+oid sha256:abc123"),
      makeChange("insert", "+size 12345"),
    ],
  },
];

const lfsModifyHunks = [
  {
    changes: [
      makeChange("delete", "-version https://git-lfs.github.com/spec/v1"),
      makeChange("delete", "-oid sha256:old123"),
      makeChange("delete", "-size 1000"),
      makeChange("insert", "+version https://git-lfs.github.com/spec/v1"),
      makeChange("insert", "+oid sha256:new456"),
      makeChange("insert", "+size 2000"),
    ],
  },
];

const regularHunks = [
  {
    changes: [
      makeChange("normal", " import React from 'react';"),
      makeChange("delete", "-const old = true;"),
      makeChange("insert", "+const new = false;"),
    ],
  },
];

describe("isLfsPointerDiff", () => {
  it("detects LFS pointer in added file hunks", () => {
    expect(isLfsPointerDiff(lfsAddHunks)).toBe(true);
  });

  it("detects LFS pointer in modified file hunks", () => {
    expect(isLfsPointerDiff(lfsModifyHunks)).toBe(true);
  });

  it("returns false for regular code hunks", () => {
    expect(isLfsPointerDiff(regularHunks)).toBe(false);
  });

  it("returns false for empty hunks", () => {
    expect(isLfsPointerDiff([])).toBe(false);
  });
});

describe("isWholeFileComment", () => {
  it("returns true for (0, 0) sentinel", () => {
    expect(
      isWholeFileComment({
        id: "1",
        file: "test.png",
        startLine: 0,
        endLine: 0,
        side: "new" as const,
        text: "looks good",
        createdAt: "2026-01-01",
      })
    ).toBe(true);
  });

  it("returns false for normal line range", () => {
    expect(
      isWholeFileComment({
        id: "2",
        file: "test.ts",
        startLine: 1,
        endLine: 5,
        side: "new" as const,
        text: "fix this",
        createdAt: "2026-01-01",
      })
    ).toBe(false);
  });
});
