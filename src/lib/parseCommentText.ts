export type TextSegment = { type: "text"; content: string };
export type CodeSegment = { type: "code"; language: string | null; content: string };
export type CommentSegment = TextSegment | CodeSegment;

export function parseCommentText(text: string): CommentSegment[] {
  if (!text) return [];
  const segments: CommentSegment[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: "code",
      language: match[1] || null,
      content: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
