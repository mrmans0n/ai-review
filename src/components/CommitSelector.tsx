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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="inline-flex bg-gray-900 rounded p-1">
            <button
              onClick={() => setTab("commits")}
              className={`px-3 py-1.5 rounded text-sm ${
                tab === "commits" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              Commits
            </button>
            <button
              onClick={() => setTab("branches")}
              className={`px-3 py-1.5 rounded text-sm ${
                tab === "branches" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              Branches
            </button>
            {hasGgStacks && (
              <button
                onClick={() => setTab("stacks")}
                className={`px-3 py-1.5 rounded text-sm ${
                  tab === "stacks" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                Stacks
              </button>
            )}
            <button
              onClick={() => setTab("ref")}
              className={`px-3 py-1.5 rounded text-sm ${
                tab === "ref" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
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
              className="w-full bg-gray-900 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading {tab}...</div>
          ) : tab === "commits" ? (
            filteredCommits.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
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
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 ${
                      isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`font-mono text-xs px-2 py-1 rounded ${
                          isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-900 text-yellow-400"
                        }`}
                      >
                        {commit.short_hash}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{commit.message}</div>
                        <div className={`flex items-center gap-3 mt-1 text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
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
                                    className={`px-1.5 py-0.5 rounded text-xs ${
                                      isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-700 text-gray-300"
                                    }`}
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
              <div className="p-8 text-center text-gray-400">
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
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 ${
                      isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`font-mono text-xs px-2 py-1 rounded ${
                          isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-900 text-purple-400"
                        }`}
                      >
                        {branch.short_hash}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{branch.name}</div>
                        <div className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                          {branch.subject}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
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
                <div className="p-8 text-center text-gray-400">
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
                      className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 ${
                        isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`font-mono text-xs px-2 py-1 rounded ${
                            isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-900 text-green-400"
                          }`}
                        >
                          {stackInfo.commit_count}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{stackInfo.name}</span>
                            {stackInfo.is_current && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  isSelected ? "bg-blue-700 text-blue-100" : "bg-green-700 text-green-100"
                                }`}
                              >
                                current
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
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
                <div className="bg-gray-900 border-b border-gray-700 p-3 flex items-center gap-3">
                  <button
                    onClick={onBackToStacks}
                    className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-gray-700"
                  >
                    ← Back to stacks
                  </button>
                  <button
                    onClick={() => {
                      const stack = ggStacks.find((s) => s.name === selectedStack);
                      if (stack) onSelectStackDiff(stack);
                    }}
                    className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700"
                  >
                    View full stack diff
                  </button>
                </div>
              )}
              {filteredStacks.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
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
                      className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 ${
                        isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`font-mono text-xs px-2 py-1 rounded ${
                            isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-900 text-yellow-400"
                          }`}
                        >
                          {stackEntry.short_hash}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{stackEntry.title}</span>
                            {stackEntry.mr_number && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                  isSelected ? "bg-blue-700 text-blue-100" : "bg-purple-700 text-purple-100"
                                }`}
                              >
                                !{stackEntry.mr_number}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
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
              <div className="text-gray-300 text-sm mb-4">
                Enter a git ref to compare against (e.g., HEAD~1, main~3, abc1234, feature-branch)
              </div>
              <div className="flex gap-2">
                <input
                  ref={refInputRef}
                  type="text"
                  value={refValue}
                  onChange={(e) => setRefValue(e.target.value)}
                  placeholder="HEAD~1"
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  onClick={() => refValue.trim() && onSelectRef(refValue.trim())}
                  disabled={!refValue.trim()}
                  className={`px-4 py-2 rounded transition-colors ${
                    refValue.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Compare
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900 text-xs text-gray-400">
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
