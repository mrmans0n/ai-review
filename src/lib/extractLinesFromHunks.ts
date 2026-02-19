export function extractLinesFromHunks(
  hunks: any[],
  startLine: number,
  endLine: number,
  side: "old" | "new"
): string | undefined {
  const lines: string[] = [];

  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      let lineNum: number | undefined;
      let changeSide: "old" | "new";

      if (change.isNormal) {
        lineNum = side === "new" ? change.newLineNumber : change.oldLineNumber;
        changeSide = side;
      } else if (change.type === "insert") {
        lineNum = change.lineNumber;
        changeSide = "new";
      } else {
        // delete
        lineNum = change.lineNumber;
        changeSide = "old";
      }

      if (
        changeSide === side &&
        lineNum !== undefined &&
        lineNum >= startLine &&
        lineNum <= endLine
      ) {
        // Strip leading +/- or space
        lines.push(change.content.slice(1));
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}
