import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitDiffResult, DiffModeConfig } from "../types";

export function useGit(workingDir: string | null) {
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [diffResult, setDiffResult] = useState<GitDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workingDir) return;

    invoke<boolean>("is_git_repo", { path: workingDir })
      .then((result) => {
        setIsGitRepo(result);
        if (result) {
          loadDiff({ mode: "unstaged" });
        }
      })
      .catch((err) => {
        console.error("Failed to check git repo:", err);
        setIsGitRepo(false);
      });
  }, [workingDir]);

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
  };

  return {
    isGitRepo,
    diffResult,
    loading,
    error,
    loadDiff,
  };
}
