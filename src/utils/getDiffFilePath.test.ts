import { describe, expect, it } from "vitest";
import { getDiffFilePath } from "./getDiffFilePath";

describe("getDiffFilePath", () => {
  it("returns newPath for a modified file", () => {
    expect(getDiffFilePath({ newPath: "src/App.tsx", oldPath: "src/App.tsx" })).toBe("src/App.tsx");
  });

  it("returns newPath for a newly added file", () => {
    expect(getDiffFilePath({ newPath: "src/new.ts", oldPath: "/dev/null" })).toBe("src/new.ts");
  });

  it("returns oldPath for a deleted file where newPath is /dev/null", () => {
    expect(getDiffFilePath({ newPath: "/dev/null", oldPath: "src/removed.ts" })).toBe("src/removed.ts");
  });

  it("returns oldPath for a renamed file when newPath is missing", () => {
    expect(getDiffFilePath({ oldPath: "src/old-name.ts" })).toBe("src/old-name.ts");
  });

  it("returns newPath for a renamed file", () => {
    expect(getDiffFilePath({ newPath: "src/new-name.ts", oldPath: "src/old-name.ts" })).toBe("src/new-name.ts");
  });

  it("returns empty string when both paths are missing", () => {
    expect(getDiffFilePath({})).toBe("");
  });
});
