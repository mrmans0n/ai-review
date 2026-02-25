import { useState, useEffect, useRef } from "react";
import { parseDiff, Diff, Hunk, Decoration, getChangeKey, getCollapsedLinesCountBetween, expandFromRawCode } from "react-diff-view";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "react-diff-view/style/index.css";
import "./diff.css";
import { highlight } from "./highlight";
import { useGit } from "./hooks/useGit";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { useCommitSelector } from "./hooks/useCommitSelector";
import { useComments } from "./hooks/useComments";
import { useRepoManager } from "./hooks/useRepoManager";
import { useSearch } from "./hooks/useSearch";
import { useWordHighlight } from "./hooks/useWordHighlight";
import { useTheme } from './hooks/useTheme';
import { FileExplorer } from "./components/FileExplorer";
import { CommitSelector } from "./components/CommitSelector";
import { FileList } from "./components/FileList";
import { FileViewer } from "./components/FileViewer";
import { SearchBar } from "./components/SearchBar";
import { AddCommentForm } from "./components/AddCommentForm";
import { CommentWidget } from "./components/CommentWidget";
import { PromptPreview } from "./components/PromptPreview";
import { CommentOverview } from "./components/CommentOverview";
import { RepoLandingPage } from "./components/RepoLandingPage";
import { RepoSwitcher } from "./components/RepoSwitcher";
import { ConfirmModal } from "./components/ConfirmModal";
import { ScrollProgressBar } from "./components/ScrollProgressBar";
import { generatePrompt } from "./lib/promptGenerator";
import { resolveLineFromNode } from "./lib/resolveLineFromNode";
import { extractLinesFromHunks } from "./lib/extractLinesFromHunks";
import { HunkExpandControl } from "./components/HunkExpandControl";
import type { DiffModeConfig, CommitInfo, BranchInfo, GgStackInfo, GgStackEntry, WorktreeInfo, GitDiffResult, ChangedFile } from "./types";

type InitialDiffMode = {
  type: "commit" | "range" | "branch";
  value: string;
};

