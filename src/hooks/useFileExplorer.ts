import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useFileExplorer(workingDir: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  // Use ref to track filtered files for event handler
  const filteredFilesRef = useRef<string[]>([]);

  const loadFiles = useCallback(async () => {
    if (!workingDir) return;

    setLoading(true);
    try {
      // Backend returns Vec<String>, not Vec<FileEntry>
      const result = await invoke<string[]>(
        "list_files",
        { path: workingDir }
      );
      setFiles(result);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, [workingDir]);

  const closeExplorer = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);
  }, []);

  const onSelectFile = useCallback((filePath: string) => {
    closeExplorer();
    return filePath;
  }, [closeExplorer]);

  useEffect(() => {
    let lastShiftTime = 0;
    const DOUBLE_SHIFT_THRESHOLD = 300;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime < DOUBLE_SHIFT_THRESHOLD) {
          setIsOpen(true);
          loadFiles();
        }
        lastShiftTime = now;
      } else if (isOpen && e.key === "Escape") {
        closeExplorer();
      } else if (isOpen && e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFilesRef.current.length - 1));
      } else if (isOpen && e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (isOpen && e.key === "Enter") {
        e.preventDefault();
        if (filteredFilesRef.current.length > 0) {
          const file = filteredFilesRef.current[selectedIndex];
          onSelectFile(file);
          setPendingSelection(file);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, loadFiles, closeExplorer, onSelectFile]);

  // Fuzzy search with scoring: prioritize filename matches over full path matches
  const scoredFiles = files
    .map((file) => {
      const query = searchQuery.toLowerCase();
      const fullPath = file.toLowerCase();
      const fileName = file.split("/").pop()?.toLowerCase() || "";

      // Check if query matches filename
      let fileNameIndex = 0;
      for (let i = 0; i < fileName.length && fileNameIndex < query.length; i++) {
        if (fileName[i] === query[fileNameIndex]) {
          fileNameIndex++;
        }
      }
      const fileNameMatches = fileNameIndex === query.length;

      // Check if query matches full path
      let fullPathIndex = 0;
      for (let i = 0; i < fullPath.length && fullPathIndex < query.length; i++) {
        if (fullPath[i] === query[fullPathIndex]) {
          fullPathIndex++;
        }
      }
      const fullPathMatches = fullPathIndex === query.length;

      // Calculate score: filename matches get higher scores
      let score = 0;
      if (fileNameMatches) {
        // Higher score for filename matches, bonus for exact prefix
        score = 100 + (fileName.startsWith(query) ? 50 : 0);
      } else if (fullPathMatches) {
        // Lower score for path matches
        score = 50;
      }

      return { file, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.file);

  const filteredFiles = scoredFiles;

  // Update ref whenever filteredFiles changes
  filteredFilesRef.current = filteredFiles;

  return {
    isOpen,
    files: filteredFiles,
    searchQuery,
    setSearchQuery,
    selectedIndex,
    setSelectedIndex,
    loading,
    closeExplorer,
    onSelectFile,
    pendingSelection,
    clearPendingSelection: () => setPendingSelection(null),
  };
}
