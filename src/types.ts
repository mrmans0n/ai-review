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
