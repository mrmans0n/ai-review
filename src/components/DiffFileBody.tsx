import { useMemo } from "react";
import type { MutableRefObject, ReactElement, ReactNode } from "react";
import { Diff, Decoration, Hunk, getCollapsedLinesCountBetween } from "react-diff-view";
import { highlight } from "../highlight";
import { HunkExpandControl } from "./HunkExpandControl";

type DiffFileBodyProps = {
  file: any;
  fileName: string;
  fileHunks: any[];
  language: string;
  oldSource: string | undefined;
  viewType: "split" | "unified";
  fileWidgets: Record<string, ReactNode>;
  highlightedChangeKeys: string[];
  estimatedTotalLines: number;
  onExpandRange: (filePath: string, originalHunks: any[], start: number, end: number) => void;
  onLineClick: (file: string, line: number, side: "old" | "new") => void;
  onShiftClickRange: (file: string, startLine: number, endLine: number, side: "old" | "new") => void;
  onSelectingRangeChange: (range: { file: string; startLine: number; side: "old" | "new" } | null) => void;
  onSelectedRangeChange: (range: { file: string; startLine: number; endLine: number; side: "old" | "new" } | null) => void;
  onHoverLineChange: (line: { file: string; line: number; side: "old" | "new" } | null) => void;
  selectingRange: { file: string; startLine: number; side: "old" | "new" } | null;
  lastFocusedLine: { file: string; line: number; side: "old" | "new" } | null;
  suppressNextClickRef: MutableRefObject<boolean>;
};

function getChangeSide(change: any): "old" | "new" {
  if (change.isNormal) return "new";
  return change.type === "insert" ? "new" : "old";
}

function getChangeLineNumber(change: any, side: "old" | "new"): number | undefined {
  if (change.isNormal) {
    return side === "new" ? change.newLineNumber : change.oldLineNumber;
  }
  return change.lineNumber;
}

