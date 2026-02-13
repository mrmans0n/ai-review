import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { RepoInfo } from "../types";

export function useRepoManager() {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshRepos = useCallback(async () => {
    try {
      const list = await invoke<RepoInfo[]>("list_repos");
      setRepos(list);
    } catch (err) {
      console.error("Failed to list repos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRepos();
  }, [refreshRepos]);

  const addRepoViaDialog = useCallback(async (): Promise<RepoInfo | null> => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git repository",
    });
    if (!selected) return null;

    const repo = await invoke<RepoInfo>("add_repo", { path: selected });
    await refreshRepos();
    return repo;
  }, [refreshRepos]);

  const removeRepo = useCallback(
    async (path: string) => {
      await invoke("remove_repo", { path });
      await refreshRepos();
    },
    [refreshRepos]
  );

  return { repos, loading, addRepoViaDialog, removeRepo, refreshRepos };
}
