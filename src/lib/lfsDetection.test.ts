import { describe, it, expect } from "vitest";
import { detectLfsPointer, isTextPreviewable } from "./lfsDetection";

const SAMPLE_OID = "a" + "b".repeat(62) + "c";

function makeLfsHunks(side: "insert" | "delete" | "normal") {
  const lines = [
    "version https://git-lfs.github.com/spec/v1",
    `oid sha256:${SAMPLE_OID}`,
    "size 12345",
  ];
  return [
    {
      changes: lines.map((content) => ({
        content,
        isInsert: side === "insert",
        isDelete: side === "delete",
        isNormal: side === "normal",
      })),
    },
  ];
}

describe("detectLfsPointer", () => {
  it("returns null for empty hunks", () => {
    expect(detectLfsPointer([])).toBeNull();
  });

  it("returns null for non-LFS content", () => {
    const hunks = [
      {
        changes: [
          { content: "const x = 1;", isInsert: true, isDelete: false, isNormal: false },
          { content: "const y = 2;", isInsert: true, isDelete: false, isNormal: false },
        ],
      },
    ];
    expect(detectLfsPointer(hunks)).toBeNull();
  });

  it("detects LFS pointer in insert changes", () => {
    const result = detectLfsPointer(makeLfsHunks("insert"));
    expect(result).not.toBeNull();
    expect(result!.oid).toBe(SAMPLE_OID);
    expect(result!.size).toBe(12345);
  });

  it("detects LFS pointer in delete changes", () => {
    const result = detectLfsPointer(makeLfsHunks("delete"));
    expect(result).not.toBeNull();
    expect(result!.oid).toBe(SAMPLE_OID);
  });

  it("detects LFS pointer in normal (context) changes", () => {
    const result = detectLfsPointer(makeLfsHunks("normal"));
    expect(result).not.toBeNull();
    expect(result!.size).toBe(12345);
  });

  it("returns null when LFS pointer text is embedded in larger content", () => {
    const hunks = [
      {
        changes: [
          { content: "Here is a sample LFS pointer:", isInsert: true, isDelete: false, isNormal: false },
          { content: "version https://git-lfs.github.com/spec/v1", isInsert: true, isDelete: false, isNormal: false },
          { content: `oid sha256:${SAMPLE_OID}`, isInsert: true, isDelete: false, isNormal: false },
          { content: "size 12345", isInsert: true, isDelete: false, isNormal: false },
          { content: "End of sample.", isInsert: true, isDelete: false, isNormal: false },
        ],
      },
    ];
    expect(detectLfsPointer(hunks)).toBeNull();
  });

  it("returns null for partial LFS pointer", () => {
    const hunks = [
      {
        changes: [
          { content: "version https://git-lfs.github.com/spec/v1", isInsert: true, isDelete: false, isNormal: false },
          { content: "oid sha256:abc", isInsert: true, isDelete: false, isNormal: false },
        ],
      },
    ];
    expect(detectLfsPointer(hunks)).toBeNull();
  });
});

describe("isTextPreviewable", () => {
  it("returns true for common code extensions", () => {
    expect(isTextPreviewable("app.ts")).toBe(true);
    expect(isTextPreviewable("main.py")).toBe(true);
    expect(isTextPreviewable("lib.rs")).toBe(true);
    expect(isTextPreviewable("index.js")).toBe(true);
  });

  it("returns true for text and markdown", () => {
    expect(isTextPreviewable("README.md")).toBe(true);
    expect(isTextPreviewable("notes.txt")).toBe(true);
  });

  it("returns false for image extensions", () => {
    expect(isTextPreviewable("logo.png")).toBe(false);
    expect(isTextPreviewable("photo.jpg")).toBe(false);
  });

  it("returns false for binary extensions", () => {
    expect(isTextPreviewable("doc.pdf")).toBe(false);
    expect(isTextPreviewable("archive.zip")).toBe(false);
  });

  it("returns false for missing extension", () => {
    expect(isTextPreviewable("")).toBe(false);
  });

  it("returns true for known extensionless filenames", () => {
    expect(isTextPreviewable("Dockerfile")).toBe(true);
    expect(isTextPreviewable("Makefile")).toBe(true);
  });

  it("handles paths with directories", () => {
    expect(isTextPreviewable("src/components/App.tsx")).toBe(true);
    expect(isTextPreviewable("assets/images/logo.png")).toBe(false);
  });
});
