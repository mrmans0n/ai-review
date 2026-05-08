import { describe, expect, it } from "vitest";
import { parseDiffSafely } from "./parseDiffSafely";

describe("parseDiffSafely", () => {
  it("does not throw on multiple combined binary conflict diffs", () => {
    const diff = [
      "diff --cc screenshots/first.png",
      "index 1111111111,2222222222..0000000000",
      "Binary files differ",
      "diff --cc screenshots/second.png",
      "index 3333333333,4444444444..0000000000",
      "Binary files differ",
      "",
    ].join("\n");

    expect(parseDiffSafely(diff)).toEqual([]);
  });

  it("preserves normal text diffs", () => {
    const diff = [
      "diff --git a/src/app.ts b/src/app.ts",
      "index 1111111..2222222 100644",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -1,1 +1,1 @@",
      "-old",
      "+new",
      "",
    ].join("\n");

    const files = parseDiffSafely(diff);

    expect(files).toHaveLength(1);
    expect(files[0].oldPath).toBe("src/app.ts");
    expect(files[0].newPath).toBe("src/app.ts");
    expect(files[0].hunks).toHaveLength(1);
  });
});
