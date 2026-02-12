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
        return "text-green-400";
      case "modified":
        return "text-blue-400";
      case "deleted":
        return "text-red-400";
      case "renamed":
        return "text-yellow-400";
      default:
        return "text-gray-400";
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
      <div className="p-4 text-center text-gray-500 text-sm">
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
          className={`px-4 py-2 text-left transition-colors border-l-2 ${
            selectedFile === file.path
              ? "bg-gray-700 border-blue-500"
              : "border-transparent hover:bg-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getStatusColor(file.status)}`}>
              {getStatusIcon(file.status)}
            </span>
            <span className="text-sm font-mono text-gray-300 truncate">
              {file.path}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
