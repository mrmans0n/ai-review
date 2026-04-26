import type { ChangedFileRailItem, NormalizedFileStatus } from "../types";

export interface FileTreeDirectoryNode {
  type: "directory";
  id: string;
  name: string;
  path: string;
  children: FileTreeNode[];
}

export interface FileTreeFileNode {
  type: "file";
  id: string;
  name: string;
  path: string;
  file: ChangedFileRailItem;
}

export type FileTreeNode = FileTreeDirectoryNode | FileTreeFileNode;

interface MutableDirectoryNode extends Omit<FileTreeDirectoryNode, "children"> {
  type: "directory";
  directories: Map<string, MutableDirectoryNode>;
  files: FileTreeFileNode[];
}

const STATUS_MAP: Record<string, NormalizedFileStatus> = {
  a: "added",
  add: "added",
  added: "added",
  new: "added",
  m: "modified",
  modify: "modified",
  modified: "modified",
  d: "deleted",
  delete: "deleted",
  deleted: "deleted",
  r: "renamed",
  rename: "renamed",
  renamed: "renamed",
  c: "copied",
  copy: "copied",
  copied: "copied",
};

export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

export function normalizeFileStatus(status: string): NormalizedFileStatus {
  return STATUS_MAP[status.trim().toLowerCase()] ?? "unknown";
}

export function buildFileTree(files: ChangedFileRailItem[]): FileTreeNode[] {
  const root = makeDirectory("", "");

  for (const file of files) {
    const normalizedPath = normalizePath(file.displayPath || file.path);
    if (!normalizedPath) continue;

    const segments = normalizedPath.split("/");
    const fileName = segments.pop();
    if (!fileName) continue;

    let current = root;
    for (const segment of segments) {
      const nextPath = current.path ? `${current.path}/${segment}` : segment;
      let next = current.directories.get(segment);
      if (!next) {
        next = makeDirectory(segment, nextPath);
        current.directories.set(segment, next);
      }
      current = next;
    }

    current.files.push({
      type: "file",
      id: `file:${normalizedPath}`,
      name: fileName,
      path: normalizedPath,
      file: {
        ...file,
        displayPath: normalizedPath,
      },
    });
  }

  return flattenDirectoryChains(toSortedNodes(root));
}

export function flattenDirectoryChains(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.type === "file") return node;

    let directory: FileTreeDirectoryNode = {
      ...node,
      children: flattenDirectoryChains(node.children),
    };

    while (
      directory.children.length === 1 &&
      directory.children[0].type === "directory"
    ) {
      const child = directory.children[0];
      directory = {
        ...child,
        id: `dir:${child.path}`,
        name: `${directory.name}/${child.name}`,
        path: child.path,
        children: child.children,
      };
    }

    return directory;
  });
}

function makeDirectory(name: string, path: string): MutableDirectoryNode {
  return {
    type: "directory",
    id: path ? `dir:${path}` : "dir:",
    name,
    path,
    directories: new Map(),
    files: [],
  };
}

function toSortedNodes(directory: MutableDirectoryNode): FileTreeNode[] {
  const directories = Array.from(directory.directories.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map<FileTreeDirectoryNode>((child) => ({
      type: "directory",
      id: child.id,
      name: child.name,
      path: child.path,
      children: toSortedNodes(child),
    }));

  const files = [...directory.files].sort((a, b) => a.name.localeCompare(b.name));

  return [...directories, ...files];
}