function App() {
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [diffText, setDiffText] = useState("");
  const [viewType, setViewType] = useState<"split" | "unified">("split");
  const [diffMode, setDiffMode] = useState<DiffModeConfig>({ mode: "unstaged" });
  const [viewMode, setViewMode] = useState<"diff" | "file">("diff");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [addingCommentAt, setAddingCommentAt] = useState<{
    file: string;
    startLine: number;
    endLine: number;
    side: "old" | "new";
  } | null>(null);
  const [lastFocusedLine, setLastFocusedLine] = useState<{
    file: string;
    line: number;
    side: "old" | "new";
  } | null>(null);
  const [hoveredLine, setHoveredLine] = useState<{
    file: string;
    line: number;
    side: "old" | "new";
  } | null>(null);
  const [selectingRange, setSelectingRange] = useState<{
    file: string;
    startLine: number;
    side: "old" | "new";
  } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    file: string;
    startLine: number;
    endLine: number;
    side: "old" | "new";
  } | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [waitMode, setWaitMode] = useState(false);
  const [initialDiffMode, setInitialDiffMode] = useState<InitialDiffMode | null>(null);
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [cliJustInstalled, setCliJustInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [hoveredCommentIds, setHoveredCommentIds] = useState<string[] | null>(null);
  const [showCommentOverview, setShowCommentOverview] = useState(false);
  const suppressNextClickRef = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [expandedHunksMap, setExpandedHunksMap] = useState<Record<string, any[]>>({});
  const sourceCache = useRef<Record<string, string[]>>({});
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());

  const { theme, toggle: toggleTheme } = useTheme();

  const repoManager = useRepoManager();
  const search = useSearch();
  const wordHighlight = useWordHighlight(search.isOpen);
  const [pendingSwitchPath, setPendingSwitchPath] = useState<string | null>(null);

  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
    editingCommentId,
    startEditing,
    stopEditing,
    clearAll,
  } = useComments();

  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchInfo | null>(null);
  const [reviewingLabel, setReviewingLabel] = useState<string | null>(null);

  const { isGitRepo, diffResult, loading, error, loadDiff } = useGit(workingDir);
  const fileExplorerRef = selectedCommit?.hash ?? selectedBranch?.name ?? null;
  const fileExplorer = useFileExplorer(workingDir, fileExplorerRef);
  const commitSelector = useCommitSelector(workingDir);

  useEffect(() => {
    invoke<string>("get_working_directory")
      .then((dir) => {
        console.log("Working directory:", dir);
        setWorkingDir(dir);
      })
      .catch((err) => {
        console.error("Failed to get working directory:", err);
      });

    invoke<boolean>("is_wait_mode")
      .then((enabled) => {
        setWaitMode(enabled);
      })
      .catch((err) => {
        console.error("Failed to read wait mode:", err);
      });

    invoke<InitialDiffMode | null>("get_initial_diff_mode")
      .then((mode) => {
        setInitialDiffMode(mode);
      })
      .catch((err) => {
        console.error("Failed to read initial diff mode:", err);
      });

    // Check if CLI is already installed
    invoke<boolean>("check_cli_installed")
      .then((installed) => {
        setCliInstalled(installed);
      })
      .catch((err) => {
        console.error("Failed to check CLI installation:", err);
      });

    const savedSidebarWidth = window.localStorage.getItem("changed-files-sidebar-width");
    if (savedSidebarWidth) {
      const parsedWidth = Number.parseInt(savedSidebarWidth, 10);
      if (!Number.isNaN(parsedWidth)) {
        setSidebarWidth(Math.min(Math.floor(window.innerWidth * 2 / 3), Math.max(150, parsedWidth)));
      }
    }

    const savedSidebarVisibility = window.localStorage.getItem("changed-files-sidebar-visible");
    if (savedSidebarVisibility !== null) {
      setIsSidebarVisible(savedSidebarVisibility === "true");
    }
  }, []);

  // Listen for native menu "Install CLI" event
  useEffect(() => {
    const unlisten = listen("menu-install-cli", () => {
      handleInstallCli();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (diffResult) {
      setDiffText(diffResult.diff || "No changes");
      setChangedFiles(diffResult.files);
      setViewMode("diff");
    }
  }, [diffResult]);

  useEffect(() => {
    if (!workingDir || !isGitRepo || !initialDiffMode) return;

    const mode = initialDiffMode;
    setInitialDiffMode(null);

    const applyInitialMode = async () => {
      try {
        if (mode.type === "commit") {
          const [result, commits] = await Promise.all([
            invoke<GitDiffResult>("get_commit_diff", {
              path: workingDir,
              hash: mode.value,
            }),
            invoke<CommitInfo[]>("list_commits", {
              path: workingDir,
              limit: 200,
            }),
          ]);

          setDiffText(result.diff || "No changes in this commit");
          setChangedFiles(result.files);
          setDiffMode({ mode: "commit", commitRef: mode.value });
          setSelectedCommit(
            commits.find(
              (commit) =>
                commit.hash === mode.value || commit.short_hash === mode.value
            ) || null
          );
          setSelectedBranch(null);
        } else if (mode.type === "range") {
          const result = await invoke<GitDiffResult>("get_range_diff", {
            path: workingDir,
            range: mode.value,
          });
          setDiffText(result.diff || "No changes in this range");
          setChangedFiles(result.files);
          setDiffMode({ mode: "range", range: mode.value });
          setSelectedCommit(null);
          setSelectedBranch(null);
        } else if (mode.type === "branch") {
          const [result, branches] = await Promise.all([
            invoke<GitDiffResult>("get_branch_diff", {
              path: workingDir,
              branch: mode.value,
            }),
            invoke<BranchInfo[]>("list_branches", {
              path: workingDir,
            }),
          ]);
          setDiffText(result.diff || "No changes in this branch comparison");
          setChangedFiles(result.files);
          setDiffMode({ mode: "branch", branchName: mode.value });
          setSelectedBranch(
            branches.find((branch) => branch.name === mode.value) || null
          );
          setSelectedCommit(null);
        }

        setViewMode("diff");
      } catch (err) {
        console.error("Failed to apply initial diff mode:", err);
      }
    };

    applyInitialMode();
  }, [workingDir, isGitRepo, initialDiffMode]);

  const files = diffText ? parseDiff(diffText) : [];
  const renderableFiles = files.filter((file: any) => file.hunks && file.hunks.length > 0);
  const viewedCount = renderableFiles.filter((file: any) => viewedFiles.has(file.newPath || file.oldPath)).length;

  useEffect(() => {
    getCurrentWindow().setTitle(reviewingLabel ? `Reviewing ${reviewingLabel}` : "ai-review");
  }, [reviewingLabel]);

  const btnBase = "px-3 py-1.5 text-sm rounded-sm transition-colors border";
  const btnDefault = `${btnBase} bg-transparent border-ctp-surface1 text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text hover:border-ctp-overlay0`;
  const btnActive = `${btnBase} bg-ctp-surface1 border-ctp-peach text-ctp-text`;
  const btnIcon = "p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors";
  const btnIconActive = "p-1.5 rounded-sm text-ctp-text bg-ctp-surface1 border border-ctp-peach transition-colors";

  useEffect(() => {
    window.localStorage.setItem("changed-files-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem("changed-files-sidebar-visible", String(isSidebarVisible));
  }, [isSidebarVisible]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.min(Math.floor(window.innerWidth * 2 / 3), Math.max(150, event.clientX));
      setSidebarWidth(nextWidth);
    };

    const stopResizing = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "c" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault(); // Prevent 'c' from being typed into the textarea

        // Check if there's a text selection inside a diff area
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startContainer = range.startContainer;
          const endContainer = range.endContainer;

          const startInfo = resolveLineFromNode(startContainer);
          const endInfo = resolveLineFromNode(endContainer);

          if (startInfo && endInfo && startInfo.file === endInfo.file) {
            const minLine = Math.min(startInfo.line, endInfo.line);
            const maxLine = Math.max(startInfo.line, endInfo.line);
            setLastFocusedLine({ file: startInfo.file, line: minLine, side: startInfo.side });
            if (minLine !== maxLine) {
              setAddingCommentAt({
                file: startInfo.file,
                startLine: minLine,
                endLine: maxLine,
                side: startInfo.side,
              });
            } else {
              handleLineClick(startInfo.file, minLine, startInfo.side);
            }
            selection.removeAllRanges();
            return;
          }
        }

        // Fallback: prefer hovered line, then last focused line, then first file
        const targetLine = hoveredLine || lastFocusedLine;
        if (targetLine) {
          handleLineClick(targetLine.file, targetLine.line, targetLine.side);
        } else if (files.length > 0) {
          const fileName = files[0].newPath || files[0].oldPath;
          handleLineClick(fileName, 1, "new");
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [files, lastFocusedLine, hoveredLine]);

  // Keep drag selection working even when gutter mouseenter events do not fire
  useEffect(() => {
    if (!selectingRange) return;

    const handleDocumentMouseMove = (event: MouseEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const lineInfo = resolveLineFromNode(target);

      if (!lineInfo) return;

      setHoveredLine({
        file: lineInfo.file,
        line: lineInfo.line,
        side: lineInfo.side,
      });

      if (
        lineInfo.file === selectingRange.file &&
        lineInfo.side === selectingRange.side
      ) {
        const startLine = Math.min(selectingRange.startLine, lineInfo.line);
        const endLine = Math.max(selectingRange.startLine, lineInfo.line);
        setSelectedRange({
          file: lineInfo.file,
          startLine,
          endLine,
          side: lineInfo.side,
        });
      }
    };

    const handleDocumentMouseUp = () => {
      if (selectedRange) {
        setAddingCommentAt({
          file: selectedRange.file,
          startLine: selectedRange.startLine,
          endLine: selectedRange.endLine,
          side: selectedRange.side,
        });
        suppressNextClickRef.current = true;
      }

      setSelectingRange(null);
      setSelectedRange(null);
    };

    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [selectingRange, selectedRange]);

  // Constrain text selection to one column in split view
  useEffect(() => {
    if (viewType !== "split") return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      let el = e.target as HTMLElement | null;
      while (el && !el.classList.contains("diff-code")) {
        if (el.classList.contains("diff")) break;
        el = el.parentElement;
      }
      if (!el || !el.classList.contains("diff-code") || !el.parentElement) return;

      const table = el.closest("table.diff-split") as HTMLElement | null;
      if (!table) return;

      const index = [...el.parentElement.children].indexOf(el);
      if (index === 1) {
        table.setAttribute("data-selecting", "old");
      } else if (index === 3) {
        table.setAttribute("data-selecting", "new");
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [viewType]);

  const handleModeChange = (newMode: DiffModeConfig) => {
    setDiffMode(newMode);
    loadDiff(newMode);
    setReviewingLabel(null);
  };

  const toggleViewed = (fileName: string) => {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const handleSwitchRepo = async (path: string) => {
    if (path === workingDir) return;
    if (comments.length > 0) {
      setPendingSwitchPath(path);
      return;
    }
    await performSwitch(path);
  };

  const performSwitch = async (path: string) => {
    try {
      const result = await invoke<GitDiffResult>("switch_repo", { path });
      setWorkingDir(path);
      setDiffText(result.diff || "No changes");
      setChangedFiles(result.files);
      setDiffMode({ mode: "unstaged" });
      setSelectedCommit(null);
      setSelectedBranch(null);
      setReviewingLabel(null);
      setExpandedHunksMap({});
      sourceCache.current = {};
      setViewMode("diff");
      setSelectedFile(undefined);
      setCurrentFile(null);
      setAddingCommentAt(null);
      setSelectingRange(null);
      setSelectedRange(null);
      setLastFocusedLine(null);
      clearAll();
      setViewedFiles(new Set());
      setPendingSwitchPath(null);
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to switch repo:", err);
    }
  };

  const handleConfirmSwitch = async () => {
    if (pendingSwitchPath) {
      await performSwitch(pendingSwitchPath);
    }
  };

  const handleCancelSwitch = () => {
    setPendingSwitchPath(null);
  };

  const handleAddRepo = async () => {
    const repo = await repoManager.addRepoViaDialog();
    if (repo) {
      await handleSwitchRepo(repo.path);
    }
  };

  const handleRemoveRepo = async (path: string) => {
    await repoManager.removeRepo(path);
    if (path === workingDir) {
      setWorkingDir(null);
      setDiffText("");
    }
  };

  // Clear expansion state when diff changes
  useEffect(() => {
    setExpandedHunksMap({});
    sourceCache.current = {};
  }, [diffMode, selectedCommit, selectedBranch]);

  const fetchFileSource = async (filePath: string): Promise<string[]> => {
    if (sourceCache.current[filePath]) {
      return sourceCache.current[filePath];
    }

    if (!workingDir) throw new Error("No working directory");

    let content: string;

    // expandFromRawCode needs the OLD side of the diff (the base version),
    // because hunk line numbers (oldStart/oldLines) reference the old file.
    // Using the new version would produce mismatched content and duplicate lines.
    let oldRef: string;
    if (diffMode.mode === "unstaged") {
      // Unstaged diff compares working tree vs index, so old side = index (:0)
      oldRef = ":0";
    } else if (diffMode.mode === "staged") {
      // Staged diff compares index vs HEAD, so old side = HEAD
      oldRef = "HEAD";
    } else if (diffMode.mode === "commit") {
      oldRef = `${diffMode.commitRef || "HEAD"}~1`;
    } else if (diffMode.mode === "range" && diffMode.range) {
      // Range is "A..B" — old side is A
      const rangeBase = diffMode.range.split("..")[0];
      oldRef = rangeBase || "HEAD";
    } else if (diffMode.mode === "branch" && diffMode.branchName) {
      // Branch diff: resolve the actual merge-base dynamically
      try {
        oldRef = await invoke<string>("get_branch_base", {
          path: workingDir,
          branch: diffMode.branchName,
        });
      } catch {
        oldRef = "HEAD";
      }
    } else {
      oldRef = "HEAD";
    }

    try {
      content = await invoke<string>("get_file_at_ref", {
        path: workingDir,
        gitRef: oldRef,
        filePath,
      });
    } catch {
      // Fallback for new files (no old version exists): use the new version
      if (diffMode.mode === "unstaged") {
        content = await invoke<string>("read_file_content", {
          path: workingDir,
          filePath,
        });
      } else if (diffMode.mode === "staged") {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ":0",
          filePath,
        });
      } else {
        const ref = diffMode.commitRef || diffMode.branchName || "HEAD";
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ref,
          filePath,
        });
      }
    }

    const lines = content.split("\n");
    sourceCache.current[filePath] = lines;
    return lines;
  };

  const handleExpandRange = async (filePath: string, originalHunks: any[], start: number, end: number) => {
    try {
      const source = await fetchFileSource(filePath);
      const currentHunks = expandedHunksMap[filePath] || originalHunks;
      const expanded = expandFromRawCode(currentHunks, source, start, end);
      setExpandedHunksMap((prev) => ({ ...prev, [filePath]: expanded }));
    } catch (err) {
      console.error("Failed to expand context:", err);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);

    if (!workingDir) return;

    try {
      let content: string;

      if (selectedCommit) {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: selectedCommit.hash,
          filePath,
        });
      } else if (selectedBranch) {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: selectedBranch.name,
          filePath,
        });
      } else if (diffMode.mode === "staged") {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ":0",
          filePath,
        });
      } else {
        content = await invoke<string>("read_file_content", {
          path: workingDir,
          filePath,
        });
      }

      setFileContent(content);
      setCurrentFile(filePath);
      setViewMode("file");
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  // Handle Enter key selection in file explorer
  useEffect(() => {
    if (fileExplorer.pendingSelection) {
      handleFileSelect(fileExplorer.pendingSelection);
      fileExplorer.clearPendingSelection();
    }
  }, [fileExplorer.pendingSelection]);

  const handleExplorerSelect = async (filePath: string) => {
    const file = await fileExplorer.onSelectFile(filePath);
    await handleFileSelect(file);
    return file;
  };

  const handleCommitSelect = async (commit: CommitInfo) => {
    if (!workingDir) return;

    try {
      const result = await invoke<GitDiffResult>("get_commit_diff", {
        path: workingDir,
        hash: commit.hash,
      });
      setDiffText(result.diff || "No changes in this commit");
      setChangedFiles(result.files);
      setSelectedCommit(commit);
      setSelectedBranch(null);
      setReviewingLabel(`${commit.short_hash} ${commit.message}`);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load commit diff:", err);
    }
  };

  const handleBranchSelect = async (branch: BranchInfo) => {
    if (!workingDir) return;

    try {
      const result = await invoke<GitDiffResult>("get_branch_diff", {
        path: workingDir,
        branch: branch.name,
      });
      setDiffText(result.diff || "No changes in this branch comparison");
      setChangedFiles(result.files);
      setSelectedBranch(branch);
      setSelectedCommit(null);
      setReviewingLabel(branch.name);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load branch diff:", err);
    }
  };

  const handleStackSelect = async (stack: GgStackInfo) => {
    await commitSelector.selectStack(stack);
  };

  const handleStackEntrySelect = async (entry: GgStackEntry) => {
    if (!workingDir || !commitSelector.selectedStack) return;

    try {
      const result = await invoke<string>("get_gg_entry_diff", {
        path: workingDir,
        stackName: commitSelector.selectedStack,
        hash: entry.hash,
      });
      setDiffText(result || "No changes in this entry");
      setSelectedCommit(null);
      setSelectedBranch(null);
      setReviewingLabel(`${entry.short_hash} ${entry.title}`);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load entry diff:", err);
    }
  };

  const handleStackDiffSelect = async (stack: GgStackInfo) => {
    if (!workingDir) return;

    try {
      const result = await invoke<string>("get_gg_stack_diff", {
        path: workingDir,
        stackName: stack.name,
      });
      setDiffText(result || "No changes in this stack");
      setSelectedCommit(null);
      setSelectedBranch(null);
      setReviewingLabel(stack.name);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load stack diff:", err);
    }
  };

  const handleWorktreeSelect = async (worktree: WorktreeInfo) => {
    if (worktree.path === workingDir) {
      commitSelector.closeSelector();
      return;
    }

    if (comments.length > 0) {
      setPendingSwitchPath(worktree.path);
      return;
    }

    await performSwitch(worktree.path);
  };

  const handleRefSelect = async (ref: string) => {
    if (!workingDir) return;

    try {
      const result = await invoke<GitDiffResult>("get_commit_ref_diff", {
        path: workingDir,
        commit: ref,
      });
      setDiffText(result.diff || "No changes for this ref");
      setChangedFiles(result.files);
      setDiffMode({ mode: "commit", commitRef: ref });
      setSelectedCommit(null);
      setSelectedBranch(null);
      setReviewingLabel(ref);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load ref diff:", err);
      commitSelector.setRefError(
        `Invalid ref "${ref}". Please enter a valid commit hash, branch name, or ref expression (e.g. HEAD~3).`
      );
    }
  };

  const handleLineClick = (file: string, line: number, side: "old" | "new") => {
    setLastFocusedLine({ file, line, side });
    setAddingCommentAt({
      file,
      startLine: line,
      endLine: line,
      side,
    });
  };

  const handleAddComment = (text: string) => {
    if (addingCommentAt) {
      addComment(
        addingCommentAt.file,
        addingCommentAt.startLine,
        addingCommentAt.endLine,
        addingCommentAt.side,
        text
      );
      setAddingCommentAt(null);
    }
  };

  const handleGeneratePrompt = () => {
    setShowPromptPreview(true);
  };

  const handleInstallCli = async () => {
    try {
      const result = await invoke<{
        success: boolean;
        message: string;
        path_warning: boolean;
      }>("install_cli");
      
      if (result.success) {
        setCliInstalled(true);
        setCliJustInstalled(true);
        setTimeout(() => setCliJustInstalled(false), 3000);
        if (result.path_warning) {
          setInstallMessage(
            `${result.message}\n\nTo add ~/.local/bin to your PATH, add this line to your shell config:\nexport PATH="$HOME/.local/bin:$PATH"`
          );
        } else {
          setInstallMessage(result.message);
        }
        setTimeout(() => setInstallMessage(null), 5000);
      }
    } catch (err) {
      setInstallMessage(`Failed to install CLI: ${err}`);
      setTimeout(() => setInstallMessage(null), 5000);
    }
  };

  // Extract side and line number from a change object
  const getChangeSide = (change: any): "old" | "new" => {
    if (change.isNormal) return "new";
    return change.type === "insert" ? "new" : "old";
  };

  const getChangeLineNumber = (change: any, side: "old" | "new"): number | undefined => {
    if (change.isNormal) {
      return side === "new" ? change.newLineNumber : change.oldLineNumber;
    }
    return change.lineNumber;
  };

  // Find the change key for a given line number and side in the hunks
  const findChangeKey = (hunks: any[], lineNum: number, side: "old" | "new"): string | null => {
    for (const hunk of hunks) {
      for (const change of hunk.changes) {
        if (change.isNormal) {
          if ((side === "new" && change.newLineNumber === lineNum) ||
              (side === "old" && change.oldLineNumber === lineNum)) {
            return getChangeKey(change);
          }
        } else if (change.type === "insert" && side === "new" && change.lineNumber === lineNum) {
          return getChangeKey(change);
        } else if (change.type === "delete" && side === "old" && change.lineNumber === lineNum) {
          return getChangeKey(change);
        }
      }
    }
    return null;
  };

  // Get all change keys for a line range (for highlighting)
  const getChangeKeysForRange = (hunks: any[], startLine: number, endLine: number, side: "old" | "new"): string[] => {
    const keys: string[] = [];
    for (const hunk of hunks) {
      for (const change of hunk.changes) {
        let lineNum: number | undefined;
        let changeSide: "old" | "new";

        if (change.isNormal) {
          lineNum = side === "new" ? change.newLineNumber : change.oldLineNumber;
          changeSide = side;
        } else if (change.type === "insert") {
          lineNum = change.lineNumber;
          changeSide = "new";
        } else {
          lineNum = change.lineNumber;
          changeSide = "old";
        }

        if (changeSide === side && lineNum !== undefined && lineNum >= startLine && lineNum <= endLine) {
          keys.push(getChangeKey(change));
        }
      }
    }
    return keys;
  };

  // Build widgets map for inline comments and add-comment form
  const buildFileWidgets = (
    file: any,
    fileComments: import("./types").Comment[],
    fileHunks: any[],
  ): Record<string, React.ReactNode> => {
    const widgets: Record<string, React.ReactNode> = {};
    const fileName = file.newPath || file.oldPath;

    // Group comments by endLine + side
    const commentsByEndLine = new Map<string, import("./types").Comment[]>();
    for (const comment of fileComments) {
      const key = `${comment.side}-${comment.endLine}`;
      if (!commentsByEndLine.has(key)) commentsByEndLine.set(key, []);
      commentsByEndLine.get(key)!.push(comment);
    }

    // Wrap widget content with side info for split view alignment
    const wrapForSide = (content: React.ReactNode, side: "old" | "new") => {
      if (viewType !== "split") return content;
      return (
        <div className={`split-widget-${side}`}>
          {content}
        </div>
      );
    };

    // Map comments to change keys
    for (const [lookupKey, commentsAtLine] of commentsByEndLine) {
      const [side, lineStr] = lookupKey.split("-");
      const lineNum = parseInt(lineStr, 10);
      const changeKey = findChangeKey(file.hunks, lineNum, side as "old" | "new");
      if (changeKey) {
        const commentWidget = wrapForSide(
          <div
            className="px-4 py-2 bg-ctp-mantle border-t border-b border-ctp-surface1"
            onMouseEnter={() => setHoveredCommentIds(commentsAtLine.map(c => c.id))}
            onMouseLeave={() => setHoveredCommentIds(null)}
          >
            <CommentWidget
              comments={commentsAtLine}
              onEdit={updateComment}
              onDelete={deleteComment}
              editingId={editingCommentId}
              onStartEdit={startEditing}
              onStopEdit={stopEditing}
            />
          </div>,
          side as "old" | "new"
        );
        widgets[changeKey] = commentWidget;
      }
    }

    // Add comment form as inline widget
    if (addingCommentAt && addingCommentAt.file === fileName) {
      const formChangeKey = findChangeKey(file.hunks, addingCommentAt.endLine, addingCommentAt.side);
      if (formChangeKey) {
        const existingWidget = widgets[formChangeKey];
        const formWidget = wrapForSide(
          <div className="px-4 py-2 bg-ctp-mantle border-t border-b border-ctp-surface1">
            <AddCommentForm
              file={addingCommentAt.file}
              startLine={addingCommentAt.startLine}
              endLine={addingCommentAt.endLine}
              side={addingCommentAt.side}
              onSubmit={handleAddComment}
              onCancel={() => setAddingCommentAt(null)}
              prefilledCode={extractLinesFromHunks(
                fileHunks,
                addingCommentAt.startLine,
                addingCommentAt.endLine,
                addingCommentAt.side
              )}
              language={detectLanguage(fileName)}
            />
          </div>,
          addingCommentAt.side
        );
        widgets[formChangeKey] = <>{existingWidget}{formWidget}</>;
      }
    }

    return widgets;
  };

  const renderFile = (file: any) => {
    const fileName = file.newPath || file.oldPath;
    const isViewed = viewedFiles.has(fileName);
    const fileHunks = expandedHunksMap[fileName] || file.hunks;
    if (!fileHunks || fileHunks.length === 0) return null;
    const tokens = highlight(fileHunks, {
      language: detectLanguage(fileName),
    });
    const fileComments = comments.filter((c) => c.file === fileName);
    const fileWidgets = buildFileWidgets(file, fileComments, fileHunks);

    // Build selectedChanges for hover highlighting and drag selection
    const highlightedChangeKeys: string[] = [];
    if (hoveredCommentIds && hoveredCommentIds.length > 0) {
      for (const comment of fileComments) {
        if (hoveredCommentIds.includes(comment.id)) {
          highlightedChangeKeys.push(
            ...getChangeKeysForRange(fileHunks, comment.startLine, comment.endLine, comment.side)
          );
        }
      }
    }
    // Highlight drag selection range
    if (selectedRange && selectedRange.file === fileName) {
      highlightedChangeKeys.push(
        ...getChangeKeysForRange(fileHunks, selectedRange.startLine, selectedRange.endLine, selectedRange.side)
      );
    }

    return (
      <div key={file.oldPath + file.newPath} className="mb-6" data-diff-file={file.newPath || file.oldPath}>
        <div
          className={`px-4 py-2 font-medium border-b border-ctp-surface1 flex justify-between items-center transition-colors text-sm ${
            isViewed ? "bg-ctp-surface0/80 text-ctp-subtext" : "bg-ctp-surface0 text-ctp-text"
          }`}
          onClick={() => {
            if (isViewed) {
              toggleViewed(fileName);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div>
              {file.type === "delete" && (
                <span className="text-ctp-red font-semibold">Deleted: {file.oldPath}</span>
              )}
              {file.type === "add" && (
                <span className="text-ctp-green font-semibold">Added: {file.newPath}</span>
              )}
              {file.type === "modify" && (
                <span className="text-ctp-blue font-semibold">Modified: {file.newPath}</span>
              )}
              {file.type === "rename" && (
                <span className="text-ctp-yellow font-semibold">
                  Renamed: {file.oldPath} → {file.newPath}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label
              className="flex items-center gap-2 text-xs uppercase tracking-wide text-ctp-subtext cursor-pointer"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isViewed}
                onChange={() => toggleViewed(fileName)}
                className="h-4 w-4 rounded border-ctp-surface1 bg-ctp-mantle text-ctp-blue focus:ring-ctp-blue focus:ring-offset-0"
              />
              Viewed
            </label>
            <span className="text-xs text-ctp-subtext">
              +{file.additions ?? 0} / -{file.deletions ?? 0}
            </span>
          </div>
        </div>
        {!isViewed && (
        <Diff
          viewType={viewType}
          diffType={file.type}
          hunks={fileHunks}
          tokens={tokens}
          widgets={fileWidgets}
          selectedChanges={highlightedChangeKeys}
          renderGutter={({ change, side, inHoverState, renderDefault }: any) => {
            if (!change) return renderDefault();
            const changeSide = getChangeSide(change);
            const lineNumber = getChangeLineNumber(change, changeSide);
            // Only show button on the "new" side gutter (or matching side)
            const showButton = inHoverState && side === changeSide && lineNumber;
            return (
              <span className="relative inline-flex items-center w-full">
                {showButton && (
                  <span
                    className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-ctp-mauve hover:opacity-90 cursor-pointer text-ctp-base opacity-80 hover:opacity-100 transition-all"
                    title="Add comment"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (lineNumber) {
                        setSelectingRange({
                          file: fileName,
                          startLine: lineNumber,
                          side: changeSide,
                        });
                        setSelectedRange({
                          file: fileName,
                          startLine: lineNumber,
                          endLine: lineNumber,
                          side: changeSide,
                        });
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M10 2c-4.418 0-8 2.91-8 6.5S5.582 15 10 15c.382 0 .757-.022 1.124-.063l3.33 2.152a.5.5 0 00.771-.42v-2.97C17.09 12.266 18 10.48 18 8.5 18 4.91 14.418 2 10 2z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                <span className="flex-1 text-right">{renderDefault()}</span>
              </span>
            );
          }}
          gutterEvents={{
            onClick: (event: any) => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }

              const { change } = event;
              if (change) {
                const fileName = file.newPath || file.oldPath;
                const side = change.isNormal
                  ? "new"
                  : change.type === "insert"
                    ? "new"
                    : "old";
                const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
                if (lineNumber) {
                  // Handle shift+click for range selection
                  if (event.nativeEvent.shiftKey && lastFocusedLine && lastFocusedLine.file === fileName && lastFocusedLine.side === side) {
                    const startLine = Math.min(lastFocusedLine.line, lineNumber);
                    const endLine = Math.max(lastFocusedLine.line, lineNumber);
                    setAddingCommentAt({
                      file: fileName,
                      startLine,
                      endLine,
                      side,
                    });
                    setSelectedRange(null);
                  } else {
                    handleLineClick(fileName, lineNumber, side);
                  }
                }
              }
            },
            onMouseDown: (event: any) => {
              const { change } = event;
              if (change) {
                const fileName = file.newPath || file.oldPath;
                const side = change.isNormal
                  ? "new"
                  : change.type === "insert"
                    ? "new"
                    : "old";
                const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
                if (lineNumber) {
                  setSelectingRange({
                    file: fileName,
                    startLine: lineNumber,
                    side,
                  });
                  setSelectedRange({
                    file: fileName,
                    startLine: lineNumber,
                    endLine: lineNumber,
                    side,
                  });
                }
              }
            },
            onMouseEnter: (event: any) => {
              const { change } = event;
              if (change) {
                const fileName = file.newPath || file.oldPath;
                const side = change.isNormal
                  ? "new"
                  : change.type === "insert"
                    ? "new"
                    : "old";
                const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
                if (lineNumber) {
                  // Update hovered line for "C" key shortcut
                  setHoveredLine({ file: fileName, line: lineNumber, side });
                  
                  // Extend selection range if dragging
                  if (selectingRange && selectingRange.file === fileName && selectingRange.side === side) {
                    const startLine = Math.min(selectingRange.startLine, lineNumber);
                    const endLine = Math.max(selectingRange.startLine, lineNumber);
                    setSelectedRange({
                      file: fileName,
                      startLine,
                      endLine,
                      side,
                    });
                  }
                }
              }
            },
          }}
        >
          {(hunks: any[]) => {
            const elements: React.ReactElement[] = [];
            const cachedSource = sourceCache.current[fileName];
            const lastHunk = hunks[hunks.length - 1];
            const estimatedTotalLines = cachedSource?.length
              ?? (lastHunk
                ? (lastHunk.oldLines === 0 && lastHunk.oldStart === 0)
                  ? lastHunk.newStart + lastHunk.newLines - 1
                  : lastHunk.oldStart + lastHunk.oldLines + 20
                : 0);

            // Top-of-file expand control
            if (hunks.length > 0 && (hunks[0].oldStart > 1 || (hunks[0].oldStart === 0 && hunks[0].newStart > 1))) {
              elements.push(
                <Decoration key="expand-top">
                  <HunkExpandControl
                    previousHunk={null}
                    nextHunk={hunks[0]}
                    totalLines={estimatedTotalLines}
                    onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                  />
                </Decoration>
              );
            }

            hunks.forEach((hunk, i) => {
              // Between-hunk expand control
              if (i > 0) {
                const collapsed = getCollapsedLinesCountBetween(hunks[i - 1], hunk);
                if (collapsed > 0) {
                  elements.push(
                    <Decoration key={`expand-${i}`}>
                      <HunkExpandControl
                        previousHunk={hunks[i - 1]}
                        nextHunk={hunk}
                        totalLines={estimatedTotalLines}
                        onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                      />
                    </Decoration>
                  );
                }
              }
              elements.push(<Hunk key={hunk.content} hunk={hunk} />);
            });

            // Bottom-of-file expand control
            if (hunks.length > 0 && estimatedTotalLines > 0) {
              const lastHunkEnd = (lastHunk.oldLines === 0 && lastHunk.oldStart === 0)
                ? lastHunk.newStart + lastHunk.newLines - 1
                : lastHunk.oldStart + lastHunk.oldLines - 1;
              if (lastHunkEnd < estimatedTotalLines) {
                elements.push(
                  <Decoration key="expand-bottom">
                    <HunkExpandControl
                      previousHunk={lastHunk}
                      nextHunk={null}
                      totalLines={estimatedTotalLines}
                      onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                    />
                  </Decoration>
                );
              }
            }

            return elements;
          }}
        </Diff>
        )}
      </div>
    );
  };

  if (!workingDir || !isGitRepo) {
    if (repoManager.loading) {
      return (
        <div className="min-h-screen bg-ctp-base flex items-center justify-center">
          <div className="text-ctp-subtext text-lg">Loading...</div>
        </div>
      );
    }
    return (
      <RepoLandingPage
        repos={repoManager.repos}
        onSelectRepo={handleSwitchRepo}
        onAddRepo={handleAddRepo}
        onRemoveRepo={handleRemoveRepo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-ctp-mantle border-b border-ctp-surface1 flex-shrink-0"
        style={theme === 'dark' ? { boxShadow: '0 4px 16px -4px rgba(250,179,135,0.15)' } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-ctp-text tracking-wide">
              <span className="text-ctp-peach mr-1">●</span>ai-review
            </span>
          </div>
          <RepoSwitcher
            currentPath={workingDir}
            repos={repoManager.repos}
            onSwitchRepo={handleSwitchRepo}
            onAddRepo={handleAddRepo}
            onRemoveRepo={handleRemoveRepo}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ctp-overlay0 hidden md:block">
            Press <kbd className="px-2 py-1 bg-ctp-surface1 rounded text-xs">Shift</kbd>{" "}
            <kbd className="px-2 py-1 bg-ctp-surface1 rounded text-xs">Shift</kbd> to search files
          </span>

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 bg-ctp-mantle border-b border-ctp-surface1 flex-shrink-0 flex-wrap">
        {/* Group 1: View mode */}
        <div className="flex gap-1">
          <button
            onClick={() => setViewType("split")}
            className={viewType === "split" ? btnActive : btnDefault}
          >
            Split
          </button>
          <button
            onClick={() => setViewType("unified")}
            className={viewType === "unified" ? btnActive : btnDefault}
          >
            Unified
          </button>
        </div>

        {isGitRepo && (
          <>
            {/* Divider between group 1 and group 2 */}
            <div className="w-px h-5 bg-ctp-surface1 mx-1" />

            {/* Group 2: Diff target */}
            <div className="flex gap-1 items-center">
              <button
                onClick={() => handleModeChange({ mode: "unstaged" })}
                className={diffMode.mode === "unstaged" ? btnActive : btnDefault}
              >
                Unstaged
              </button>
              <button
                onClick={() => handleModeChange({ mode: "staged" })}
                className={diffMode.mode === "staged" ? btnActive : btnDefault}
              >
                Staged
              </button>
              {renderableFiles.length > 0 && <button
                onClick={commitSelector.openSelector}
                className={btnDefault + " flex items-center gap-1.5"}
                title="Browse commits (Ctrl+K)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Browse Commits
              </button>}
            </div>
          </>
        )}

        {/* Divider between group 2 and group 3 */}
        <div className="w-px h-5 bg-ctp-surface1 mx-1" />

        {/* Group 3: Tools */}
        <div className="ml-auto flex items-center gap-1">
          {changedFiles.length > 0 && (
            <button
              onClick={() => setIsSidebarVisible((prev) => !prev)}
              className={isSidebarVisible ? btnIconActive : btnIcon}
              title={isSidebarVisible ? "Hide changed files sidebar" : "Show changed files sidebar"}
              aria-label={isSidebarVisible ? "Hide changed files sidebar" : "Show changed files sidebar"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
                {!isSidebarVisible && <path d="M6 12h6" />}
              </svg>
            </button>
          )}
          {comments.length > 0 && (
            <>
              <button
                onClick={() => setShowCommentOverview(true)}
                className={btnDefault + " flex items-center gap-1"}
              >
                {comments.length} comment{comments.length !== 1 ? "s" : ""}
                {comments.length > 10 ? " 🫠" : comments.length >= 3 ? " 🔥" : ""}
              </button>
              <button
                onClick={handleGeneratePrompt}
                className={btnActive + " flex items-center gap-1"}
              >
                Generate Prompt
              </button>
            </>
          )}
          {(cliInstalled === false || cliJustInstalled) && <div className="relative">
            <button
              onClick={handleInstallCli}
              disabled={cliJustInstalled}
              className={`${cliJustInstalled ? btnActive + " cursor-not-allowed" : btnDefault} flex items-center gap-1.5`}
              title={cliJustInstalled ? "CLI installed" : "Install CLI command"}
            >
              {cliJustInstalled ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  CLI
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  CLI
                </>
              )}
            </button>
            {installMessage && (
              <div className="absolute top-full mt-2 right-0 bg-ctp-surface0 border border-ctp-surface1 rounded-sm px-4 py-2 text-sm text-ctp-text whitespace-pre-wrap max-w-md shadow-lg z-50">
                {installMessage}
              </div>
            )}
          </div>}
        </div>
      </div>

      {selectedCommit && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-xs text-ctp-subtext flex-shrink-0">
          <span className="font-mono bg-ctp-surface1 text-ctp-text px-2 py-0.5 rounded-sm">
            {selectedCommit.short_hash}
          </span>
          <span className="font-medium text-ctp-text">{selectedCommit.message}</span>
        </div>
      )}

      {selectedBranch && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-xs text-ctp-subtext flex-shrink-0">
          <span className="font-mono bg-ctp-surface1 text-ctp-text px-2 py-0.5 rounded-sm">
            {selectedBranch.short_hash}
          </span>
          <span className="font-medium text-ctp-text">Branch: {selectedBranch.name}</span>
        </div>
      )}

      <ScrollProgressBar containerRef={mainContentRef} />
      <div className="flex h-[calc(100vh-140px)]">
        {changedFiles.length > 0 && isSidebarVisible && (
          <div
            className="border-r border-ctp-surface1 flex flex-col bg-ctp-mantle relative"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-ctp-surface1">
              <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full flex-shrink-0" />
              <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
                Changed Files
              </span>
              {renderableFiles.length > 0 && (
                <span className="ml-auto text-[10px] text-ctp-overlay0">
                  {viewedCount}/{renderableFiles.length} viewed
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              <FileList
                files={changedFiles}
                selectedFile={selectedFile}
                onSelectFile={handleFileSelect}
              />
              {(() => {
                // Get unique files with comments
                const filesWithComments = Array.from(
                  new Set(comments.map((c) => c.file))
                ).sort();

                if (filesWithComments.length > 0) {
                  return (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 border-t border-b border-ctp-surface1 bg-ctp-mantle sticky top-0">
                        <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full flex-shrink-0" />
                        <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
                          Commented Files
                        </span>
                      </div>
                      <div className="space-y-1">
                        {filesWithComments.map((file) => (
                          <button
                            key={file}
                            onClick={() => handleFileSelect(file)}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors rounded-sm ${
                              selectedFile === file
                                ? "bg-ctp-surface0 border-l-2 border-ctp-peach text-ctp-text"
                                : "text-ctp-subtext hover:bg-ctp-surface0"
                            }`}
                          >
                            {file.split("/").pop()}
                            <div className="text-xs opacity-70 truncate">
                              {file}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize changed files sidebar"
              onMouseDown={(event) => {
                event.preventDefault();
                setIsResizingSidebar(true);
              }}
              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-ctp-peach/30 transition-colors"
            />
          </div>
        )}

        <div ref={mainContentRef} className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-ctp-subtext text-lg">Loading...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 text-lg">Error: {error}</div>
            </div>
          ) : viewMode === "file" && currentFile ? (
            <div className="p-6">
              <div className="bg-ctp-mantle px-4 py-2 mb-4 rounded">
                <button
                  onClick={() => setViewMode("diff")}
                  className="text-ctp-blue hover:opacity-80 text-sm"
                >
                  ← Back to diff
                </button>
                <h2 className="text-xl font-semibold mt-2">{currentFile}</h2>
              </div>
              <FileViewer
                fileName={currentFile}
                content={fileContent}
                language={detectLanguage(currentFile)}
                isViewed={viewedFiles.has(currentFile)}
                onToggleViewed={() => toggleViewed(currentFile)}
                onLineClick={handleLineClick}
                addingCommentAt={addingCommentAt}
                onAddComment={handleAddComment}
                onCancelComment={() => setAddingCommentAt(null)}
                comments={comments}
                onEditComment={updateComment}
                onDeleteComment={deleteComment}
                editingCommentId={editingCommentId}
                onStartEditComment={startEditing}
                onStopEditComment={stopEditing}
                hoveredLine={hoveredLine}
                onHoverLine={setHoveredLine}
                lastFocusedLine={lastFocusedLine}
                selectingRange={selectingRange}
                onStartSelectingRange={setSelectingRange}
                selectedRange={selectedRange}
                onSelectedRangeChange={setSelectedRange}
                hoveredCommentIds={hoveredCommentIds}
                onHoverCommentIds={setHoveredCommentIds}
                onShiftClickLine={(file, startLine, endLine, side) => {
                  setAddingCommentAt({ file, startLine, endLine, side });
                }}
                suppressNextClick={suppressNextClickRef}
                searchQuery={search.query}
                highlightedWord={wordHighlight.highlightedWord}
              />
            </div>
          ) : renderableFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center aperture-grid bg-ctp-base h-full">
              <div className="text-center">
                <div className="text-ctp-surface1 text-4xl mb-4 select-none">⊕</div>
                <p className="text-ctp-subtext text-sm mb-4">No changes to review</p>
                {isGitRepo && (
                  <button
                    onClick={commitSelector.openSelector}
                    className={btnDefault + " flex items-center gap-1.5 mx-auto"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Browse Commits
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              {files.map(renderFile)}
            </div>
          )}
        </div>
      </div>

      <FileExplorer
        isOpen={fileExplorer.isOpen}
        files={fileExplorer.files}
        searchQuery={fileExplorer.searchQuery}
        selectedIndex={fileExplorer.selectedIndex}
        loading={fileExplorer.loading}
        onSearchChange={fileExplorer.setSearchQuery}
        onSelect={handleExplorerSelect}
        onClose={fileExplorer.closeExplorer}
      />

      {showPromptPreview && (
        <PromptPreview
          prompt={generatePrompt(comments, {
            mode: diffMode.mode,
            commitRef: diffMode.commitRef,
            selectedCommit,
            selectedBranch,
          })}
          onClose={() => setShowPromptPreview(false)}
          waitMode={waitMode}
        />
      )}

      {showCommentOverview && (
        <CommentOverview
          comments={comments}
          onClose={() => setShowCommentOverview(false)}
          onGoToComment={async (comment) => {
            setShowCommentOverview(false);
            // Highlight the comment
            setHoveredCommentIds([comment.id]);
            setTimeout(() => setHoveredCommentIds(null), 3000);

            // Switch to the correct view if needed
            const isInDiff = files.some(
              (f: any) => (f.newPath || f.oldPath) === comment.file
            );
            if (isInDiff) {
              setViewMode("diff");
            } else {
              await handleFileSelect(comment.file);
            }

            // Wait for React to render the new view, then scroll
            requestAnimationFrame(() => {
              const fileEl =
                document.querySelector(`[data-diff-file="${comment.file}"]`) ||
                document.querySelector(`[data-file-viewer="${comment.file}"]`);
              if (fileEl) {
                fileEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            });
          }}
        />
      )}

      <CommitSelector
        isOpen={commitSelector.isOpen}
        commits={commitSelector.commits}
        branches={commitSelector.branches}
        loading={commitSelector.loading}
        hasGgStacks={commitSelector.hasGgStacks}
        ggStacks={commitSelector.ggStacks}
        hasWorktrees={commitSelector.hasWorktrees}
        worktrees={commitSelector.worktrees}
        ggStackEntries={commitSelector.ggStackEntries}
        selectedStack={commitSelector.selectedStack}
        onSelectCommit={handleCommitSelect}
        onSelectBranch={handleBranchSelect}
        onSelectStack={handleStackSelect}
        onSelectStackEntry={handleStackEntrySelect}
        onSelectStackDiff={handleStackDiffSelect}
        onSelectWorktree={handleWorktreeSelect}
        onSelectRef={handleRefSelect}
        refError={commitSelector.refError}
        onBackToStacks={commitSelector.backToStacks}
        onClose={commitSelector.closeSelector}
      />

      <SearchBar
        isOpen={search.isOpen}
        query={search.query}
        matchCount={search.matches.length}
        currentMatchIndex={search.currentMatchIndex}
        onQueryChange={search.setQuery}
        onNext={search.next}
        onPrev={search.prev}
        onClose={search.close}
      />

      {pendingSwitchPath && (
        <ConfirmModal
          title="Unsaved Comments"
          message={`You have ${comments.length} comment${comments.length !== 1 ? "s" : ""} that will be lost. Switch anyway?`}
          confirmLabel="Discard & Switch"
          destructive
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}

    </div>
  );
}

function detectLanguage(filename: string): string {
  if (!filename) return "plaintext";
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    kt: "kotlin",
    rs: "rust",
    go: "go",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    swift: "swift",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
  };
  return langMap[ext || ""] || "plaintext";
}

export default App;
