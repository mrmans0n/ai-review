import { describe, it, expect } from "vitest";
import { parseLaunchArgs } from "./argv";

describe("parseLaunchArgs", () => {
  it("returns defaults for an empty argv", () => {
    const out = parseLaunchArgs([], "/home/me");
    expect(out.workingDir).toBe("/home/me");
    expect(out.waitMode).toBe(false);
    expect(out.jsonOutput).toBe(false);
    expect(out.initialDiffMode).toBeNull();
    expect(out.feedbackPipe).toBeNull();
  });

  it("parses --wait-mode and --json-output", () => {
    const out = parseLaunchArgs(["--wait-mode", "--json-output"], "/home/me");
    expect(out.waitMode).toBe(true);
    expect(out.jsonOutput).toBe(true);
  });

  it("parses --diff-commit", () => {
    const out = parseLaunchArgs(["--diff-commit", "HEAD~2"], "/home/me");
    expect(out.initialDiffMode).toEqual({ type: "commit", value: "HEAD~2" });
  });

  it("parses --diff-range and --diff-branch", () => {
    const a = parseLaunchArgs(["--diff-range", "abc..def"], "/home/me");
    expect(a.initialDiffMode).toEqual({ type: "range", value: "abc..def" });
    const b = parseLaunchArgs(["--diff-branch", "main"], "/home/me");
    expect(b.initialDiffMode).toEqual({ type: "branch", value: "main" });
  });

  it("uses positional arg as working directory", () => {
    const out = parseLaunchArgs(["/repos/foo"], "/home/me");
    expect(out.workingDir).toBe("/repos/foo");
  });

  it("captures --feedback-pipe path", () => {
    const out = parseLaunchArgs(
      ["--wait-mode", "--feedback-pipe", "/tmp/x.txt"],
      "/home/me",
    );
    expect(out.feedbackPipe).toBe("/tmp/x.txt");
  });
});
