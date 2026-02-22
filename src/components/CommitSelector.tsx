import { useEffect, useMemo, useRef, useState } from "react";
import type { BranchInfo, CommitInfo, GgStackInfo, GgStackEntry } from "../types";

type SelectorTab = "commits" | "branches" | "stacks" | "ref";
type StackView = "list" | "entries";

interface CommitSelectorProps {
  isOpen: boolean;
  commits: CommitInfo[];
  branches: BranchInfo[];
  loading: boolean;
  hasGgStacks: boolean;
  ggStacks: GgStackInfo[];
  ggStackEntries: GgStackEntry[];
  selectedStack: string | null;
  onSelectCommit: (commit: CommitInfo) => void;
  onSelectBranch: (branch: BranchInfo) => void;
  onSelectStack: (stack: GgStackInfo) => void;
  onSelectStackEntry: (entry: GgStackEntry) => void;
  onSelectStackDiff: (stack: GgStackInfo) => void;
  onSelectRef: (ref: string) => void;
  onBackToStacks: () => void;
  onClose: () => void;
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

export function CommitSelector({
  isOpen,
  commits,
  branches,
  loading,
  hasGgStacks,
  ggStacks,
  ggStackEntries,
  selectedStack,
  onSelectCommit,
  onSelectBranch,
  onSelectStack,
  onSelectStackEntry,
  onSelectStackDiff,
  onSelectRef,
  onBackToStacks,
  onClose,
}: CommitSelectorProps) {
  const [tab, setTab] = useState<SelectorTab>("commits");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stackView, setStackView] = useState<StackView>("list");
  const [refValue, setRefValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

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

  const activeCount =
    tab === "commits"
      ? filteredCommits.length
      : tab === "branches"
        ? filteredBranches.length
        : filteredStacks.length;

  useEffect(() => {
    setSelectedIndex(0);
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
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (tab === "stacks" && stackView === "entries") {
          onBackToStacks();
        } else {
          onClose();
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
        } else if (tab === "ref" && refValue.trim()) {
          onSelectRef(refValue.trim());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    selectedIndex,
    activeCount,
    tab,
    stackView,
    filteredCommits,
    filteredBranches,
    filteredStacks,
    onSelectCommit,
    onSelectBranch,
    onSelectStack,
    onSelectStackEntry,
    onSelectRef,
    refValue,
    onBackToStacks,
    onClose,
  ]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery("");
      setTab("commits");
      setStackView("list");
      setRefValue("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (tab === "ref" && refInputRef.current) {
      refInputRef.current.focus();
    }
  }, [tab]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div className="bg-ctp-surface0 border border-ctp-surface1 rounded-md shadow-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
          <div className="w-0.5 h-5 bg-ctp-peach rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ctp-text">Select Commit</h2>
        </div>

        <div className="p-4 border-b border-ctp-surface1 space-y-3">
          <div className="inline-flex bg-ctp-base border border-ctp-surface1 rounded-sm p-1">
            <button
              onClick={() => setTab("commits")}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                tab === "commits" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext hover:bg-ctp-surface0"
              }`}
            >
              Commits
            </button>
            <button
              onClick={() => setTab("branches")}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                tab === "branches" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext hover:bg-ctp-surface0"
              }`}
            >
              Branches
            </button>
            {hasGgStacks && (
              <button
                onClick={() => setTab("stacks")}
                className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                  tab === "stacks" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext hover:bg-ctp-surface0"
                }`}
              >
                Stacks
              </button>
            )}
            <button
              onClick={() => setTab("ref")}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                tab === "ref" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext hover:bg-ctp-surface0"
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
                    : stackView === "list"
                      ? "Search stacks... (name, base, username)"
                      : "Search entries... (title, hash, gg-id)"
              }
              className="w-full bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text text-sm px-3 py-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none"
            />
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-ctp-subtext">Loading {tab}...</div>
          ) : tab === "commits" ? (
            filteredCommits.length === 0 ? (
              <div className="p-8 text-center text-ctp-subtext">
                {searchQuery ? "No matching commits" : "No commits found"}
              </div>
            ) : (
              filteredCommits.map((commit, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={commit.hash}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => onSelectCommit(commit)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach"
                        : "px-4 py-3 hover:bg-ctp-surface0"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs px-2 py-1 rounded-sm bg-ctp-base text-ctp-overlay0 border border-ctp-surface1">
                        {commit.short_hash}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-ctp-text">{commit.message}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ctp-overlay0">
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
                                    className="px-1.5 py-0.5 rounded-sm text-xs bg-ctp-surface0 text-ctp-subtext border border-ctp-surface1"
                                  >
                                    {ref}
                                  </span>
                                ))}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : tab === "branches" ? (
            filteredBranches.length === 0 ? (
              <div className="p-8 text-center text-ctp-subtext">
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
                        ? "px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach"
                        : "px-4 py-3 hover:bg-ctp-surface0"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono text-xs px-2 py-1 rounded-sm bg-ctp-base text-ctp-overlay0 border border-ctp-surface1">
                        {branch.short_hash}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-ctp-text">{branch.name}</div>
                        <div className="text-xs mt-1 text-ctp-overlay0">
                          {branch.subject}
                        </div>
                        <div className="text-xs mt-1 text-ctp-overlay0">
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
                <div className="p-8 text-center text-ctp-subtext">
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
                          ? "px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach"
                          : "px-4 py-3 hover:bg-ctp-surface0"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="font-mono text-xs px-2 py-1 rounded-sm bg-ctp-base text-ctp-overlay0 border border-ctp-surface1">
                          {stackInfo.commit_count}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ctp-text">{stackInfo.name}</span>
                            {stackInfo.is_current && (
                              <span className="text-xs px-1.5 py-0.5 rounded-sm bg-ctp-teal/20 text-ctp-teal border border-ctp-teal/30">
                                current
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-1 text-ctp-overlay0">
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
                <div className="bg-ctp-base border-b border-ctp-surface1 p-3 flex items-center gap-3">
                  <button
                    onClick={onBackToStacks}
                    className="text-ctp-subtext hover:text-ctp-text text-sm px-3 py-1.5 rounded-sm hover:bg-ctp-surface0 transition-colors"
                  >
                    ← Back to stacks
                  </button>
                  <button
                    onClick={() => {
                      const stack = ggStacks.find((s) => s.name === selectedStack);
                      if (stack) onSelectStackDiff(stack);
                    }}
                    className="text-ctp-base text-sm px-3 py-1.5 rounded-sm bg-ctp-mauve hover:opacity-90 transition-opacity"
                  >
                    View full stack diff
                  </button>
                </div>
              )}
              {filteredStacks.length === 0 ? (
                <div className="p-8 text-center text-ctp-subtext">
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
                          ? "px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach"
                          : "px-4 py-3 hover:bg-ctp-surface0"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="font-mono text-xs px-2 py-1 rounded-sm bg-ctp-base text-ctp-overlay0 border border-ctp-surface1">
                          {stackEntry.short_hash}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate text-ctp-text">{stackEntry.title}</span>
                            {stackEntry.mr_number && (
                              <span className="text-xs px-1.5 py-0.5 rounded-sm font-mono bg-ctp-mauve/20 text-ctp-mauve border border-ctp-mauve/30">
                                !{stackEntry.mr_number}
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-1 text-ctp-overlay0">
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
          ) : tab === "ref" ? (
            <div className="p-6">
              <div className="text-ctp-subtext text-sm mb-4">
                Enter a git ref to compare against (e.g., HEAD~1, main~3, abc1234, feature-branch)
              </div>
              <div className="flex gap-2">
                <input
                  ref={refInputRef}
                  type="text"
                  value={refValue}
                  onChange={(e) => setRefValue(e.target.value)}
                  placeholder="HEAD~1"
                  className="flex-1 bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text text-sm px-3 py-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none font-mono"
                />
                <button
                  onClick={() => refValue.trim() && onSelectRef(refValue.trim())}
                  disabled={!refValue.trim()}
                  className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                    refValue.trim()
                      ? "bg-ctp-mauve text-ctp-base hover:opacity-90"
                      : "bg-ctp-surface0 text-ctp-overlay0 cursor-not-allowed border border-ctp-surface1"
                  }`}
                >
                  Compare
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-3 border-t border-ctp-surface1 bg-ctp-base text-xs text-ctp-overlay0">
          {tab === "ref" ? (
            <>
              <span className="mr-4">Enter Compare</span>
              <span>Esc Close</span>
            </>
          ) : (
            <>
              <span className="mr-4">↑↓ Navigate</span>
              <span className="mr-4">Enter Select</span>
              <span>Esc {tab === "stacks" && stackView === "entries" ? "Back" : "Close"}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { fuzzyMatch };
