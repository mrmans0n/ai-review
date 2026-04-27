import type { BranchInfo, CommitInfo, DiffModeConfig } from "../types";

export interface TitlebarContextInput {
  workingDir: string;
  diffMode: DiffModeConfig;
  selectedCommit: CommitInfo | null;
  selectedBranch: BranchInfo | null;
  reviewingLabel: string | null;
  activeFile?: string;
  changedFileCount: number;
}

export interface TitlebarContext {
  repoName: string;
  primary: string;
  secondary?: string;
  activeFile?: string;
  fileSummary?: string;
}

export function getRepoName(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

export function getDiffScopeLabel(diffMode: DiffModeConfig): string {
  if (diffMode.mode === "unstaged") return "Unstaged changes";
  if (diffMode.mode === "staged") return "Staged changes";
  if (diffMode.mode === "commit") return diffMode.commitRef ? `Commit ${diffMode.commitRef}` : "Commit";
  if (diffMode.mode === "range") return diffMode.range ? `Range ${diffMode.range}` : "Range";
  if (diffMode.mode === "branch") return diffMode.branchName ? `Branch ${diffMode.branchName}` : "Branch";
  return "Review";
}

export function buildTitlebarContext({
  workingDir,
  diffMode,
  selectedCommit,
  selectedBranch,
  reviewingLabel,
  activeFile,
  changedFileCount,
}: TitlebarContextInput): TitlebarContext {
  const fileSummary =
    changedFileCount === 1 ? "1 file" : `${changedFileCount} files`;

  if (selectedCommit) {
    return {
      repoName: getRepoName(workingDir),
      primary: selectedCommit.short_hash,
      secondary: selectedCommit.message,
      activeFile,
      fileSummary,
    };
  }

  if (selectedBranch) {
    return {
      repoName: getRepoName(workingDir),
      primary: selectedBranch.name,
      secondary: selectedBranch.short_hash,
      activeFile,
      fileSummary,
    };
  }

  return {
    repoName: getRepoName(workingDir),
    primary: reviewingLabel || getDiffScopeLabel(diffMode),
    activeFile,
    fileSummary,
  };
}
