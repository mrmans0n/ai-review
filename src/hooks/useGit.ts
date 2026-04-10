import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { GitDiffResult, DiffModeConfig, GitChangeStatus } from "../types";

export function useGit(workingDir: string | null) {
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [diffResult, setDiffResult] = useState<GitDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeStatus, setChangeStatus] = useState<GitChangeStatus>({
    has_staged: false,
    has_unstaged: false,
  });

  const refreshChangeStatus = useCallback(async () => {
    if (!workingDir) return;
    try {
      const status = await invoke<GitChangeStatus>("get_git_change_status", {
        path: workingDir,
      });
      setChangeStatus(status);
    } catch (err) {
      console.error("Failed to get git change status:", err);
    }
  }, [workingDir]);

  useEffect(() => {
    if (!workingDir) return;

    invoke<boolean>("is_git_repo", { path: workingDir })
      .then((result) => {
        setIsGitRepo(result);
        if (result) {
          refreshChangeStatus();
          loadDiff({ mode: "unstaged" });
        }
      })
      .catch((err) => {
        console.error("Failed to check git repo:", err);
        setIsGitRepo(false);
      });
  }, [workingDir]);

  // Refresh change status on window focus
  useEffect(() => {
    if (!workingDir || !isGitRepo) return;

    const unlistenPromise = listen("tauri://focus", () => {
      refreshChangeStatus();
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [workingDir, isGitRepo, refreshChangeStatus]);

  const loadDiff = async (config: DiffModeConfig) => {
    if (!workingDir) return;

    setLoading(true);
    setError(null);

    try {
      let result: GitDiffResult;

      if (config.mode === "unstaged") {
        result = await invoke<GitDiffResult>("get_unstaged_diff", {
          path: workingDir,
        });
      } else if (config.mode === "staged") {
        result = await invoke<GitDiffResult>("get_staged_diff", {
          path: workingDir,
        });
      } else if (config.mode === "commit" && config.commitRef) {
        result = await invoke<GitDiffResult>("get_commit_ref_diff", {
          path: workingDir,
          commit: config.commitRef,
        });
      } else if (config.mode === "range" && config.range) {
        result = await invoke<GitDiffResult>("get_range_diff", {
          path: workingDir,
          range: config.range,
        });
      } else if (config.mode === "branch" && config.branchName) {
        result = await invoke<GitDiffResult>("get_branch_diff", {
          path: workingDir,
          branch: config.branchName,
        });
      } else {
        throw new Error("Invalid diff mode configuration");
      }

      setDiffResult(result);
    } catch (err) {
      setError(err as string);
      console.error("Failed to load diff:", err);
    } finally {
      setLoading(false);
    }

    // Refresh change status after loading a diff (changes may have occurred)
    refreshChangeStatus();
  };

  return {
    isGitRepo,
    diffResult,
    loading,
    error,
    loadDiff,
    changeStatus,
    refreshChangeStatus,
  };
}
