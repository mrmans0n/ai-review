export type ParsedTextLine = { type: "text"; content: string };
export type ParsedCommentLine = {
  type: "comment";
  fullPath: string;
  fileName: string;
  startLine: number;
  endLine: number | null;
  text: string;
  deleted: boolean;
};
export type ParsedCodeBlock = {
  type: "codeblock";
  language: string;
  content: string;
};
export type ParsedLine = ParsedTextLine | ParsedCommentLine | ParsedCodeBlock;

const COMMENT_RE = /^- `(.+?):(\d+)(?:-(\d+))?( \(deleted\))?` — (.+)$/;
const CODE_FENCE_RE = /^```(\w*)$/;

export function parsePromptLines(prompt: string): ParsedLine[] {
  const lines = prompt.split("\n");
  const result: ParsedLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const fenceMatch = lines[i].match(CODE_FENCE_RE);
    if (fenceMatch) {
      const language = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      // Skip closing fence
      if (i < lines.length) i++;
      result.push({
        type: "codeblock",
        language,
        content: codeLines.join("\n"),
      });
      continue;
    }

    const commentMatch = lines[i].match(COMMENT_RE);
    if (commentMatch) {
      const fullPath = commentMatch[1];
      const parts = fullPath.split("/");
      result.push({
        type: "comment",
        fullPath,
        fileName: parts[parts.length - 1],
        startLine: parseInt(commentMatch[2], 10),
        endLine: commentMatch[3] ? parseInt(commentMatch[3], 10) : null,
        deleted: !!commentMatch[4],
        text: commentMatch[5],
      });
    } else {
      result.push({ type: "text", content: lines[i] });
    }
    i++;
  }

  return result;
}
