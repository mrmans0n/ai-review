import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useFileExplorer(workingDir: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

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
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (isOpen && e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (isOpen && e.key === "Enter") {
        e.preventDefault();
        if (filteredFiles.length > 0) {
          onSelectFile(filteredFiles[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const loadFiles = async () => {
    if (!workingDir) return;

    setLoading(true);
    try {
      const result = await invoke<string[]>("list_files", { path: workingDir });
      setFiles(result);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeExplorer = () => {
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);
  };

  const onSelectFile = (filePath: string) => {
    closeExplorer();
    return filePath;
  };

  const filteredFiles = files.filter((file) => {
    const query = searchQuery.toLowerCase();
    const fileName = file.toLowerCase();
    
    let queryIndex = 0;
    for (let i = 0; i < fileName.length && queryIndex < query.length; i++) {
      if (fileName[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === query.length;
  });

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
  };
}
