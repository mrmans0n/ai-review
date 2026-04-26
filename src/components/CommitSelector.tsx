import { CommitSelectorContent, fuzzyMatch } from "./CommitSelectorContent";
import type { BranchInfo, CommitInfo, GgStackInfo, GgStackEntry, WorktreeInfo } from "../types";

interface CommitSelectorProps {
  isOpen: boolean;
  commits: CommitInfo[];
  branches: BranchInfo[];
  loading: boolean;
  hasGgStacks: boolean;
  ggStacks: GgStackInfo[];
  hasWorktrees: boolean;
  worktrees: WorktreeInfo[];
  ggStackEntries: GgStackEntry[];
  selectedStack: string | null;
  onSelectCommit: (commit: CommitInfo) => void;
  onSelectRange: (fromHash: string, toHash: string) => void;
  onSelectBranch: (branch: BranchInfo) => void;
  onSelectStack: (stack: GgStackInfo) => void;
  onSelectStackEntry: (entry: GgStackEntry) => void;
  onSelectStackDiff: (stack: GgStackInfo) => void;
  onSelectWorktree: (worktree: WorktreeInfo) => void;
  onSelectRef: (ref: string) => void;
  refError: string | null;
  onBackToStacks: () => void;
  onClose: () => void;
}

export function CommitSelector({
  isOpen,
  onClose,
  ...contentProps
}: CommitSelectorProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-start justify-center pt-32 z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-divider rounded-md shadow-2xl w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CommitSelectorContent
          {...contentProps}
          onClose={onClose}
          variant="modal"
        />
      </div>
    </div>
  );
}

export { fuzzyMatch };
