/** Return a stable navigation path for a parsed diff file, avoiding "/dev/null" for deletions. */
export function getDiffFilePath(file: { newPath?: string; oldPath?: string }): string {
  if (file.newPath && file.newPath !== "/dev/null") return file.newPath;
  return file.oldPath || "";
}
