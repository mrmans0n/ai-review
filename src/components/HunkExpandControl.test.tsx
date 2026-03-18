import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HunkExpandControl } from "./HunkExpandControl";

const EXPAND_LINES = 15;

function makeHunk(oldStart: number, oldLines: number) {
  return { oldStart, oldLines };
}

describe("HunkExpandControl", () => {
  it("returns null when both previousHunk and nextHunk are null", () => {
    const { container } = render(
      <HunkExpandControl
        previousHunk={null}
        nextHunk={null}
        totalLines={100}
        onExpand={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when gap has no lines", () => {
    const prev = makeHunk(1, 10); // ends at line 10
    const next = makeHunk(11, 5); // starts at line 11 → gapStart=11, gapEnd=10 → count=0
    const { container } = render(
      <HunkExpandControl
        previousHunk={prev}
        nextHunk={next}
        totalLines={100}
        onExpand={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  describe("top-of-file gap (no previousHunk)", () => {
    it("expand all expands full gap", async () => {
      const onExpand = vi.fn();
      const next = makeHunk(6, 10); // gapStart=1, gapEnd=5
      render(
        <HunkExpandControl
          previousHunk={null}
          nextHunk={next}
          totalLines={100}
          onExpand={onExpand}
        />
      );
      await userEvent.click(screen.getByTitle("Show all 5 lines"));
      expect(onExpand).toHaveBeenCalledWith(1, 6); // exclusive end
    });
  });

  describe("bottom-of-file gap (no nextHunk)", () => {
    it("expand all expands full gap", async () => {
      const onExpand = vi.fn();
      const prev = makeHunk(1, 10); // gapStart=11, gapEnd=50
      render(
        <HunkExpandControl
          previousHunk={prev}
          nextHunk={null}
          totalLines={50}
          onExpand={onExpand}
        />
      );
      await userEvent.click(screen.getByTitle("Show all 40 lines"));
      expect(onExpand).toHaveBeenCalledWith(11, 51);
    });
  });

  describe("between hunks — large gap with split buttons", () => {
    const prev = makeHunk(1, 10); // ends after line 10 → gapStart=11
    const next = makeHunk(61, 10); // gapEnd=60, collapsedCount=50 > EXPAND_LINES

    it("expand down (↓) expands from TOP of gap (near previousHunk)", async () => {
      const onExpand = vi.fn();
      render(
        <HunkExpandControl
          previousHunk={prev}
          nextHunk={next}
          totalLines={100}
          onExpand={onExpand}
        />
      );
      // The down arrow button has title "Show 15 lines below"
      await userEvent.click(screen.getByTitle(`Show ${EXPAND_LINES} lines below`));
      // Should expand from gapStart (11) to gapStart + EXPAND_LINES (26)
      expect(onExpand).toHaveBeenCalledWith(11, 26);
    });

    it("expand up (↑) expands from BOTTOM of gap (near nextHunk)", async () => {
      const onExpand = vi.fn();
      render(
        <HunkExpandControl
          previousHunk={prev}
          nextHunk={next}
          totalLines={100}
          onExpand={onExpand}
        />
      );
      // The up arrow button has title "Show 15 lines above"
      await userEvent.click(screen.getByTitle(`Show ${EXPAND_LINES} lines above`));
      // Should expand from gapEnd - EXPAND_LINES + 1 (46) to gapEnd + 1 (61)
      expect(onExpand).toHaveBeenCalledWith(46, 61);
    });

    it("expand all expands full gap", async () => {
      const onExpand = vi.fn();
      render(
        <HunkExpandControl
          previousHunk={prev}
          nextHunk={next}
          totalLines={100}
          onExpand={onExpand}
        />
      );
      await userEvent.click(screen.getByTitle("Show all 50 lines"));
      expect(onExpand).toHaveBeenCalledWith(11, 61);
    });
  });

  describe("between hunks — small gap (no split)", () => {
    const prev = makeHunk(1, 10); // gapStart=11
    const next = makeHunk(21, 10); // gapEnd=20, collapsedCount=10 <= EXPAND_LINES

    it("shows only expand-all button", async () => {
      const onExpand = vi.fn();
      render(
        <HunkExpandControl
          previousHunk={prev}
          nextHunk={next}
          totalLines={100}
          onExpand={onExpand}
        />
      );
      expect(screen.queryByTitle(`Show ${EXPAND_LINES} lines below`)).toBeNull();
      expect(screen.queryByTitle(`Show ${EXPAND_LINES} lines above`)).toBeNull();
      await userEvent.click(screen.getByTitle("Show all 10 lines"));
      expect(onExpand).toHaveBeenCalledWith(11, 21);
    });
  });
});
