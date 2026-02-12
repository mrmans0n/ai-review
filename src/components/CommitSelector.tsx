import { useEffect, useMemo, useRef, useState } from "react";
import type { BranchInfo, CommitInfo } from "../types";

type SelectorTab = "commits" | "branches";

interface CommitSelectorProps {
  isOpen: boolean;
  commits: CommitInfo[];
  branches: BranchInfo[];
  loading: boolean;
  onSelectCommit: (commit: CommitInfo) => void;
  onSelectBranch: (branch: BranchInfo) => void;
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
  onSelectCommit,
  onSelectBranch,
  onClose,
}: CommitSelectorProps) {
  const [tab, setTab] = useState<SelectorTab>("commits");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const activeCount = tab === "commits" ? filteredCommits.length : filteredBranches.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, tab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
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
        }
        if (tab === "branches" && filteredBranches[selectedIndex]) {
          onSelectBranch(filteredBranches[selectedIndex]);
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
    filteredCommits,
    filteredBranches,
    onSelectCommit,
    onSelectBranch,
    onClose,
  ]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery("");
      setTab("commits");
    }
  }, [isOpen]);

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
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              tab === "commits"
                ? "Search commits... (message, hash, author, refs)"
                : "Search branches... (name, hash, subject, author)"
            }
            className="w-full bg-gray-900 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          ) : filteredBranches.length === 0 ? (
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
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900 text-xs text-gray-400">
          <span className="mr-4">↑↓ Navigate</span>
          <span className="mr-4">Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

export { fuzzyMatch };
