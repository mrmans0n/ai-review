import { useState, useEffect, useRef, useMemo } from "react";
import { parseDiff, Diff, Hunk, Decoration, getChangeKey, getCollapsedLinesCountBetween, expandFromRawCode } from "react-diff-view";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "react-diff-view/style/index.css";
import "./diff.css";
import { getDiffFilePath } from "./utils/getDiffFilePath";
import { highlight } from "./highlight";
import { useGit } from "./hooks/useGit";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { useCommitSelector } from "./hooks/useCommitSelector";
import { useComments } from "./hooks/useComments";
import { useRepoManager } from "./hooks/useRepoManager";
import { useSearch } from "./hooks/useSearch";
import { useWordHighlight } from "./hooks/useWordHighlight";
import { useVisibleDiffFile } from "./hooks/useVisibleDiffFile";
import { useTheme } from './hooks/useTheme';
import { FileExplorer } from "./components/FileExplorer";
import { CommitSelector } from "./components/CommitSelector";
import { CommitSelectorContent } from "./components/CommitSelectorContent";
import { FileViewer } from "./components/FileViewer";
import { ImagePreview } from "./components/ImagePreview";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { SearchBar } from "./components/SearchBar";
import { AddCommentForm } from "./components/AddCommentForm";
import { CommentWidget } from "./components/CommentWidget";
import { PromptPreview } from "./components/PromptPreview";
import { CommentOverview } from "./components/CommentOverview";
import { isWholeFileComment } from "./hooks/commentHelpers";
import { RepoLandingPage } from "./components/RepoLandingPage";
import { RepoSwitcher } from "./components/RepoSwitcher";
import { ConfirmModal } from "./components/ConfirmModal";
import { ScrollProgressBar } from "./components/ScrollProgressBar";
import { RightRail } from "./components/RightRail";
import { ViewTypeControl } from "./components/ViewTypeControl";
import { generatePrompt } from "./lib/promptGenerator";
import { buildJsonFeedback } from "./lib/jsonFeedback";
import { resolveLineFromNode } from "./lib/resolveLineFromNode";
import { extractLinesFromHunks } from "./lib/extractLinesFromHunks";
import { detectLfsPointer, isTextPreviewable } from "./lib/lfsDetection";
import { normalizeFileStatus, normalizePath } from "./lib/fileTree";
import { HunkExpandControl } from "./components/HunkExpandControl";
import { LfsFileWrapper } from "./components/LfsFileWrapper";
import type { DiffModeConfig, CommitInfo, BranchInfo, GgStackInfo, GgStackEntry, WorktreeInfo, GitDiffResult, ChangedFile, ChangedFileRailItem, Comment } from "./types";

type InitialDiffMode = {
  type: "commit" | "range" | "branch";
  value: string;
};

const MIN_RIGHT_RAIL_WIDTH = 240;
const DEFAULT_RIGHT_RAIL_WIDTH = 320;

function getMaxRightRailWidth() {
  return Math.floor(window.innerWidth * 0.45);
}

function clampRightRailWidth(width: number) {
  return Math.min(getMaxRightRailWidth(), Math.max(MIN_RIGHT_RAIL_WIDTH, width));
}

