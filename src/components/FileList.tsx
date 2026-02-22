import type { ChangedFile } from "../types";

interface FileListProps {
  files: ChangedFile[];
  selectedFile?: string;
  onSelectFile: (file: string) => void;
}

export function FileList({ files, selectedFile, onSelectFile }: FileListProps) {
  const getStatusColor = (status: string) => {
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
  };

  const getStatusIcon = (status: string) => {
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
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-ctp-overlay0 text-sm">
        No changed files
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          className={`px-4 py-2 text-left transition-colors border-l-2 rounded-sm ${
            selectedFile === file.path
              ? "bg-ctp-surface0 border-ctp-peach"
              : "border-transparent hover:bg-ctp-surface0"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getStatusColor(file.status)}`}>
              {getStatusIcon(file.status)}
            </span>
            <span className="text-sm font-mono text-ctp-subtext truncate">
              {file.path}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
