import { describe, expect, it } from "vitest";
import { buildTitlebarContext, getDiffScopeLabel, getRepoName } from "./titlebarContext";

describe("titlebarContext", () => {
  it("uses the last path segment as the repository name", () => {
    expect(getRepoName("/Users/nacho/repos/ai-review/")).toBe("ai-review");
    expect(getRepoName("C:\\Users\\nacho\\repos\\ai-review")).toBe("ai-review");
  });

  it("formats working tree scope labels", () => {
    expect(getDiffScopeLabel({ mode: "unstaged" })).toBe("Unstaged changes");
    expect(getDiffScopeLabel({ mode: "staged" })).toBe("Staged changes");
  });

  it("prefers selected commit context over generic scope", () => {
    expect(
      buildTitlebarContext({
        workingDir: "/tmp/ai-review",
        diffMode: { mode: "unstaged" },
        selectedCommit: {
          hash: "abc123456",
          short_hash: "abc1234",
          message: "Tighten diff layout",
          author: "Nacho",
          date: "2026-04-27",
          refs: "",
        },
        selectedBranch: null,
        reviewingLabel: null,
        activeFile: "src/App.tsx",
        changedFileCount: 2,
      })
    ).toEqual({
      repoName: "ai-review",
      primary: "abc1234",
      secondary: "Tighten diff layout",
      activeFile: "src/App.tsx",
      fileSummary: "2 files",
    });
  });
});
