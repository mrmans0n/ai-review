import { parseDiff } from "react-diff-view";

function stripCombinedBinaryDiffs(diffText: string): string {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of diffText.split("\n")) {
    if (/^diff --(?:git|cc) /.test(line) && current.length > 0) {
      blocks.push(`${current.join("\n")}\n`);
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(`${current.join("\n")}\n`);
  }

  const kept = blocks.filter(
    (block) => !(block.startsWith("diff --cc ") && /^Binary files differ$/m.test(block))
  );

  return kept.join("");
}

export function parseDiffSafely(diffText: string): ReturnType<typeof parseDiff> {
  const parseableDiff = stripCombinedBinaryDiffs(diffText);
  if (!parseableDiff.trim()) return [];
  return parseDiff(parseableDiff);
}
