import { useEffect, useState } from "react";
import { parsePromptLines } from "../lib/promptParser";

interface PromptPreviewProps {
  prompt: string;
  onClose: () => void;
}

export function PromptPreview({ prompt, onClose }: PromptPreviewProps) {
  const [editablePrompt, setEditablePrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"rich" | "raw">("rich");

  // Restore focus to body when modal unmounts so keyboard shortcuts work again
  useEffect(() => {
    return () => {
      document.body.focus();
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editablePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Generated Prompt</h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex bg-gray-900 rounded p-0.5 text-xs">
              <button
                onClick={() => setViewMode("rich")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "rich" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Formatted
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "raw" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Raw
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {viewMode === "raw" ? (
            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              className="w-full h-full min-h-[60vh] p-4 bg-gray-900 text-gray-100 font-mono text-sm rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="min-h-[60vh] p-4 bg-gray-900 rounded space-y-1">
              {parsePromptLines(editablePrompt).map((line, i) =>
                line.type === "text" ? (
                  <p key={i} className="text-gray-300 text-sm">
                    {line.content || "\u00A0"}
                  </p>
                ) : (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 bg-gray-700 text-gray-200 rounded-full px-2.5 py-0.5 text-xs font-mono flex-shrink-0">
                      {line.fileName}
                      <span className="text-gray-400">
                        ({line.endLine ? `L${line.startLine}-${line.endLine}` : `L${line.startLine}`})
                      </span>
                    </span>
                    <span className="text-gray-200">{line.text}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
