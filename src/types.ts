export interface ChangedFile {
  path: string;
  status: string;
}

export interface GitDiffResult {
  diff: string;
  files: ChangedFile[];
}

export interface Comment {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  side: "old" | "new";
  text: string;
  createdAt: string;
}

export type DiffMode = "unstaged" | "staged" | "commit";

export interface DiffModeConfig {
  mode: DiffMode;
  commitRef?: string;
}

export interface CommitInfo {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  date: string;
  refs: string;
}

export interface BranchInfo {
  name: string;
  short_hash: string;
  subject: string;
  author: string;
  date: string;
}

export interface GgStackInfo {
  name: string;
  base: string;
  commit_count: number;
  is_current: boolean;
  username: string;
}

export interface GgStackEntry {
  hash: string;
  short_hash: string;
  title: string;
  gg_id: string | null;
  mr_number: number | null;
  position: number;
}

export interface PromptContext {
  mode: DiffMode;
  commitRef?: string;
  selectedCommit?: CommitInfo | null;
  selectedBranch?: BranchInfo | null;
}

export interface RepoInfo {
  name: string;
  path: string;
}