function escapeAttributeSelector(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function scrollToCommentTarget(comment: Comment) {
  const file = escapeAttributeSelector(comment.file);
  const selectors = isWholeFileComment(comment)
    ? [
        `[data-comment-file-anchor="${file}"]`,
        `[data-diff-file="${file}"]`,
        `[data-file-viewer="${file}"]`,
      ]
    : [
        `[data-comment-file="${file}"][data-comment-line="${comment.startLine}"][data-comment-side="${comment.side}"]`,
        `[data-file-viewer="${file}"] [data-line-number="${comment.startLine}"][data-line-side="${comment.side}"]`,
        `[data-comment-file-anchor="${file}"]`,
        `[data-diff-file="${file}"]`,
        `[data-file-viewer="${file}"]`,
      ];

  const target = selectors
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .find((element): element is HTMLElement => Boolean(element));

  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}

function App() {
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [diffText, setDiffText] = useState("");
  const [viewType, setViewType] = useState<"split" | "unified">("split");
  const [diffMode, setDiffMode] = useState<DiffModeConfig>({ mode: "unstaged" });
  const [viewMode, setViewMode] = useState<"diff" | "file">("diff");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isImagePreview, setIsImagePreview] = useState(false);
  const [imagePreviewLoading, setImagePreviewLoading] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState<string | null>(null);
  const [imagePreviewStatus, setImagePreviewStatus] = useState("modified");
  const [oldImageSrc, setOldImageSrc] = useState<string | null>(null);
  const [newImageSrc, setNewImageSrc] = useState<string | null>(null);
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
  const [jsonOutput, setJsonOutput] = useState(false);
  const [initialDiffMode, setInitialDiffMode] = useState<InitialDiffMode | null>(null);
  const [initialModeResolved, setInitialModeResolved] = useState(false);
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [cliJustInstalled, setCliJustInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [hoveredCommentIds, setHoveredCommentIds] = useState<string[] | null>(null);
  const [showCommentOverview, setShowCommentOverview] = useState(false);
  const suppressNextClickRef = useRef(false);
  const suppressVisibleDiffFileRef = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [expandedHunksMap, setExpandedHunksMap] = useState<Record<string, any[]>>({});
  const sourceCache = useRef<Record<string, string[]>>({});
  const imageRequestIdRef = useRef(0);
  const [oldSourceMap, setOldSourceMap] = useState<Record<string, string>>({});
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [isRightRailVisible, setIsRightRailVisible] = useState(true);
  const [rightRailWidth, setRightRailWidth] = useState(DEFAULT_RIGHT_RAIL_WIDTH);
  const [isResizingRightRail, setIsResizingRightRail] = useState(false);
  const [activeDiffFile, setActiveDiffFile] = useState<string | undefined>();
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [mdPreviewFiles, setMdPreviewFiles] = useState<Set<string>>(new Set());
  const [mdContentCache, setMdContentCache] = useState<Record<string, string>>({});
  const [lfsContentCache, setLfsContentCache] = useState<Record<string, {
    oldText: string | null;
    newText: string | null;
    oldImage: string | null;
    newImage: string | null;
    loading: boolean;
    error: string | null;
  }>>({});
  const lfsFetchingRef = useRef<Set<string>>(new Set());
  const lfsRequestIdRef = useRef(0);
  const [lfsVersion, setLfsVersion] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

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

  const hadInitialMode = useRef(false);
  const { isGitRepo, diffResult, loading, error, loadDiff, changeStatus } = useGit(
    workingDir,
    !initialModeResolved || hadInitialMode.current
  );
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
        setInitError(`Failed to detect working directory: ${err}`);
      });

    invoke<boolean>("is_wait_mode")
      .then((enabled) => {
        setWaitMode(enabled);
      })
      .catch((err) => {
        console.error("Failed to read wait mode:", err);
      });

    invoke<boolean>("is_json_output")
      .then((enabled) => {
        setJsonOutput(enabled);
      })
      .catch((err) => {
        console.error("Failed to read json output mode:", err);
      });

    invoke<InitialDiffMode | null>("get_initial_diff_mode")
      .then((mode) => {
        if (mode) hadInitialMode.current = true;
        setInitialDiffMode(mode);
        setInitialModeResolved(true);
      })
      .catch((err) => {
        console.error("Failed to read initial diff mode:", err);
        setInitialModeResolved(true);
      });

    // Check if CLI is already installed
    invoke<boolean>("check_cli_installed")
      .then((installed) => {
        setCliInstalled(installed);
      })
      .catch((err) => {
        console.error("Failed to check CLI installation:", err);
      });

    const savedRightRailWidth =
      window.localStorage.getItem("right-rail-width") ??
      window.localStorage.getItem("changed-files-sidebar-width");
    if (savedRightRailWidth) {
      const parsedWidth = Number.parseInt(savedRightRailWidth, 10);
      if (!Number.isNaN(parsedWidth)) {
        setRightRailWidth(clampRightRailWidth(parsedWidth));
      }
    }

    const savedRightRailVisibility =
      window.localStorage.getItem("right-rail-visible") ??
      window.localStorage.getItem("changed-files-sidebar-visible");
    if (savedRightRailVisibility !== null) {
      setIsRightRailVisible(savedRightRailVisibility === "true");
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
      setActiveDiffFile(undefined);
      setViewMode("diff");
      setActiveDiffFile(undefined);
    }
  }, [diffResult]);

  useEffect(() => {
    if (!workingDir || !isGitRepo || !initialDiffMode) return;

    const mode = initialDiffMode;
    setInitialDiffMode(null);

    const applyInitialMode = async () => {
      try {
        if (mode.type === "commit") {
          const commits = await invoke<CommitInfo[]>("list_commits", {
            path: workingDir,
            limit: 200,
          });

          setDiffMode({ mode: "commit", commitRef: mode.value });
          setSelectedCommit(
            commits.find(
              (commit) =>
                commit.hash === mode.value || commit.short_hash === mode.value
            ) || null
          );
          setSelectedBranch(null);
          setReviewingLabel(mode.value);
          await loadDiff({ mode: "commit", commitRef: mode.value });
        } else if (mode.type === "range") {
          setDiffMode({ mode: "range", range: mode.value });
          setSelectedCommit(null);
          setSelectedBranch(null);
          setReviewingLabel(mode.value);
          await loadDiff({ mode: "range", range: mode.value });
        } else if (mode.type === "branch") {
          const branches = await invoke<BranchInfo[]>("list_branches", {
            path: workingDir,
          });

          setDiffMode({ mode: "branch", branchName: mode.value });
          setSelectedBranch(
            branches.find((branch) => branch.name === mode.value) || null
          );
          setSelectedCommit(null);
          setReviewingLabel(mode.value);
          await loadDiff({ mode: "branch", branchName: mode.value });
        }

        setViewMode("diff");
      } catch (err) {
        console.error("Failed to apply initial diff mode:", err);
      }
    };

    applyInitialMode();
  }, [workingDir, isGitRepo, initialDiffMode]);

  const files = useMemo(() => (diffText ? parseDiff(diffText) : []).map((f: any) => ({
    ...f,
    additions: f.hunks.flatMap((h: any) => h.changes).filter((c: any) => c.isInsert).length,
    deletions: f.hunks.flatMap((h: any) => h.changes).filter((c: any) => c.isDelete).length,
    lfsPointer: detectLfsPointer(f.hunks),
  })), [diffText]);
  const renderableFiles = useMemo(() => files.filter((file: any) => file.hunks && file.hunks.length > 0), [files]);
  const diffFilePaths = useMemo(
    () => renderableFiles.map((file: any) => getDiffFilePath(file)).filter(Boolean),
    [renderableFiles]
  );
  const viewedCount = renderableFiles.filter((file: any) => viewedFiles.has(getDiffFilePath(file))).length;
  const railFiles = useMemo<ChangedFileRailItem[]>(() => {
    const statsByPath = new Map<string, { additions: number; deletions: number }>();
    for (const file of files) {
      const path = normalizePath(getDiffFilePath(file));
      if (!path) continue;
      statsByPath.set(path, {
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0,
      });
    }

    const commentsByPath = new Map<string, number>();
    for (const comment of comments) {
      const path = normalizePath(comment.file);
      commentsByPath.set(path, (commentsByPath.get(path) ?? 0) + 1);
    }

    return changedFiles.map((file) => {
      const path = normalizePath(file.path);
      const stats = statsByPath.get(path);
      return {
        path,
        displayPath: path,
        status: normalizeFileStatus(file.status),
        additions: stats?.additions ?? 0,
        deletions: stats?.deletions ?? 0,
        viewed: viewedFiles.has(file.path) || viewedFiles.has(path),
        commentCount: commentsByPath.get(path) ?? 0,
      };
    });
  }, [changedFiles, comments, files, viewedFiles]);
  const isEmptyState = renderableFiles.length === 0 && !selectedCommit && !selectedBranch;

  const visibleDiffFile = useVisibleDiffFile({
    containerRef: mainContentRef,
    filePaths: diffFilePaths,
    enabled: viewMode === "diff",
    suppressRef: suppressVisibleDiffFileRef,
  });

  useEffect(() => {
    if (visibleDiffFile) {
      setActiveDiffFile(visibleDiffFile);
    }
  }, [visibleDiffFile]);

  const { loadData } = commitSelector;
  useEffect(() => {
    if (isEmptyState && isGitRepo) {
      loadData();
    }
  }, [isEmptyState, isGitRepo, loadData]);

  // Ctrl+K in empty state: focus inline selector search instead of opening modal
  useEffect(() => {
    if (!isEmptyState || !isGitRepo) return;

    const handleCtrlK = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        const inlineInput = document.querySelector<HTMLInputElement>(
          '[data-inline-selector] input[type="text"]'
        );
        if (inlineInput) {
          e.preventDefault();
          e.stopImmediatePropagation();
          inlineInput.focus();
          inlineInput.select();
        }
      }
    };

    window.addEventListener("keydown", handleCtrlK, true);
    return () => window.removeEventListener("keydown", handleCtrlK, true);
  }, [isEmptyState, isGitRepo]);

  useEffect(() => {
    getCurrentWindow().setTitle(reviewingLabel ? `Reviewing ${reviewingLabel}` : "ai-review");
  }, [reviewingLabel]);

  const btnBase = "px-3 py-1.5 text-sm rounded-sm transition-colors border";
  const btnDefault = `${btnBase} bg-transparent border-divider text-ink-secondary hover:bg-surface-hover hover:text-ink-primary hover:border-divider`;
  const btnActive = `${btnBase} bg-surface-hover border-accent-review text-ink-primary`;
  const btnIcon = "p-1.5 rounded-sm text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors";
  const btnIconActive = "p-1.5 rounded-sm text-ink-primary bg-surface-hover border border-accent-review transition-colors";

  useEffect(() => {
    window.localStorage.setItem("right-rail-width", String(rightRailWidth));
  }, [rightRailWidth]);

  useEffect(() => {
    window.localStorage.setItem("right-rail-visible", String(isRightRailVisible));
  }, [isRightRailVisible]);

  useEffect(() => {
    if (!isResizingRightRail) return;

    const handleMouseMove = (event: MouseEvent) => {
      setRightRailWidth(clampRightRailWidth(window.innerWidth - event.clientX));
    };

    const stopResizing = () => {
      setIsResizingRightRail(false);
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
  }, [isResizingRightRail]);

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
          const fileName = getDiffFilePath(files[0]);
          handleLineClick(fileName, 1, "new");
        }
      }

      if (
        e.key === "v" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        const targetFile = (hoveredLine || lastFocusedLine)?.file;
        if (targetFile) {
          e.preventDefault();
          toggleViewed(targetFile);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [files, lastFocusedLine, hoveredLine, toggleViewed]);

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
    setSelectedCommit(null);
    setSelectedBranch(null);
    loadDiff(newMode);
    setReviewingLabel(null);
  };

  // Auto-switch diff mode when current mode becomes unavailable
  useEffect(() => {
    if (diffMode.mode === "staged" && !changeStatus.has_staged && changeStatus.has_unstaged) {
      handleModeChange({ mode: "unstaged" });
    } else if (diffMode.mode === "unstaged" && !changeStatus.has_unstaged && changeStatus.has_staged) {
      handleModeChange({ mode: "staged" });
    }
  }, [changeStatus]);

  function toggleViewed(fileName: string) {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }

  const toggleMdPreview = async (fileName: string) => {
    const isCurrentlyPreviewing = mdPreviewFiles.has(fileName);
    if (!isCurrentlyPreviewing && mdContentCache[fileName] === undefined) {
      try {
        let content: string;
        if (diffMode.mode === "unstaged") {
          content = await invoke<string>("read_file_content", {
            path: workingDir,
            filePath: fileName,
          });
        } else if (diffMode.mode === "staged") {
          content = await invoke<string>("get_file_at_ref", {
            path: workingDir,
            gitRef: ":0",
            filePath: fileName,
          });
        } else if (diffMode.mode === "range" && diffMode.range) {
          const parts = diffMode.range.split("..");
          const toRef = parts[parts.length - 1] || "HEAD";
          content = await invoke<string>("get_file_at_ref", {
            path: workingDir,
            gitRef: toRef,
            filePath: fileName,
          });
        } else {
          const ref = selectedCommit?.hash || selectedBranch?.name || diffMode.commitRef || "HEAD";
          content = await invoke<string>("get_file_at_ref", {
            path: workingDir,
            gitRef: ref,
            filePath: fileName,
          });
        }
        setMdContentCache((prev) => ({ ...prev, [fileName]: content }));
      } catch (err) {
        console.error("Failed to fetch markdown content:", err);
        return;
      }
    }
    setMdPreviewFiles((prev) => {
      const next = new Set(prev);
      if (isCurrentlyPreviewing) next.delete(fileName);
      else next.add(fileName);
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
      setOldSourceMap({});
      setViewMode("diff");
      setActiveDiffFile(undefined);
      setCurrentFile(null);
      setAddingCommentAt(null);
      setSelectingRange(null);
      setSelectedRange(null);
      setLastFocusedLine(null);
      clearAll();
      setViewedFiles(new Set());
      setMdPreviewFiles(new Set());
      setMdContentCache({});
      setLfsContentCache({});
      lfsFetchingRef.current.clear();
      lfsRequestIdRef.current++;
    setLfsVersion((v) => v + 1);
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
    setOldSourceMap({});
    setMdPreviewFiles(new Set());
    setMdContentCache({});
    setLfsContentCache({});
    lfsFetchingRef.current.clear();
    lfsRequestIdRef.current++;
    setLfsVersion((v) => v + 1);
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

  // Fetch old-side source for all changed files to enable full-file syntax highlighting.
  // Without this, multi-line constructs (block comments, template literals) break
  // because highlight.js processes each line independently.
  useEffect(() => {
    if (!workingDir || !diffText) return;

    const files = parseDiff(diffText);
    let cancelled = false;

    const fetchOldSources = async () => {
      const results: Record<string, string> = {};

      // Determine oldRef based on actual state, not just diffMode.
      // handleCommitSelect/handleBranchSelect set selectedCommit/selectedBranch
      // but don't update diffMode, so we derive the ref from actual state.
      let oldRef: string;

      if (selectedCommit) {
        oldRef = `${selectedCommit.hash}~1`;
      } else if (selectedBranch) {
        try {
          oldRef = await invoke<string>("get_branch_base", {
            path: workingDir,
            branch: selectedBranch.name,
          });
        } catch {
          return; // can't determine merge-base
        }
      } else if (diffMode.mode === "unstaged") {
        oldRef = ":0"; // index — unstaged compares index vs working tree
      } else if (diffMode.mode === "staged") {
        oldRef = "HEAD";
      } else if (diffMode.mode === "commit" && diffMode.commitRef) {
        // Handles handleRefSelect (sets diffMode but not selectedCommit)
        // and handleStackEntrySelect (also sets diffMode.commitRef)
        oldRef = `${diffMode.commitRef}~1`;
      } else if (diffMode.mode === "range" && diffMode.range) {
        if (diffMode.range.includes("...")) {
          // Three-dot range: git diff A...B uses the merge-base as old side
          const parts = diffMode.range.split("...");
          try {
            oldRef = await invoke<string>("get_merge_base_refs", {
              path: workingDir,
              ref1: parts[0],
              ref2: parts[1],
            });
          } catch {
            oldRef = parts[0];
          }
        } else {
          // Two-dot range: A..B — old side is A
          const parts = diffMode.range.split("..");
          oldRef = parts[0];
        }
      } else {
        oldRef = "HEAD";
      }

      await Promise.all(
        files.map(async (file: any) => {
          const oldPath = file.oldPath;
          // For new/untracked files, old side is empty — still need oldSource
          // so react-diff-view uses full-file highlighting path
          if (!oldPath || oldPath === "/dev/null") {
            const newPath = file.newPath;
            if (newPath) results[newPath] = "";
            return;
          }

          try {
            const content = await invoke<string>("get_file_at_ref", {
              path: workingDir,
              gitRef: oldRef,
              filePath: oldPath,
            });
            results[oldPath] = content;
          } catch {
            // File may not exist in old ref (e.g., root commit) — skip
          }
        })
      );

      if (!cancelled) {
        setOldSourceMap(results);
      }
    };

    fetchOldSources();
    return () => { cancelled = true; };
  }, [workingDir, diffText, diffMode, selectedCommit, selectedBranch]);

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
    if (!workingDir) return;

    setImagePreviewError(null);
    setImagePreviewLoading(false);
    setOldImageSrc(null);
    setNewImageSrc(null);

    const selectedChangedFile = changedFiles.find((file) => normalizePath(file.path) === normalizePath(filePath));
    const fileStatus = normalizeFileStatus(selectedChangedFile?.status || "modified");

    if (isImageFile(filePath)) {
      const requestId = ++imageRequestIdRef.current;
      setCurrentFile(filePath);
      setViewMode("file");
      setIsImagePreview(true);
      setImagePreviewStatus(fileStatus);
      setImagePreviewLoading(true);

      const mimeType = getImageMimeType(filePath);
      const makeDataUrl = (base64: string) => `data:${mimeType};base64,${base64}`;
      const isStale = () => imageRequestIdRef.current !== requestId;

      try {
        const refs = await resolvePreviewRefs({
          workingDir,
          diffMode,
          selectedCommit,
          selectedBranch,
        });

        if (isStale()) return;

        if (fileStatus === "added") {
          let base64: string;
          if (refs.readNewFromWorkingTree) {
            base64 = await invoke<string>("read_file_content_base64", {
              path: workingDir,
              filePath,
            });
          } else {
            base64 = await invoke<string>("get_file_at_ref_base64", {
              path: workingDir,
              gitRef: refs.newRef,
              filePath,
            });
          }
          if (isStale()) return;
          setNewImageSrc(makeDataUrl(base64));
        } else if (fileStatus === "deleted") {
          const base64 = await invoke<string>("get_file_at_ref_base64", {
            path: workingDir,
            gitRef: refs.oldRef,
            filePath,
          });
          if (isStale()) return;
          setOldImageSrc(makeDataUrl(base64));
        } else {
          const [oldBase64, newBase64] = await Promise.all([
            invoke<string>("get_file_at_ref_base64", {
              path: workingDir,
              gitRef: refs.oldRef,
              filePath,
            }),
            refs.readNewFromWorkingTree
              ? invoke<string>("read_file_content_base64", {
                path: workingDir,
                filePath,
              })
              : invoke<string>("get_file_at_ref_base64", {
                path: workingDir,
                gitRef: refs.newRef,
                filePath,
              }),
          ]);
          if (isStale()) return;
          setOldImageSrc(makeDataUrl(oldBase64));
          setNewImageSrc(makeDataUrl(newBase64));
        }
      } catch (err) {
        if (isStale()) return;
        const message = err instanceof Error ? err.message : String(err);
        setImagePreviewError(message);
      } finally {
        if (!isStale()) setImagePreviewLoading(false);
      }
      return;
    }

    setIsImagePreview(false);

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

      setCurrentFile(filePath);
      setViewMode("file");
      setFileContent(content);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const scrollToDiffFile = (filePath: string) => {
    setViewMode("diff");
    setActiveDiffFile(filePath);
    suppressVisibleDiffFileRef.current = true;

    window.setTimeout(() => {
      suppressVisibleDiffFileRef.current = false;
    }, 600);

    requestAnimationFrame(() => {
      const fileEl = document.querySelector(
        `[data-diff-file="${escapeAttributeSelector(filePath)}"]`
      );
      fileEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const goToComment = async (comment: Comment, options: { closeOverview?: boolean } = {}) => {
    if (options.closeOverview) {
      setShowCommentOverview(false);
    }

    setHoveredCommentIds([comment.id]);
    setTimeout(() => setHoveredCommentIds(null), 3000);

    const isInDiff = files.some(
      (file: any) => getDiffFilePath(file) === comment.file
    );

    if (isInDiff) {
      // Un-collapse viewed files so the target is visible
      setViewedFiles((prev) => {
        if (!prev.has(comment.file)) return prev;
        const next = new Set(prev);
        next.delete(comment.file);
        return next;
      });
      setViewMode("diff");
      setActiveDiffFile(comment.file);
    } else {
      await handleFileSelect(comment.file);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToCommentTarget(comment));
    });
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
      setActiveDiffFile(undefined);
      setSelectedCommit(commit);
      setSelectedBranch(null);
      setReviewingLabel(`${commit.short_hash} ${commit.message}`);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load commit diff:", err);
    }
  };

  const handleRangeSelect = async (fromHash: string, toHash: string) => {
    if (!workingDir) return;

    try {
      const range = `${fromHash}^..${toHash}`;
      const result = await invoke<GitDiffResult>("get_range_diff", {
        path: workingDir,
        range,
      });
      setDiffText(result.diff || "No changes in this range");
      setChangedFiles(result.files);
      setActiveDiffFile(undefined);
      setDiffMode({ mode: "range", range });
      setSelectedCommit(null);
      setSelectedBranch(null);
      setReviewingLabel(range);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load range diff:", err);
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
      setActiveDiffFile(undefined);
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
      const diffContent = result || "No changes in this entry";
      setDiffText(diffContent);
      setChangedFiles(parseDiff(diffContent).map((f: any) => ({
        path: getDiffFilePath(f),
        status: f.type === "add" ? "A" : f.type === "delete" ? "D" : "M",
      })));
      setActiveDiffFile(undefined);
      setDiffMode({ mode: "commit", commitRef: entry.hash });
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
      const [result, stackBaseInfo] = await Promise.all([
        invoke<string>("get_gg_stack_diff", {
          path: workingDir,
          stackName: stack.name,
        }),
        invoke<{ base: string; branch: string }>("get_gg_stack_base", {
          path: workingDir,
          stackName: stack.name,
        }).catch(() => ({ base: "HEAD", branch: "HEAD" })),
      ]);
      const diffContent = result || "No changes in this stack";
      setDiffText(diffContent);
      setChangedFiles(parseDiff(diffContent).map((f: any) => ({
        path: getDiffFilePath(f),
        status: f.type === "add" ? "A" : f.type === "delete" ? "D" : "M",
      })));
      setActiveDiffFile(undefined);
      setDiffMode({ mode: "range", range: `${stackBaseInfo.base}..${stackBaseInfo.branch}` });
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
    if (!workingDir) return;
    if (worktree.branch === "(detached)") return;

    try {
      const result = await invoke<GitDiffResult>("get_branch_diff", {
        path: workingDir,
        branch: worktree.branch,
      });
      setDiffText(result.diff || "No changes in this worktree");
      setChangedFiles(result.files);
      setActiveDiffFile(undefined);
      setSelectedBranch({
        name: worktree.branch,
        short_hash: worktree.commit_hash.slice(0, 7),
        subject: "",
        author: "",
        date: "",
      });
      setSelectedCommit(null);
      setReviewingLabel(worktree.branch);
      setViewMode("diff");
      commitSelector.closeSelector();
    } catch (err) {
      console.error("Failed to load worktree diff:", err);
    }
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
      setActiveDiffFile(undefined);
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

  const handleFileCommentClick = (file: string) => {
    setAddingCommentAt({
      file,
      startLine: 0,
      endLine: 0,
      side: "new",
    });
    setSelectingRange(null);
    setSelectedRange(null);
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

  const handlePreviewPrompt = () => {
    setShowPromptPreview(true);
  };

  const handleGeneratePrompt = async () => {
    if (jsonOutput) {
      const feedback = buildJsonFeedback(comments, {
        mode: diffMode.mode,
        commitRef: diffMode.commitRef,
        selectedCommit,
        selectedBranch,
      });
      try {
        await invoke("submit_feedback", { feedback: JSON.stringify(feedback) });
      } catch (err) {
        console.error("Failed to submit JSON feedback:", err);
      }
      return;
    }
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
    const fileName = getDiffFilePath(file);

    // Group comments by endLine + side
    const commentsByEndLine = new Map<string, import("./types").Comment[]>();
    for (const comment of fileComments) {
      if (isWholeFileComment(comment)) continue;
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
            className="px-4 py-2 bg-surface border-t border-b border-divider"
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
          <div className="px-4 py-2 bg-surface border-t border-b border-divider">
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

  // Normalize file status from different sources ("A"/"D"/"M" from stack diffs vs "added"/"deleted"/"modified")
  const normalizeLfsStatus = (status: string): string => {
    if (status === "A" || status === "added") return "added";
    if (status === "D" || status === "deleted") return "deleted";
    return "modified";
  };

  // Fetch resolved LFS content for a file (image or text)
  const fetchLfsContent = async (filePath: string, oldFilePath: string, isImage: boolean, diffFileType?: string) => {
    if (!workingDir || lfsFetchingRef.current.has(filePath)) return;
    lfsFetchingRef.current.add(filePath);
    const requestId = lfsRequestIdRef.current;
    setLfsContentCache((prev) => ({
      ...prev,
      [filePath]: { oldText: null, newText: null, oldImage: null, newImage: null, loading: true, error: null },
    }));

    try {
      const refs = await resolvePreviewRefs({ workingDir, diffMode, selectedCommit, selectedBranch });
      const selectedChangedFile = changedFiles.find((f) => f.path === filePath);
      const rawStatus = selectedChangedFile?.status
        || (diffFileType === "add" ? "added" : diffFileType === "delete" ? "deleted" : "modified");
      const fileStatus = normalizeLfsStatus(rawStatus);

      if (isImage) {
        const mimeType = getImageMimeType(filePath);
        const makeDataUrl = (base64: string) => `data:${mimeType};base64,${base64}`;

        let oldImage: string | null = null;
        let newImage: string | null = null;

        if (fileStatus === "added") {
          const base64 = refs.readNewFromWorkingTree
            ? await invoke<string>("read_file_content_base64", { path: workingDir, filePath })
            : await invoke<string>("get_lfs_file_at_ref_base64", { path: workingDir, gitRef: refs.newRef, filePath });
          newImage = makeDataUrl(base64);
        } else if (fileStatus === "deleted") {
          const base64 = await invoke<string>("get_lfs_file_at_ref_base64", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath });
          oldImage = makeDataUrl(base64);
        } else {
          const [oldBase64, newBase64] = await Promise.all([
            invoke<string>("get_lfs_file_at_ref_base64", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath }),
            refs.readNewFromWorkingTree
              ? invoke<string>("read_file_content_base64", { path: workingDir, filePath })
              : invoke<string>("get_lfs_file_at_ref_base64", { path: workingDir, gitRef: refs.newRef, filePath }),
          ]);
          oldImage = makeDataUrl(oldBase64);
          newImage = makeDataUrl(newBase64);
        }

        if (requestId !== lfsRequestIdRef.current) return;
        lfsFetchingRef.current.delete(filePath);
        setLfsContentCache((prev) => ({
          ...prev,
          [filePath]: { oldText: null, newText: null, oldImage, newImage, loading: false, error: null },
        }));
      } else {
        let oldText: string | null = null;
        let newText: string | null = null;

        if (fileStatus === "added") {
          newText = refs.readNewFromWorkingTree
            ? await invoke<string>("read_file_content", { path: workingDir, filePath })
            : await invoke<string>("get_lfs_file_at_ref", { path: workingDir, gitRef: refs.newRef, filePath });
        } else if (fileStatus === "deleted") {
          oldText = await invoke<string>("get_lfs_file_at_ref", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath });
        } else {
          [oldText, newText] = await Promise.all([
            invoke<string>("get_lfs_file_at_ref", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath }),
            refs.readNewFromWorkingTree
              ? invoke<string>("read_file_content", { path: workingDir, filePath })
              : invoke<string>("get_lfs_file_at_ref", { path: workingDir, gitRef: refs.newRef, filePath }),
          ]);
        }

        if (requestId !== lfsRequestIdRef.current) return;
        lfsFetchingRef.current.delete(filePath);
        setLfsContentCache((prev) => ({
          ...prev,
          [filePath]: { oldText, newText, oldImage: null, newImage: null, loading: false, error: null },
        }));
      }
    } catch (err) {
      if (requestId !== lfsRequestIdRef.current) return;
      lfsFetchingRef.current.delete(filePath);
      const message = err instanceof Error ? err.message : String(err);
      setLfsContentCache((prev) => ({
        ...prev,
        [filePath]: { oldText: null, newText: null, oldImage: null, newImage: null, loading: false, error: message },
      }));
    }
  };

  // Trigger LFS content fetches via useEffect instead of during render.
  // Only depend on renderableFiles (not lfsContentCache) so this effect
  // fires after loadDiff completes with fresh files, not immediately when
  // the cache is cleared on a mode switch (which would prefetch against
  // the stale previous file list).
  useEffect(() => {
    for (const file of renderableFiles) {
      if (!file.lfsPointer) continue;
      const fileName = file.newPath && file.newPath !== "/dev/null" ? file.newPath : file.oldPath;
      const isImage = isImageFile(fileName);
      const isText = isTextPreviewable(fileName);
      if (isImage || isText) {
        const oldFilePath = file.oldPath && file.oldPath !== "/dev/null" ? file.oldPath : fileName;
        fetchLfsContent(fileName, oldFilePath, isImage, file.type);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderableFiles, lfsVersion]);

  const renderFile = (file: any) => {
    const fileName = getDiffFilePath(file);
    const isViewed = viewedFiles.has(fileName);
    const fileHunks = expandedHunksMap[fileName] || file.hunks;
    if (!fileHunks || fileHunks.length === 0) return null;

    // LFS file rendering
    if (file.lfsPointer) {
      const isImage = isImageFile(fileName);
      const isText = isTextPreviewable(fileName);
      const previewMode = isImage ? "image" as const : isText ? "text" as const : "unsupported" as const;

      const cached = lfsContentCache[fileName];
      const selectedChangedFile = changedFiles.find((f) => f.path === fileName);
      const fileStatus = normalizeLfsStatus(
        selectedChangedFile?.status || (
          file.type === "add" ? "added" : file.type === "delete" ? "deleted" : "modified"
        )
      );

      return (
        <LfsFileWrapper
          key={file.oldPath + file.newPath}
          fileName={fileName}
          fileType={file.type}
          lfsPointer={file.lfsPointer}
          hunks={file.hunks}
          isViewed={isViewed}
          onToggleViewed={() => toggleViewed(fileName)}
          previewMode={previewMode}
          oldImageSrc={cached?.oldImage ?? null}
          newImageSrc={cached?.newImage ?? null}
          imageLoading={cached?.loading ?? true}
          imageError={cached?.error ?? null}
          oldTextContent={cached?.oldText ?? null}
          newTextContent={cached?.newText ?? null}
          textLoading={cached?.loading ?? true}
          textError={cached?.error ?? null}
          language={detectLanguage(fileName)}
          status={fileStatus}
          comments={comments}
          onAddComment={addComment}
          onEditComment={updateComment}
          onDeleteComment={deleteComment}
          editingCommentId={editingCommentId}
          onStartEditComment={startEditing}
          onStopEditComment={stopEditing}
        />
      );
    }

    // For existing files, look up by oldPath; for new files (oldPath is /dev/null),
    // look up by newPath where we stored empty string as oldSource
    const oldSource = (file.oldPath && file.oldPath !== "/dev/null")
      ? oldSourceMap[file.oldPath]
      : oldSourceMap[file.newPath];
    const tokens = highlight(fileHunks, {
      language: detectLanguage(fileName),
      oldSource,
    });
    const fileComments = comments.filter((c) => c.file === fileName);
    const wholeFileComments = fileComments.filter(isWholeFileComment);
    const lineComments = fileComments.filter((comment) => !isWholeFileComment(comment));
    const fileWidgets = buildFileWidgets(file, lineComments, fileHunks);

    // Build selectedChanges for hover highlighting and drag selection
    const highlightedChangeKeys: string[] = [];
    if (hoveredCommentIds && hoveredCommentIds.length > 0) {
      for (const comment of lineComments) {
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
      <div key={file.oldPath + file.newPath} className="mb-6" data-diff-file={getDiffFilePath(file)}>
        <div
          data-comment-file-anchor={fileName}
          className={`sticky top-0 z-10 px-4 py-2 font-medium border-b border-divider flex justify-between items-center transition-colors text-sm ${
            isViewed ? "bg-surface-hover/80 text-ink-secondary" : "bg-surface text-ink-primary"
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
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFileCommentClick(fileName);
              }}
              className="px-2 py-0.5 text-xs rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface1 transition-colors"
            >
              Comment
            </button>
            {detectLanguage(fileName) === "markdown" && viewType === "split" && file.newPath !== "/dev/null" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMdPreview(fileName);
                }}
                className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${
                  mdPreviewFiles.has(fileName)
                    ? "bg-accent-review text-accent-review-text"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-surface-hover"
                }`}
              >
                {mdPreviewFiles.has(fileName) ? "Source" : "Preview"}
              </button>
            )}
            <label
              className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink-secondary cursor-pointer"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isViewed}
                onChange={() => toggleViewed(fileName)}
                className="h-4 w-4 rounded border-divider bg-surface text-ctp-blue focus:ring-accent-review focus:ring-offset-0"
              />
              Viewed
            </label>
            <span className="text-xs text-ink-secondary">
              +{file.additions ?? 0} / -{file.deletions ?? 0}
            </span>
          </div>
        </div>
        {!isViewed && (wholeFileComments.length > 0 || (addingCommentAt && addingCommentAt.file === fileName && isWholeFileComment(addingCommentAt))) && (
          <div className="border-b border-ctp-surface1 bg-ctp-mantle px-4 py-2">
            {wholeFileComments.length > 0 && (
              <div
                onMouseEnter={() => setHoveredCommentIds(wholeFileComments.map((comment) => comment.id))}
                onMouseLeave={() => setHoveredCommentIds(null)}
              >
                <CommentWidget
                  comments={wholeFileComments}
                  onEdit={updateComment}
                  onDelete={deleteComment}
                  editingId={editingCommentId}
                  onStartEdit={startEditing}
                  onStopEdit={stopEditing}
                />
              </div>
            )}
            {addingCommentAt && addingCommentAt.file === fileName && isWholeFileComment(addingCommentAt) && (
              <div className={wholeFileComments.length > 0 ? "mt-2" : undefined}>
                <AddCommentForm
                  file={addingCommentAt.file}
                  startLine={0}
                  endLine={0}
                  side="new"
                  onSubmit={handleAddComment}
                  onCancel={() => setAddingCommentAt(null)}
                  language={detectLanguage(fileName)}
                />
              </div>
            )}
          </div>
        )}
        {!isViewed && mdPreviewFiles.has(fileName) && mdContentCache[fileName] !== undefined ? (
          <MarkdownPreview
            content={mdContentCache[fileName]}
            fileName={fileName}
            comments={comments.filter((c) => c.file === fileName && !isWholeFileComment(c))}
            onAddComment={addComment}
            onEditComment={updateComment}
            onDeleteComment={deleteComment}
            editingCommentId={editingCommentId}
            onStartEditComment={startEditing}
            onStopEditComment={stopEditing}
          />
        ) : !isViewed ? (
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
              <span
                className="relative inline-flex items-center w-full"
                data-comment-file={fileName}
                data-comment-line={lineNumber}
                data-comment-side={changeSide}
              >
                {showButton && (
                  <span
                    className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-accent-review hover:opacity-90 cursor-pointer text-accent-review-text opacity-80 hover:opacity-100 transition-all"
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
                const fileName = getDiffFilePath(file);
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
                const fileName = getDiffFilePath(file);
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
                const fileName = getDiffFilePath(file);
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
        ) : null}
      </div>
    );
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-ctp-red text-4xl mb-4 select-none">!</div>
          <p className="text-ink-primary text-sm mb-2 font-medium">Initialization Error</p>
          <p className="text-ink-secondary text-sm mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded-sm bg-surface text-ink-primary hover:bg-surface-hover transition-colors border border-divider"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!workingDir || !isGitRepo) {
    if (repoManager.loading) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="text-ink-secondary text-lg">Loading...</div>
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
    <div className="min-h-screen bg-canvas text-ink-primary">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-divider flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-ink-primary tracking-wide">
              <span className="text-accent-review mr-1">●</span>ai-review
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
          <span className="text-xs text-ink-muted hidden md:block">
            Press <kbd className="px-2 py-1 bg-surface-hover rounded text-xs">Ctrl/⌘</kbd>{" "}
            <kbd className="px-2 py-1 bg-surface-hover rounded text-xs">O</kbd> to open file
          </span>

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors"
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

      {!isEmptyState && (
      <div className="flex items-center gap-1 px-3 py-2 bg-surface border-b border-divider flex-shrink-0 flex-wrap">
        {/* Group 1: View mode */}
        <ViewTypeControl value={viewType} onChange={(v) => { setViewType(v); if (v === "unified") setMdPreviewFiles(new Set()); }} />

        {isGitRepo && (
          <>
            {/* Divider between group 1 and group 2 */}
            <div className="w-px h-5 bg-divider mx-1" />

            {/* Group 2: Diff target */}
            <div className="flex gap-1 items-center">
              {changeStatus.has_unstaged && (
                <button
                  onClick={() => handleModeChange({ mode: "unstaged" })}
                  className={diffMode.mode === "unstaged" ? btnActive : btnDefault}
                >
                  Unstaged
                </button>
              )}
              {changeStatus.has_staged && (
                <button
                  onClick={() => handleModeChange({ mode: "staged" })}
                  className={diffMode.mode === "staged" ? btnActive : btnDefault}
                >
                  Staged
                </button>
              )}
              <button
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
              </button>
            </div>
          </>
        )}

        {/* Divider between group 2 and group 3 */}
        <div className="w-px h-5 bg-divider mx-1" />

        {/* Group 3: Tools */}
        <div className="ml-auto flex items-center gap-1">
          {(changedFiles.length > 0 || comments.length > 0) && (
            <button
              onClick={() => setIsRightRailVisible((prev) => !prev)}
              className={isRightRailVisible ? btnIconActive : btnIcon}
              title={isRightRailVisible ? "Hide review rail" : "Show review rail"}
              aria-label={isRightRailVisible ? "Hide review rail" : "Show review rail"}
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
                <path d="M15 4v16" />
                {!isRightRailVisible && <path d="M12 12h6" />}
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
              {jsonOutput && (
                <button
                  onClick={handlePreviewPrompt}
                  className={btnActive + " flex items-center gap-1"}
                >
                  Preview Prompt
                </button>
              )}
              <button
                onClick={handleGeneratePrompt}
                className={
                  jsonOutput
                    ? "px-4 py-2 bg-ctp-green text-on-green rounded-sm text-sm hover:opacity-90 transition-opacity font-semibold flex items-center gap-1"
                    : btnActive + " flex items-center gap-1"
                }
              >
                {jsonOutput ? "Publish comments" : "Generate Prompt"}
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
              <div className="absolute top-full mt-2 right-0 bg-surface border border-divider rounded-sm px-4 py-2 text-sm text-ink-primary whitespace-pre-wrap max-w-md shadow-lg z-50">
                {installMessage}
              </div>
            )}
          </div>}
        </div>
      </div>
      )}

      {selectedCommit && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border-divider text-xs text-ink-secondary flex-shrink-0">
          <span className="font-mono bg-surface-hover text-ink-primary px-2 py-0.5 rounded-sm">
            {selectedCommit.short_hash}
          </span>
          <span className="font-medium text-ink-primary">{selectedCommit.message}</span>
        </div>
      )}

      {selectedBranch && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border-divider text-xs text-ink-secondary flex-shrink-0">
          <span className="font-mono bg-surface-hover text-ink-primary px-2 py-0.5 rounded-sm">
            {selectedBranch.short_hash}
          </span>
          <span className="font-medium text-ink-primary">Branch: {selectedBranch.name}</span>
        </div>
      )}

      <ScrollProgressBar containerRef={mainContentRef} />
      <div className="flex h-[calc(100vh-140px)]">
        <div ref={mainContentRef} className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-ink-secondary text-lg">Loading...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 text-lg">Error: {error}</div>
            </div>
          ) : viewMode === "file" && currentFile ? (
            <div className="p-6">
              <div className="bg-surface px-4 py-2 mb-4 rounded">
                <button
                  onClick={() => setViewMode("diff")}
                  className="text-accent-review hover:opacity-80 text-sm"
                >
                  ← Back to diff
                </button>
                <h2 className="text-xl font-semibold mt-2">{currentFile}</h2>
              </div>
              {isImagePreview ? (
                <ImagePreview
                  fileName={currentFile}
                  status={imagePreviewStatus}
                  oldImageSrc={oldImageSrc}
                  newImageSrc={newImageSrc}
                  loading={imagePreviewLoading}
                  error={imagePreviewError}
                />
              ) : (
                <FileViewer
                  fileName={currentFile}
                  content={fileContent}
                  language={detectLanguage(currentFile)}
                  isViewed={viewedFiles.has(currentFile)}
                  onToggleViewed={() => toggleViewed(currentFile)}
                  onLineClick={handleLineClick}
                  onFileCommentClick={handleFileCommentClick}
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
              )}
            </div>
          ) : isEmptyState ? (
            isGitRepo ? (
              <div className="flex flex-col h-full bg-surface" data-inline-selector>
                <CommitSelectorContent
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
                  onSelectRange={handleRangeSelect}
                  onSelectBranch={handleBranchSelect}
                  onSelectStack={handleStackSelect}
                  onSelectStackEntry={handleStackEntrySelect}
                  onSelectStackDiff={handleStackDiffSelect}
                  onSelectWorktree={handleWorktreeSelect}
                  onSelectRef={handleRefSelect}
                  refError={commitSelector.refError}
                  onBackToStacks={commitSelector.backToStacks}
                  variant="inline"
                  autoFocus={false}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center aperture-grid bg-canvas h-full">
                <div className="text-center">
                  <div className="text-ink-muted text-4xl mb-4 select-none">⊕</div>
                  <p className="text-ink-secondary text-sm mb-4">No changes to review</p>
                </div>
              </div>
            )
          ) : (
            <div className="p-6">
              {files.map(renderFile)}
            </div>
          )}
        </div>
        {(changedFiles.length > 0 || comments.length > 0) && (
          <RightRail
            files={railFiles}
            comments={comments}
            width={rightRailWidth}
            visible={isRightRailVisible}
            resizing={isResizingRightRail}
            viewedCount={viewedCount}
            renderableFilesCount={renderableFiles.length}
            activeFile={activeDiffFile}
            onStartResize={() => setIsResizingRightRail(true)}
            onScrollToFile={scrollToDiffFile}
            onPreviewFile={handleFileSelect}
            onGoToComment={(comment) => void goToComment(comment)}
            onEditComment={updateComment}
            onDeleteComment={deleteComment}
            editingCommentId={editingCommentId}
            onStartEditComment={startEditing}
            onStopEditComment={stopEditing}
            onOpenCommentOverview={() => setShowCommentOverview(true)}
          />
        )}
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
          onGoToComment={(comment) => void goToComment(comment, { closeOverview: true })}
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
        onSelectRange={handleRangeSelect}
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

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "tiff",
]);

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

function getImageMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
  };
  return ext ? mimeMap[ext] || "application/octet-stream" : "application/octet-stream";
}

