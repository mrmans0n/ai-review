import type { Comment, PromptContext } from "../types";

/**
 * Groups comments by file and generates a compact prompt for AI review.
 *
 * @param comments - Array of review comments
 * @param context - Optional context about what was being reviewed
 * @returns Formatted prompt string ready to be copied
 */
export function generatePrompt(comments: Comment[], context?: PromptContext): string {
  if (comments.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Add context header when reviewing a specific commit or branch
  if (context) {
    if (context.selectedCommit) {
      lines.push(
        `These comments are from reviewing commit ${context.selectedCommit.short_hash} ("${context.selectedCommit.message}").`,
        "Apply the feedback to the current version of the code.",
        ""
      );
    } else if (context.selectedBranch) {
      lines.push(
        `These comments are from reviewing branch ${context.selectedBranch.name} (at ${context.selectedBranch.short_hash}).`,
        "Apply the feedback to the current version of the code.",
        ""
      );
    } else if (context.mode === "commit" && context.commitRef) {
      lines.push(
        `These comments are from reviewing changes relative to ${context.commitRef}.`,
        "Apply the feedback to the current version of the code.",
        ""
      );
    }
  }

  // Group comments by file
  const commentsByFile = new Map<string, Comment[]>();

  for (const comment of comments) {
    const fileComments = commentsByFile.get(comment.file) || [];
    fileComments.push(comment);
    commentsByFile.set(comment.file, fileComments);
  }

  // Sort files alphabetically
  const sortedFiles = Array.from(commentsByFile.keys()).sort();

  // Build the prompt
  lines.push("Please address these review comments:", "");

  for (const file of sortedFiles) {
    const fileComments = commentsByFile.get(file)!;

    // Sort comments by line number within each file
    fileComments.sort((a, b) => a.startLine - b.startLine);

    for (const comment of fileComments) {
      const location = comment.startLine === comment.endLine
        ? `${file}:${comment.startLine}`
        : `${file}:${comment.startLine}-${comment.endLine}`;

      lines.push(`- \`${location}\` — ${comment.text}`);
    }
  }

  return lines.join("\n");
}
