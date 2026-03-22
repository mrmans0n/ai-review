import type { Comment, PromptContext, JsonFeedback } from "../types";

/**
 * Serializes review comments and context into the structured JSON feedback format.
 */
export function buildJsonFeedback(
  comments: Comment[],
  context: PromptContext
): JsonFeedback {
  return {
    format: "ai-review.feedback/v1",
    context: {
      mode: context.mode,
      ...(context.commitRef != null && { commitRef: context.commitRef }),
      ...(context.selectedCommit != null && {
        selectedCommit: context.selectedCommit,
      }),
      ...(context.selectedBranch != null && {
        selectedBranch: context.selectedBranch,
      }),
    },
    comments: comments.map((c) => ({
      id: c.id,
      file: c.file,
      startLine: c.startLine,
      endLine: c.endLine,
      side: c.side,
      text: c.text,
      createdAt: c.createdAt,
    })),
  };
}
