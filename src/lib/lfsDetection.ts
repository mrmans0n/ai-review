export interface LfsPointerInfo {
  oid: string;
  size: number;
}

const LFS_POINTER_RE =
  /version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([a-f0-9]{64})\nsize (\d+)/;

/**
 * Detect whether a parsed diff file's hunks contain an LFS pointer.
 * Returns pointer info if detected, null otherwise.
 */
export function detectLfsPointer(hunks: any[]): LfsPointerInfo | null {
  // Concatenate all change content lines from all hunks
  const insertLines: string[] = [];
  const deleteLines: string[] = [];

  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      if (change.isInsert || change.isNormal) {
        insertLines.push(change.content);
      }
      if (change.isDelete || change.isNormal) {
        deleteLines.push(change.content);
      }
    }
  }

  // Check insert side first, then delete side
  for (const lines of [insertLines, deleteLines]) {
    const text = lines.join("\n");
    const match = LFS_POINTER_RE.exec(text);
    if (match) {
      return { oid: match[1], size: parseInt(match[2], 10) };
    }
  }

  return null;
}

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "py", "java", "kt", "rs", "go", "rb", "php",
  "c", "cpp", "cs", "swift", "css", "scss", "html", "json", "md", "yaml",
  "yml", "txt", "toml", "xml", "sh", "bash", "zsh", "fish", "sql", "graphql",
  "proto", "dockerfile", "makefile", "cmake", "gradle", "properties", "cfg",
  "ini", "env", "gitignore", "editorconfig",
]);

/**
 * Check if a file extension is a known text-renderable type.
 */
export function isTextPreviewable(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  // Also match extensionless known filenames
  const basename = filename.split("/").pop()?.toLowerCase() || "";
  if (["dockerfile", "makefile", "gemfile", "rakefile"].includes(basename)) {
    return true;
  }
  return TEXT_EXTENSIONS.has(ext);
}
