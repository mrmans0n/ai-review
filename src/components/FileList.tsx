import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { buildFileTree } from "../lib/fileTree";
import type { FileTreeDirectoryNode, FileTreeNode } from "../lib/fileTree";
import type { ChangedFileRailItem, NormalizedFileStatus } from "../types";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface FileListProps {
  files: ChangedFileRailItem[];
  selectedFile?: string;
  onSelectFile: (file: string) => void;
  onPreviewFile?: (file: string) => void;
}

const LARGE_TREE_FILE_COUNT = 30;

function getStatusColor(status: NormalizedFileStatus): string {
  switch (status) {
    case "added":
      return "text-ctp-green border-ctp-green/40 bg-ctp-green/10";
    case "modified":
      return "text-ctp-blue border-ctp-blue/40 bg-ctp-blue/10";
    case "deleted":
      return "text-ctp-red border-ctp-red/40 bg-ctp-red/10";
    case "renamed":
    case "copied":
      return "text-ctp-yellow border-ctp-yellow/40 bg-ctp-yellow/10";
    default:
      return "text-ink-muted";
  }
}

function getStatusIcon(status: NormalizedFileStatus): string {
  switch (status) {
    case "added":
      return "+";
    case "modified":
      return "~";
    case "deleted":
      return "-";
    case "renamed":
      return ">";
    case "copied":
      return "=";
    default:
      return "?";
  }
}

function collectDirectoryIds(
  nodes: FileTreeNode[],
  ids = new Set<string>()
): Set<string> {
  for (const node of nodes) {
    if (node.type !== "directory") continue;
    ids.add(node.id);
    collectDirectoryIds(node.children, ids);
  }

  return ids;
}

function collectDefaultExpandedDirectories(
  nodes: FileTreeNode[],
  expandAll: boolean,
  depth = 0,
  ids = new Set<string>()
): Set<string> {
  for (const node of nodes) {
    if (node.type !== "directory") continue;
    if (expandAll || depth === 0) ids.add(node.id);
    collectDefaultExpandedDirectories(node.children, expandAll, depth + 1, ids);
  }

  return ids;
}

function findAncestorDirectoryIds(
  nodes: FileTreeNode[],
  filePath: string,
  ancestors: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.type === "file" && node.file.path === filePath) {
      return ancestors;
    }
    if (node.type === "directory") {
      const result = findAncestorDirectoryIds(
        node.children,
        filePath,
        [...ancestors, node.id]
      );
      if (result) return result;
    }
  }
  return null;
}

