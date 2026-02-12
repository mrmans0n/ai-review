import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CommitInfo, BranchInfo, GgStackInfo, GgStackEntry } from "../types";

export function useCommitSelector(workingDir: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [hasGgStacks, setHasGgStacks] = useState(false);
  const [ggStacks, setGgStacks] = useState<GgStackInfo[]>([]);
  const [ggStackEntries, setGgStackEntries] = useState<GgStackEntry[]>([]);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!workingDir) return;

    setLoading(true);
    try {
      const hasStacks = await invoke<boolean>("has_gg_stacks", {
        path: workingDir,
      });
      setHasGgStacks(hasStacks);

      const promises: Promise<any>[] = [
        invoke<CommitInfo[]>("list_commits", {
          path: workingDir,
          limit: 100,
        }),
        invoke<BranchInfo[]>("list_branches", {
          path: workingDir,
        }),
      ];

      if (hasStacks) {
        promises.push(
          invoke<GgStackInfo[]>("list_gg_stacks", {
            path: workingDir,
          })
        );
      }

      const results = await Promise.all(promises);
      setCommits(results[0]);
      setBranches(results[1]);
      if (hasStacks && results[2]) {
        setGgStacks(results[2]);
      }
    } catch (err) {
      console.error("Failed to load selector data:", err);
    } finally {
      setLoading(false);
    }
  }, [workingDir]);

  const openSelector = useCallback(() => {
    setIsOpen(true);
    setSelectedStack(null);
    setGgStackEntries([]);
    loadData();
  }, [loadData]);

  const closeSelector = useCallback(() => {
    setIsOpen(false);
    setSelectedStack(null);
    setGgStackEntries([]);
  }, []);

  const selectStack = useCallback(
    async (stack: GgStackInfo) => {
      if (!workingDir) return;

      setSelectedStack(stack.name);
      setLoading(true);
      try {
        const entries = await invoke<GgStackEntry[]>("get_gg_stack_entries", {
          path: workingDir,
          stackName: stack.name,
        });
        setGgStackEntries(entries);
      } catch (err) {
        console.error("Failed to load stack entries:", err);
      } finally {
        setLoading(false);
      }
    },
    [workingDir]
  );

  const backToStacks = useCallback(() => {
    setSelectedStack(null);
    setGgStackEntries([]);
  }, []);

  // Global keyboard shortcut: Ctrl+K (or Cmd+K on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          openSelector();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSelector]);

  return {
    isOpen,
    commits,
    branches,
    hasGgStacks,
    ggStacks,
    ggStackEntries,
    selectedStack,
    loading,
    openSelector,
    closeSelector,
    selectStack,
    backToStacks,
  };
}