export function DiffFileBody({
  file,
  fileName,
  fileHunks,
  language,
  oldSource,
  viewType,
  fileWidgets,
  highlightedChangeKeys,
  estimatedTotalLines,
  onExpandRange,
  onLineClick,
  onShiftClickRange,
  onSelectingRangeChange,
  onSelectedRangeChange,
  onHoverLineChange,
  selectingRange,
  lastFocusedLine,
  suppressNextClickRef,
}: DiffFileBodyProps) {
  const tokens = useMemo(
    () => highlight(fileHunks, { language, oldSource }),
    [fileHunks, language, oldSource]
  );

  return (
    <Diff
      viewType={viewType}
      diffType={file.type}
      hunks={fileHunks}
      tokens={tokens}
      widgets={fileWidgets}
      selectedChanges={highlightedChangeKeys}
      renderGutter={({ change, side, inHoverState, renderDefault }: any) => {
        if (!change) return renderDefault();
        const changeSide = getChangeSide(change);
        const lineNumber = getChangeLineNumber(change, changeSide);
        // Only show button on the "new" side gutter (or matching side)
        const showButton = inHoverState && side === changeSide && lineNumber;
        return (
          <span className="relative inline-flex items-center w-full">
            {showButton && (
              <span
                className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-accent-review hover:opacity-90 cursor-pointer text-accent-review-text opacity-80 hover:opacity-100 transition-all"
                title="Add comment"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (lineNumber) {
                    onSelectingRangeChange({
                      file: fileName,
                      startLine: lineNumber,
                      side: changeSide,
                    });
                    onSelectedRangeChange({
                      file: fileName,
                      startLine: lineNumber,
                      endLine: lineNumber,
                      side: changeSide,
                    });
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M10 2c-4.418 0-8 2.91-8 6.5S5.582 15 10 15c.382 0 .757-.022 1.124-.063l3.33 2.152a.5.5 0 00.771-.42v-2.97C17.09 12.266 18 10.48 18 8.5 18 4.91 14.418 2 10 2z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <span className="flex-1 text-right">{renderDefault()}</span>
          </span>
        );
      }}
      gutterEvents={{
        onClick: (event: any) => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }

          const { change } = event;
          if (change) {
            const side = change.isNormal
              ? "new"
              : change.type === "insert"
                ? "new"
                : "old";
            const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
            if (lineNumber) {
              // Handle shift+click for range selection
              if (event.nativeEvent.shiftKey && lastFocusedLine && lastFocusedLine.file === fileName && lastFocusedLine.side === side) {
                const startLine = Math.min(lastFocusedLine.line, lineNumber);
                const endLine = Math.max(lastFocusedLine.line, lineNumber);
                onShiftClickRange(fileName, startLine, endLine, side);
                onSelectedRangeChange(null);
              } else {
                onLineClick(fileName, lineNumber, side);
              }
            }
          }
        },
        onMouseDown: (event: any) => {
          const { change } = event;
          if (change) {
            const side = change.isNormal
              ? "new"
              : change.type === "insert"
                ? "new"
                : "old";
            const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
            if (lineNumber) {
              onSelectingRangeChange({
                file: fileName,
                startLine: lineNumber,
                side,
              });
              onSelectedRangeChange({
                file: fileName,
                startLine: lineNumber,
                endLine: lineNumber,
                side,
              });
            }
          }
        },
        onMouseEnter: (event: any) => {
          const { change } = event;
          if (change) {
            const side = change.isNormal
              ? "new"
              : change.type === "insert"
                ? "new"
                : "old";
            const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
            if (lineNumber) {
              // Update hovered line for "C" key shortcut
              onHoverLineChange({ file: fileName, line: lineNumber, side });

              // Extend selection range if dragging
              if (selectingRange && selectingRange.file === fileName && selectingRange.side === side) {
                const startLine = Math.min(selectingRange.startLine, lineNumber);
                const endLine = Math.max(selectingRange.startLine, lineNumber);
                onSelectedRangeChange({
                  file: fileName,
                  startLine,
                  endLine,
                  side,
                });
              }
            }
          }
        },
      }}
    >
      {(hunks: any[]) => {
        const elements: ReactElement[] = [];
        const lastHunk = hunks[hunks.length - 1];

        // Top-of-file expand control
        if (hunks.length > 0 && (hunks[0].oldStart > 1 || (hunks[0].oldStart === 0 && hunks[0].newStart > 1))) {
          elements.push(
            <Decoration key="expand-top">
              <HunkExpandControl
                previousHunk={null}
                nextHunk={hunks[0]}
                totalLines={estimatedTotalLines}
                onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
              />
            </Decoration>
          );
        }

        hunks.forEach((hunk, i) => {
          // Between-hunk expand control
          if (i > 0) {
            const collapsed = getCollapsedLinesCountBetween(hunks[i - 1], hunk);
            if (collapsed > 0) {
              elements.push(
                <Decoration key={`expand-${i}`}>
                  <HunkExpandControl
                    previousHunk={hunks[i - 1]}
                    nextHunk={hunk}
                    totalLines={estimatedTotalLines}
                    onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
                  />
                </Decoration>
              );
            }
          }
          elements.push(<Hunk key={hunk.content} hunk={hunk} />);
        });

        // Bottom-of-file expand control
        if (hunks.length > 0 && estimatedTotalLines > 0) {
          const lastHunkEnd = (lastHunk.oldLines === 0 && lastHunk.oldStart === 0)
            ? lastHunk.newStart + lastHunk.newLines - 1
            : lastHunk.oldStart + lastHunk.oldLines - 1;
          if (lastHunkEnd < estimatedTotalLines) {
            elements.push(
              <Decoration key="expand-bottom">
                <HunkExpandControl
                  previousHunk={lastHunk}
                  nextHunk={null}
                  totalLines={estimatedTotalLines}
                  onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
                />
              </Decoration>
            );
          }
        }

        return elements;
      }}
    </Diff>
  );
}