export function FileList({
  files,
  selectedFile,
  onSelectFile,
  onPreviewFile,
}: FileListProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [expandedDirectoryIds, setExpandedDirectoryIds] = useState<Set<string>>(() =>
    collectDefaultExpandedDirectories(tree, files.length <= LARGE_TREE_FILE_COUNT)
  );
  const initializedDirectoryIdsRef = useRef<Set<string>>(collectDirectoryIds(tree));
  const [localSelectedFile, setLocalSelectedFile] = useState<string | undefined>();

  useEffect(() => {
    setExpandedDirectoryIds((current) => {
      const defaults = collectDefaultExpandedDirectories(
        tree,
        files.length <= LARGE_TREE_FILE_COUNT
      );
      const directoryIds = collectDirectoryIds(tree);
      const initializedDirectoryIds = initializedDirectoryIdsRef.current;
      const next = new Set(current);
      let changed = false;

      for (const id of directoryIds) {
        if (initializedDirectoryIds.has(id)) continue;
        initializedDirectoryIds.add(id);
        if (defaults.has(id)) {
          next.add(id);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [files.length, tree]);

  useEffect(() => {
    if (!selectedFile) return;
    const ancestors = findAncestorDirectoryIds(tree, selectedFile);
    if (!ancestors || ancestors.length === 0) return;
    setExpandedDirectoryIds((current) => {
      if (ancestors.every((id) => current.has(id))) return current;
      const next = new Set(current);
      for (const id of ancestors) next.add(id);
      return next;
    });
  }, [selectedFile, tree]);

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-ink-muted text-sm">
        No changed files
      </div>
    );
  }

  const toggleDirectory = (directoryId: string) => {
    setExpandedDirectoryIds((current) => {
      const next = new Set(current);
      if (next.has(directoryId)) {
        next.delete(directoryId);
      } else {
        next.add(directoryId);
      }
      return next;
    });
  };

  const handleFileClick = (
    event: MouseEvent<HTMLButtonElement>,
    file: ChangedFileRailItem
  ) => {
    if (event.metaKey || event.ctrlKey) {
      onPreviewFile?.(file.path);
      return;
    }

    setLocalSelectedFile(file.path);
    onSelectFile(file.path);
  };

  const handlePreviewClick = (
    event: MouseEvent<HTMLButtonElement>,
    file: ChangedFileRailItem
  ) => {
    event.stopPropagation();
    onPreviewFile?.(file.path);
  };

  const renderNode = (node: FileTreeNode, depth: number): ReactElement => {
    if (node.type === "directory") {
      return (
        <DirectoryRow
          key={node.id}
          directory={node}
          depth={depth}
          expanded={expandedDirectoryIds.has(node.id)}
          onToggle={toggleDirectory}
          renderNode={renderNode}
        />
      );
    }

    const file = node.file;
    const isActive = selectedFile === file.path;
    const isSelected = localSelectedFile === file.path;
    const hasChanges = file.additions > 0 || file.deletions > 0;

    return (
      <div
        key={node.id}
        data-testid={`file-row-${file.path}`}
        className={`group flex items-stretch transition-colors border-l-2 rounded-sm ${
          isActive
            ? "bg-surface border-accent-review text-ink-primary"
            : "border-transparent text-ink-secondary hover:bg-surface-hover"
        } ${isSelected && !isActive ? "bg-ctp-surface1/60" : ""} ${
          file.viewed ? "opacity-65" : ""
        }`}
      >
        <button
          type="button"
          aria-label={file.displayPath}
          aria-current={isActive ? "true" : undefined}
          onClick={(event) => handleFileClick(event, file)}
          className="min-w-0 flex-1 py-1.5 pr-1 text-left"
          style={{ paddingLeft: `${Math.min(12 + depth * 14, 64)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              aria-label={`${file.status} status`}
              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-sm border px-1 text-[10px] font-bold leading-none flex-shrink-0 ${getStatusColor(file.status)}`}
            >
              {getStatusIcon(file.status)}
            </span>
            <span
              className={`text-sm font-mono min-w-0 flex-1 ${
                file.viewed ? "text-ink-muted" : "text-ink-secondary"
              }`}
            >
              <MiddleEllipsis text={node.name} />
            </span>
            {file.viewed && (
              <span aria-label="viewed" className="text-[11px] text-ctp-green flex-shrink-0">
                ✓
              </span>
            )}
            {file.commentCount > 0 && (
              <span
                aria-label={`${file.commentCount} comments`}
                className="rounded-sm border border-ctp-mauve/40 bg-ctp-mauve/10 px-1.5 py-0.5 text-[10px] leading-none text-ctp-mauve flex-shrink-0"
              >
                {file.commentCount}
              </span>
            )}
            {hasChanges && (
              <span className="hidden min-[220px]:inline-flex gap-1 text-[10px] font-mono flex-shrink-0">
                {file.additions > 0 && (
                  <span className="text-ctp-green">+{file.additions}</span>
                )}
                {file.deletions > 0 && (
                  <span className="text-ctp-red">-{file.deletions}</span>
                )}
              </span>
            )}
          </div>
        </button>
        {onPreviewFile && (
          <button
            type="button"
            aria-label={`Preview ${file.displayPath}`}
            onClick={(event) => handlePreviewClick(event, file)}
            className="my-1 mr-1 rounded-sm px-1.5 text-[10px] text-ctp-overlay0 opacity-0 transition-opacity hover:bg-ctp-surface1 hover:text-ctp-text focus:opacity-100 group-hover:opacity-100"
          >
            ⤢
          </button>
        )}
      </div>
    );
  };

  return <div className="flex flex-col py-1">{tree.map((node) => renderNode(node, 0))}</div>;
}

interface DirectoryRowProps {
  directory: FileTreeDirectoryNode;
  depth: number;
  expanded: boolean;
  onToggle: (directoryId: string) => void;
  renderNode: (node: FileTreeNode, depth: number) => ReactElement;
}

function DirectoryRow({
  directory,
  depth,
  expanded,
  onToggle,
  renderNode,
}: DirectoryRowProps) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`Toggle directory ${directory.path}`}
        onClick={() => onToggle(directory.id)}
        className="flex w-full items-center gap-1.5 rounded-sm py-1 pr-3 text-left text-[11px] font-mono text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-secondary"
        style={{ paddingLeft: `${Math.min(8 + depth * 14, 60)}px` }}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] flex-shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="min-w-0 flex-1">
          <MiddleEllipsis text={directory.name} />
        </span>
        <span className="text-[10px] text-ink-muted">
          {directory.children.length}
        </span>
      </button>
      {expanded && (
        <div>
          {directory.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );
}
