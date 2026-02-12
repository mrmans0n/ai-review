import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CommitInfo, BranchInfo } from "../types";

export function useCommitSelector(workingDir: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!workingDir) return;

    setLoading(true);
    try {
      const [commitResult, branchResult] = await Promise.all([
        invoke<CommitInfo[]>("list_commits", {
          path: workingDir,
          limit: 100,
        }),
        invoke<BranchInfo[]>("list_branches", {
          path: workingDir,
        }),
      ]);
      setCommits(commitResult);
      setBranches(branchResult);
    } catch (err) {
      console.error("Failed to load selector data:", err);
    } finally {
      setLoading(false);
    }
  }, [workingDir]);

  const openSelector = useCallback(() => {
    setIsOpen(true);
    loadData();
  }, [loadData]);

  const closeSelector = useCallback(() => {
    setIsOpen(false);
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
    loading,
    openSelector,
    closeSelector,
  };
}
