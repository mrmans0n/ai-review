import { useMemo } from "react";
import type { ChangedFile } from "../types";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface FileListProps {
  files: ChangedFile[];
  selectedFile?: string;
  onSelectFile: (file: string) => void;
}

interface FileGroup {
  directory: string;
  files: ChangedFile[];
}

function groupFilesByDirectory(files: ChangedFile[]): FileGroup[] {
  const groups = new Map<string, ChangedFile[]>();

  for (const file of files) {
    const lastSlash = file.path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? file.path.slice(0, lastSlash + 1) : "";
    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(file);
  }

  // Sort groups by directory path, root files first
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([directory, files]) => ({ directory, files }));
}

function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "added":
      return "text-ctp-green";
    case "modified":
      return "text-ctp-blue";
    case "deleted":
      return "text-ctp-red";
    case "renamed":
      return "text-ctp-yellow";
    default:
      return "text-ctp-overlay0";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "added":
      return "+";
    case "modified":
      return "~";
    case "deleted":
      return "-";
    case "renamed":
      return "→";
    default:
      return "?";
  }
}

export function FileList({ files, selectedFile, onSelectFile }: FileListProps) {
  const groups = useMemo(() => groupFilesByDirectory(files), [files]);

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-ctp-overlay0 text-sm">
        No changed files
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.directory}>
          {group.directory && (
            <div className="px-3 pt-2.5 pb-1 text-[11px] font-mono text-ctp-overlay0">
              <MiddleEllipsis text={group.directory} />
            </div>
          )}
          {group.files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`w-full text-left transition-colors border-l-2 rounded-sm ${
                group.directory ? "pl-6 pr-3" : "px-4"
              } py-1.5 ${
                selectedFile === file.path
                  ? "bg-ctp-surface0 border-ctp-peach"
                  : "border-transparent hover:bg-ctp-surface0"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-bold flex-shrink-0 ${getStatusColor(file.status)}`}>
                  {getStatusIcon(file.status)}
                </span>
                <span className="text-sm font-mono text-ctp-subtext min-w-0 flex-1">
                  <MiddleEllipsis text={getFileName(file.path)} />
                </span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
