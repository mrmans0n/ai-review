import { useEffect, useState } from "react";
import { parsePromptLines } from "../lib/promptParser";
import { invoke } from "@tauri-apps/api/core";

interface PromptPreviewProps {
  prompt: string;
  onClose: () => void;
  waitMode: boolean;
}

export function PromptPreview({ prompt, onClose, waitMode }: PromptPreviewProps) {
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

  const handleSubmitAndExit = async () => {
    try {
      await invoke("submit_feedback", { feedback: editablePrompt });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-ctp-surface0 border border-ctp-surface1 rounded-md shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
          <div className="w-0.5 h-5 bg-ctp-peach rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ctp-text">Generated Prompt</h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="inline-flex bg-ctp-base rounded p-0.5 text-xs border border-ctp-surface1">
              <button
                onClick={() => setViewMode("rich")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "rich" ? "bg-ctp-surface0 text-ctp-text" : "text-ctp-subtext hover:text-ctp-text"
                }`}
              >
                Formatted
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "raw" ? "bg-ctp-surface0 text-ctp-text" : "text-ctp-subtext hover:text-ctp-text"
                }`}
              >
                Raw
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-ctp-subtext hover:text-ctp-text transition-colors"
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
              className="w-full h-full min-h-[60vh] bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text font-mono text-sm p-4 resize-none focus:outline-none focus:border-ctp-mauve"
              autoFocus
            />
          ) : (
            <div className="min-h-[60vh] bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text font-mono text-sm p-4 space-y-1">
              {parsePromptLines(editablePrompt).map((line, i) =>
                line.type === "text" ? (
                  <p key={i} className="text-ctp-subtext text-sm">
                    {line.content || "\u00A0"}
                  </p>
                ) : line.type === "codeblock" ? (
                  <div key={i} className="my-2 rounded-sm overflow-hidden border border-ctp-surface1">
                    {line.language && (
                      <div className="px-3 py-1 bg-ctp-surface0 text-ctp-subtext text-xs font-mono">
                        {line.language}
                      </div>
                    )}
                    <pre className="p-3 bg-ctp-base text-ctp-text text-sm font-mono overflow-x-auto">
                      <code>{line.content}</code>
                    </pre>
                  </div>
                ) : (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 bg-ctp-surface0 text-ctp-subtext rounded-sm px-2 py-0.5 text-xs font-mono flex-shrink-0">
                      {line.fileName}
                      <span className="text-ctp-overlay0">
                        ({line.endLine ? `L${line.startLine}-${line.endLine}` : `L${line.startLine}`})
                      </span>
                    </span>
                    {line.deleted && (
                      <span className="text-orange-400 text-xs">deleted</span>
                    )}
                    <span className="text-ctp-text">{line.text}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ctp-surface1 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-ctp-subtext hover:text-ctp-text transition-colors px-4 py-2 text-sm"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-ctp-mauve text-ctp-base rounded-sm text-sm hover:opacity-90 transition-opacity"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          {waitMode && (
            <button
              onClick={handleSubmitAndExit}
              className="px-4 py-2 bg-ctp-green text-ctp-base rounded-sm text-sm hover:opacity-90 transition-opacity font-semibold"
            >
              Submit & Exit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
