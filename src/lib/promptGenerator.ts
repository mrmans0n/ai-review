import type { Comment } from "../types";

/**
 * Groups comments by file and generates a compact prompt for AI review.
 * 
 * @param comments - Array of review comments
 * @returns Formatted prompt string ready to be copied
 */
export function generatePrompt(comments: Comment[]): string {
  if (comments.length === 0) {
    return "";
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
  const lines = ["Please address these review comments:", ""];

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
