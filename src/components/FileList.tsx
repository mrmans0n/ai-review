import { useMemo, type MouseEvent } from "react";
import type { ChangedFile } from "../types";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface FileListProps {
  files: ChangedFile[];
  activeFile?: string;
  onSelectFile: (file: string) => void;
  onPreviewFile?: (file: string) => void;
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
      return "text-ink-muted";
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

export function FileList({
  files,
  activeFile,
  onSelectFile,
  onPreviewFile,
}: FileListProps) {
  const groups = useMemo(() => groupFilesByDirectory(files), [files]);

  const handleFileClick = (event: MouseEvent<HTMLButtonElement>, file: string) => {
    if ((event.metaKey || event.ctrlKey) && onPreviewFile) {
      onPreviewFile(file);
      return;
    }

    onSelectFile(file);
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-ink-muted text-sm">
        No changed files
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.directory}>
          {group.directory && (
            <div className="px-3 pt-2.5 pb-1 text-[11px] font-mono text-ink-muted">
              <MiddleEllipsis text={group.directory} />
            </div>
          )}
          {group.files.map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-1 transition-colors border-l-2 rounded-sm ${
                group.directory ? "pl-6 pr-3" : "px-4"
              } py-1.5 ${
                activeFile === file.path
                  ? "bg-surface border-accent-review"
                  : "border-transparent hover:bg-surface-hover"
              }`}
            >
              <button
                type="button"
                aria-label={`Go to ${file.path}`}
                onClick={(event) => handleFileClick(event, file.path)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className={`font-bold flex-shrink-0 ${getStatusColor(file.status)}`}>
                  {getStatusIcon(file.status)}
                </span>
                <span className="text-sm font-mono text-ink-secondary min-w-0 flex-1">
                  <MiddleEllipsis text={getFileName(file.path)} />
                </span>
              </button>
              {onPreviewFile && (
                <button
                  type="button"
                  aria-label={`Preview ${file.path}`}
                  title="Preview full file"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewFile(file.path);
                  }}
                  className="flex-shrink-0 rounded-sm p-1 text-ctp-overlay0 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
