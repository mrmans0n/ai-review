import { useEffect, useMemo, useRef, useState } from "react";
import type { BranchInfo, CommitInfo, GgStackInfo, GgStackEntry, WorktreeInfo } from "../types";

type SelectorTab = "commits" | "branches" | "stacks" | "worktrees" | "ref";
type StackView = "list" | "entries";

export interface CommitSelectorContentProps {
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
  onClose?: () => void;
  variant: "modal" | "inline";
  autoFocus?: boolean;
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;

  const q = query.toLowerCase();
  const target = text.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < target.length && queryIndex < q.length; i++) {
    if (target[i] === q[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === q.length;
}

function shortenPath(path: string, segments: number = 3): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= segments) {
    return normalized;
  }
  return `…/${parts.slice(-segments).join("/")}`;
}

export function CommitSelectorContent({
  commits,
  branches,
  loading,
  hasGgStacks,
  ggStacks,
  hasWorktrees,
  worktrees,
  ggStackEntries,
  selectedStack,
  onSelectCommit,
  onSelectRange,
  onSelectBranch,
  onSelectStack,
  onSelectStackEntry,
  onSelectStackDiff,
  onSelectWorktree,
  onSelectRef,
  refError,
  onBackToStacks,
  onClose,
  variant,
  autoFocus = true,
}: CommitSelectorContentProps) {
  const [tab, setTab] = useState<SelectorTab>("commits");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stackView, setStackView] = useState<StackView>("list");
  const [refValue, setRefValue] = useState("");
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [hoveredCommitIndex, setHoveredCommitIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  const isInline = variant === "inline";

  const filteredCommits = useMemo(() => {
    return commits.filter((commit) => {
      const searchableText = `${commit.message} ${commit.hash} ${commit.short_hash} ${commit.author} ${commit.refs}`;
      return fuzzyMatch(searchableText, searchQuery);
    });
  }, [commits, searchQuery]);

  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const searchableText = `${branch.name} ${branch.short_hash} ${branch.subject} ${branch.author}`;
      return fuzzyMatch(searchableText, searchQuery);
    });
  }, [branches, searchQuery]);

  const filteredStacks = useMemo(() => {
    if (stackView === "list") {
      return ggStacks.filter((stack) => {
        const searchableText = `${stack.name} ${stack.base} ${stack.username}`;
        return fuzzyMatch(searchableText, searchQuery);
      });
    } else {
      return ggStackEntries.filter((entry) => {
        const searchableText = `${entry.title} ${entry.hash} ${entry.short_hash} ${entry.gg_id || ""}`;
        return fuzzyMatch(searchableText, searchQuery);
      });
    }
  }, [ggStacks, ggStackEntries, stackView, searchQuery]);

  const filteredWorktrees = useMemo(() => {
    return worktrees.filter((worktree) => {
      const searchableText = `${worktree.branch} ${worktree.path}`;
      return fuzzyMatch(searchableText, searchQuery);
    });
  }, [worktrees, searchQuery]);

  const activeCount =
    tab === "commits"
      ? filteredCommits.length
      : tab === "branches"
        ? filteredBranches.length
        : tab === "stacks"
          ? filteredStacks.length
          : tab === "worktrees"
            ? filteredWorktrees.length
            : 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, tab, stackView]);

  useEffect(() => {
    setRangeAnchor(null);
    setHoveredCommitIndex(null);
  }, [searchQuery, tab, stackView]);

  useEffect(() => {
    if (selectedStack) {
      setStackView("entries");
    } else {
      setStackView("list");
    }
  }, [selectedStack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tab === "stacks" && stackView === "entries") {
          onBackToStacks();
        } else {
          onClose?.();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(activeCount - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (tab === "commits" && filteredCommits[selectedIndex]) {
          onSelectCommit(filteredCommits[selectedIndex]);
        } else if (tab === "branches" && filteredBranches[selectedIndex]) {
          onSelectBranch(filteredBranches[selectedIndex]);
        } else if (tab === "stacks") {
          if (stackView === "list" && filteredStacks[selectedIndex]) {
            onSelectStack(filteredStacks[selectedIndex] as GgStackInfo);
          } else if (stackView === "entries" && filteredStacks[selectedIndex]) {
            onSelectStackEntry(filteredStacks[selectedIndex] as GgStackEntry);
          }
        } else if (tab === "worktrees" && filteredWorktrees[selectedIndex]) {
          onSelectWorktree(filteredWorktrees[selectedIndex]);
        } else if (tab === "ref" && refValue.trim()) {
          onSelectRef(refValue.trim());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    activeCount,
    tab,
    stackView,
    filteredCommits,
    filteredBranches,
    filteredStacks,
    filteredWorktrees,
    onSelectCommit,
    onSelectBranch,
    onSelectStack,
    onSelectStackEntry,
    onSelectWorktree,
    onSelectRef,
    refValue,
    onBackToStacks,
    onClose,
  ]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (tab === "ref" && refInputRef.current) {
      refInputRef.current.focus();
    }
  }, [tab]);

  useEffect(() => {
    if (selectedRef.current && typeof selectedRef.current.scrollIntoView === "function") {
      selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const getRangeBounds = (anchorIndex: number, targetIndex: number) => {
    const minIndex = Math.min(anchorIndex, targetIndex);
    const maxIndex = Math.max(anchorIndex, targetIndex);

    return {
      minIndex,
      maxIndex,
      fromHash: filteredCommits[maxIndex].hash,
      toHash: filteredCommits[minIndex].hash,
    };
  };

  const handleCommitClick = (index: number, commit: CommitInfo) => {
    if (rangeAnchor !== null && filteredCommits[rangeAnchor]) {
      const { fromHash, toHash } = getRangeBounds(rangeAnchor, index);
      onSelectRange(fromHash, toHash);
      return;
    }

    setRangeAnchor(index);
    onSelectCommit(commit);
  };

  const handleSetRangeAnchor = (index: number) => {
    if (rangeAnchor !== null && filteredCommits[rangeAnchor]) {
      const { fromHash, toHash } = getRangeBounds(rangeAnchor, index);
      onSelectRange(fromHash, toHash);
      return;
    }

    setRangeAnchor(index);
    setHoveredCommitIndex(index);
    setSelectedIndex(index);
  };

  return (
    <>
      {!isInline && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-divider">
          <div className="w-0.5 h-5 bg-accent-review rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ink-primary">Select Commit</h2>
        </div>
      )}

      <div className={`${isInline ? "px-6 pt-6 pb-3" : "p-4 border-b border-divider"} space-y-3`}>
        <div className="inline-flex bg-canvas border border-divider rounded-sm p-1">
          <button
            onClick={() => setTab("commits")}
            className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
              tab === "commits" ? "bg-accent-review text-accent-review-text" : "text-ink-secondary hover:bg-surface-hover"
            }`}
          >
            Commits
          </button>
          <button
            onClick={() => setTab("branches")}
            className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
              tab === "branches" ? "bg-accent-review text-accent-review-text" : "text-ink-secondary hover:bg-surface-hover"
            }`}
          >
            Branches
          </button>
          {hasGgStacks && (
            <button
              onClick={() => setTab("stacks")}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                tab === "stacks" ? "bg-accent-review text-accent-review-text" : "text-ink-secondary hover:bg-surface-hover"
              }`}
            >
              Stacks
            </button>
          )}
          {hasWorktrees && (
            <button
              onClick={() => setTab("worktrees")}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                tab === "worktrees" ? "bg-accent-review text-accent-review-text" : "text-ink-secondary hover:bg-surface-hover"
              }`}
            >
              Worktrees
            </button>
          )}
          <button
            onClick={() => setTab("ref")}
            className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
              tab === "ref" ? "bg-accent-review text-accent-review-text" : "text-ink-secondary hover:bg-surface-hover"
            }`}
          >
            Ref
          </button>
        </div>

        {tab !== "ref" && (
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              tab === "commits"
                ? "Search commits... (message, hash, author, refs)"
                : tab === "branches"
                  ? "Search branches... (name, hash, subject, author)"
                  : tab === "stacks"
                    ? stackView === "list"
                      ? "Search stacks... (name, base, username)"
                      : "Search entries... (title, hash, gg-id)"
                    : "Search worktrees... (branch, path)"
            }
            className="w-full bg-canvas border border-divider rounded-sm text-ink-primary text-sm px-3 py-2 placeholder:text-ink-muted focus:border-accent-review focus:outline-none"
          />
        )}
      </div>

      <div className={`${isInline ? "flex-1" : "max-h-96"} overflow-y-auto`} onMouseLeave={() => setHoveredCommitIndex(null)}>
        {loading ? (
          <div className="p-8 text-center text-ink-secondary">Loading {tab}...</div>
        ) : tab === "commits" ? (
          filteredCommits.length === 0 ? (
            <div className="p-8 text-center text-ink-secondary">
              {searchQuery ? "No matching commits" : "No commits found"}
            </div>
          ) : (
            filteredCommits.map((commit, index) => {
              const isSelected = index === selectedIndex;
              const isAnchor = rangeAnchor === index;
              const isRangePreviewActive = rangeAnchor !== null && hoveredCommitIndex !== null;
              const isInRangePreview =
                isRangePreviewActive &&
                index >= Math.min(rangeAnchor, hoveredCommitIndex) &&
                index <= Math.max(rangeAnchor, hoveredCommitIndex);

              return (
                <div
                  key={commit.hash}
                  ref={isSelected ? selectedRef : null}
                  onClick={() => handleCommitClick(index, commit)}
                  onMouseEnter={() => setHoveredCommitIndex(index)}
                  className={`cursor-pointer transition-colors px-4 py-3 ${
                    isSelected
                      ? "bg-surface border-l-2 border-accent-review"
                      : isAnchor
                        ? "border-l-2 border-ctp-blue/70"
                        : "border-l-2 border-transparent hover:bg-surface-hover"
                  } ${isInRangePreview ? "bg-ctp-blue/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="font-mono text-xs px-2 py-1 rounded-sm bg-canvas text-ink-muted border border-divider">
                      {commit.short_hash}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm truncate text-ink-primary">{commit.message}</div>
                        {isAnchor && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-ctp-blue/15 text-ctp-blue border border-ctp-blue/30">
                            start
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{commit.date}</span>
                        {commit.refs && (
                          <>
                            <span>•</span>
                            <span className="flex gap-1 flex-wrap">
                              {commit.refs.split(", ").map((ref, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded-sm text-xs bg-surface text-ink-secondary border border-divider"
                                >
                                  {ref}
                                </span>
                              ))}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetRangeAnchor(index);
                      }}
                      className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-sm border text-xs transition-colors ${
                        isAnchor
                          ? "bg-ctp-blue/15 border-ctp-blue/40 text-ctp-blue"
                          : "bg-canvas border-divider text-ink-muted hover:text-ctp-blue hover:border-ctp-blue/30"
                      }`}
                      title={rangeAnchor === null ? "Set range start" : "Select range to this commit"}
                      aria-label={rangeAnchor === null ? `Set range start at ${commit.message}` : `Select range to ${commit.message}`}
                    >
                      ⊙
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : tab === "branches" ? (
          filteredBranches.length === 0 ? (
            <div className="p-8 text-center text-ink-secondary">
              {searchQuery ? "No matching branches" : "No branches found"}
            </div>
          ) : (
            filteredBranches.map((branch, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={branch.name}
                  ref={isSelected ? selectedRef : null}
                  onClick={() => onSelectBranch(branch)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "px-4 py-3 bg-surface border-l-2 border-accent-review"
                      : "px-4 py-3 hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="font-mono text-xs px-2 py-1 rounded-sm bg-canvas text-ink-muted border border-divider">
                      {branch.short_hash}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-ink-primary">{branch.name}</div>
                      <div className="text-xs mt-1 text-ink-muted">
                        {branch.subject}
                      </div>
                      <div className="text-xs mt-1 text-ink-muted">
                        {branch.author} • {branch.date}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : tab === "stacks" ? (
          stackView === "list" ? (
          <>
            {filteredStacks.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary">
                {searchQuery ? "No matching stacks" : "No stacks found"}
              </div>
            ) : (
              filteredStacks.map((stack, index) => {
                const isSelected = index === selectedIndex;
                const stackInfo = stack as GgStackInfo;
                return (
                  <div
                    key={stackInfo.name}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => onSelectStack(stackInfo)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "px-4 py-3 bg-surface border-l-2 border-accent-review"
                        : "px-4 py-3 hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs px-2 py-1 rounded-sm bg-canvas text-ink-muted border border-divider">
                        {stackInfo.commit_count}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink-primary">{stackInfo.name}</span>
                          {stackInfo.is_current && (
                            <span className="text-xs px-1.5 py-0.5 rounded-sm bg-ctp-teal/20 text-ctp-teal border border-ctp-teal/30">
                              current
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-1 text-ink-muted">
                          {stackInfo.username}/{stackInfo.name} • base: {stackInfo.base}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            {selectedStack && (
              <div className="bg-canvas border-b border-divider p-3 flex items-center gap-3">
                <button
                  onClick={onBackToStacks}
                  className="text-ink-secondary hover:text-ink-primary text-sm px-3 py-1.5 rounded-sm hover:bg-surface-hover transition-colors"
                >
                  ← Back to stacks
                </button>
                <button
                  onClick={() => {
                    const stack = ggStacks.find((s) => s.name === selectedStack);
                    if (stack) onSelectStackDiff(stack);
                  }}
                  className="text-accent-review-text text-sm px-3 py-1.5 rounded-sm bg-accent-review hover:opacity-90 transition-opacity"
                >
                  View full stack diff
                </button>
              </div>
            )}
            {filteredStacks.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary">
                {searchQuery ? "No matching entries" : "No entries found"}
              </div>
            ) : (
              filteredStacks.map((entry, index) => {
                const isSelected = index === selectedIndex;
                const stackEntry = entry as GgStackEntry;
                return (
                  <div
                    key={stackEntry.hash}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => onSelectStackEntry(stackEntry)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "px-4 py-3 bg-surface border-l-2 border-accent-review"
                        : "px-4 py-3 hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs px-2 py-1 rounded-sm bg-canvas text-ink-muted border border-divider">
                        {stackEntry.short_hash}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate text-ink-primary">{stackEntry.title}</span>
                          {stackEntry.mr_number && (
                            <span className="text-xs px-1.5 py-0.5 rounded-sm font-mono bg-accent-review/20 text-accent-review border border-accent-review/30">
                              !{stackEntry.mr_number}
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-1 text-ink-muted">
                          Position {stackEntry.position + 1}
                          {stackEntry.gg_id && ` • GG-ID: ${stackEntry.gg_id}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )
        ) : tab === "worktrees" ? (
          filteredWorktrees.length === 0 ? (
            <div className="p-8 text-center text-ink-secondary">
              {searchQuery ? "No matching worktrees" : "No worktrees found"}
            </div>
          ) : (
            filteredWorktrees.map((worktree, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={worktree.path}
                  ref={isSelected ? selectedRef : null}
                  onClick={() => onSelectWorktree(worktree)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "px-4 py-3 bg-surface border-l-2 border-accent-review"
                      : "px-4 py-3 hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="font-mono text-xs px-2 py-1 rounded-sm bg-canvas text-ink-muted border border-divider">
                      {worktree.commit_hash}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-ink-primary">{worktree.branch}</span>
                        {worktree.is_main && (
                          <span className="text-xs px-1.5 py-0.5 rounded-sm bg-ctp-teal/20 text-ctp-teal border border-ctp-teal/30">
                            main
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1 text-ink-muted font-mono truncate">
                        {shortenPath(worktree.path)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : tab === "ref" ? (
          <div className="p-6">
            <div className="text-ink-secondary text-sm mb-4">
              Enter a git ref to compare against (e.g., HEAD~1, main~3, abc1234, feature-branch)
            </div>
            <div className="flex gap-2">
              <input
                ref={refInputRef}
                type="text"
                value={refValue}
                onChange={(e) => setRefValue(e.target.value)}
                placeholder="HEAD~1"
                className="flex-1 bg-canvas border border-divider rounded-sm text-ink-primary text-sm px-3 py-2 placeholder:text-ink-muted focus:border-accent-review focus:outline-none font-mono"
              />
              <button
                onClick={() => refValue.trim() && onSelectRef(refValue.trim())}
                disabled={!refValue.trim()}
                className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                  refValue.trim()
                    ? "bg-accent-review text-accent-review-text hover:opacity-90"
                    : "bg-surface text-ink-muted cursor-not-allowed border border-divider"
                }`}
              >
                Compare
              </button>
            </div>
            {refError && (
              <div className="mt-3 px-3 py-2 rounded-sm bg-ctp-red/10 border border-ctp-red/30 text-ctp-red text-sm">
                {refError}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className={`p-3 border-t border-divider ${isInline ? "" : "bg-canvas"} text-xs text-ink-muted`}>
        {tab === "ref" ? (
          <>
            <span className="mr-4">Enter Compare</span>
            {!isInline && <span>Esc Close</span>}
          </>
        ) : (
          <>
            <span className="mr-4">↑↓ Navigate</span>
            <span className="mr-4">Enter Select</span>
            <span className="mr-4">Use ⊙ to set range start</span>
            {(tab === "stacks" && stackView === "entries") ? (
              <span>Esc Back</span>
            ) : !isInline ? (
              <span>Esc Close</span>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

export { fuzzyMatch };