async function resolvePreviewRefs({
  workingDir,
  diffMode,
  selectedCommit,
  selectedBranch,
}: {
  workingDir: string;
  diffMode: DiffModeConfig;
  selectedCommit: CommitInfo | null;
  selectedBranch: BranchInfo | null;
}): Promise<{ oldRef: string; newRef: string; readNewFromWorkingTree: boolean }> {
  if (selectedCommit) {
    return {
      oldRef: `${selectedCommit.hash}~1`,
      newRef: selectedCommit.hash,
      readNewFromWorkingTree: false,
    };
  }

  if (selectedBranch) {
    const oldRef = await invoke<string>("get_branch_base", {
      path: workingDir,
      branch: selectedBranch.name,
    });
    return {
      oldRef,
      newRef: selectedBranch.name,
      readNewFromWorkingTree: false,
    };
  }

  if (diffMode.mode === "unstaged") {
    return {
      oldRef: ":0",
      newRef: "HEAD",
      readNewFromWorkingTree: true,
    };
  }

  if (diffMode.mode === "staged") {
    return {
      oldRef: "HEAD",
      newRef: ":0",
      readNewFromWorkingTree: false,
    };
  }

  if (diffMode.mode === "commit") {
    const commitRef = diffMode.commitRef || "HEAD";
    return {
      oldRef: `${commitRef}~1`,
      newRef: commitRef,
      readNewFromWorkingTree: false,
    };
  }

  if (diffMode.mode === "range" && diffMode.range) {
    const [fromRef, toRef] = diffMode.range.split("..");
    return {
      oldRef: fromRef || "HEAD",
      newRef: toRef || "HEAD",
      readNewFromWorkingTree: false,
    };
  }

  if (diffMode.mode === "branch" && diffMode.branchName) {
    const oldRef = await invoke<string>("get_branch_base", {
      path: workingDir,
      branch: diffMode.branchName,
    });
    return {
      oldRef,
      newRef: diffMode.branchName,
      readNewFromWorkingTree: false,
    };
  }

  return {
    oldRef: "HEAD",
    newRef: "HEAD",
    readNewFromWorkingTree: false,
  };
}

export default App;
