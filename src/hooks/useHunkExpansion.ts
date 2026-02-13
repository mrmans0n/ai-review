import { useState, useCallback, useRef, useEffect } from "react";
import { expandFromRawCode } from "react-diff-view";
import { invoke } from "@tauri-apps/api/core";
import type { DiffMode } from "../types";

type HunkData = any;

export function useHunkExpansion(
  filePath: string,
  originalHunks: HunkData[],
  workingDir: string | null,
  diffMode: DiffMode,
  commitRef: string | null
) {
  const [expandedHunksMap, setExpandedHunksMap] = useState<Record<string, HunkData[]>>({});
  const sourceCache = useRef<Record<string, string[]>>({});

  // Reset when diff mode or commit ref changes
  useEffect(() => {
    setExpandedHunksMap({});
    sourceCache.current = {};
  }, [diffMode, commitRef]);

  const fetchSource = useCallback(
    async (file: string): Promise<string[]> => {
      if (sourceCache.current[file]) {
        return sourceCache.current[file];
      }

      if (!workingDir) {
        throw new Error("No working directory");
      }

      let content: string;

      if (diffMode === "unstaged") {
        content = await invoke<string>("read_file_content", {
          path: workingDir,
          filePath: file,
        });
      } else if (diffMode === "staged") {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ":0",
          filePath: file,
        });
      } else {
        // commit mode — use the commitRef
        const ref = commitRef || "HEAD";
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ref,
          filePath: file,
        });
      }

      const lines = content.split("\n");
      sourceCache.current[file] = lines;
      return lines;
    },
    [workingDir, diffMode, commitRef]
  );

  const expandRange = useCallback(
    async (file: string, start: number, end: number) => {
      const source = await fetchSource(file);
      const currentHunks = expandedHunksMap[file] || originalHunks;
      const expanded = expandFromRawCode(currentHunks, source, start, end);
      setExpandedHunksMap((prev) => ({ ...prev, [file]: expanded }));
    },
    [fetchSource, expandedHunksMap, originalHunks]
  );

  const hunks = expandedHunksMap[filePath] || originalHunks;

  return { hunks, expandRange };
}
