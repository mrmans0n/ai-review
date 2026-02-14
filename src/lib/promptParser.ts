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
export type ParsedLine = ParsedTextLine | ParsedCommentLine;

const COMMENT_RE = /^- `(.+?):(\d+)(?:-(\d+))?( \(deleted\))?` — (.+)$/;

export function parsePromptLines(prompt: string): ParsedLine[] {
  return prompt.split("\n").map((line) => {
    const match = line.match(COMMENT_RE);
    if (!match) {
      return { type: "text", content: line };
    }
    const fullPath = match[1];
    const parts = fullPath.split("/");
    return {
      type: "comment",
      fullPath,
      fileName: parts[parts.length - 1],
      startLine: parseInt(match[2], 10),
      endLine: match[3] ? parseInt(match[3], 10) : null,
      deleted: !!match[4],
      text: match[5],
    };
  });
}
