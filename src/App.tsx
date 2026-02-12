import { useState, useEffect } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import { invoke } from "@tauri-apps/api/core";
import "react-diff-view/style/index.css";
import "./diff.css";
import "highlight.js/styles/github-dark.css";
import { highlight } from "./highlight";
import { useGit } from "./hooks/useGit";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { useComments } from "./hooks/useComments";
import { FileExplorer } from "./components/FileExplorer";
import { FileList } from "./components/FileList";
import { FileViewer } from "./components/FileViewer";
import { AddCommentForm } from "./components/AddCommentForm";
import { CommentWidget } from "./components/CommentWidget";
import { generatePrompt } from "./lib/promptGenerator";
import type { DiffModeConfig } from "./types";

const EXAMPLE_DIFF = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1234567..abcdefg 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,10 +1,15 @@
 import React from 'react';
 
-interface ButtonProps {
+interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
   label: string;
-  onClick: () => void;
+  variant?: 'primary' | 'secondary';
+  size?: 'sm' | 'md' | 'lg';
 }
 
-export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
-  return <button onClick={onClick}>{label}</button>;
+export const Button: React.FC<ButtonProps> = ({ 
+  label, 
+  variant = 'primary',
+  size = 'md',
+  ...props 
+}) => {
+  return <button className={\`btn btn-\${variant} btn-\${size}\`} {...props}>{label}</button>;
 };`;

function App() {
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [diffText, setDiffText] = useState("");
  const [viewType, setViewType] = useState<"split" | "unified">("split");
  const [diffMode, setDiffMode] = useState<DiffModeConfig>({ mode: "unstaged" });
  const [commitRef, setCommitRef] = useState("HEAD~1");
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
  const [promptCopied, setPromptCopied] = useState(false);

  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
    editingCommentId,
    startEditing,
    stopEditing,
  } = useComments();

  const { isGitRepo, diffResult, loading, error, loadDiff } = useGit(workingDir);
  const fileExplorer = useFileExplorer(workingDir);

  useEffect(() => {
    invoke<string>("get_working_directory")
      .then((dir) => {
        console.log("Working directory:", dir);
        setWorkingDir(dir);
      })
      .catch((err) => {
        console.error("Failed to get working directory:", err);
        setDiffText(EXAMPLE_DIFF);
      });
  }, []);

  useEffect(() => {
    if (diffResult) {
      setDiffText(diffResult.diff || "No changes");
      setViewMode("diff");
    }
  }, [diffResult]);

  const files = diffText ? parseDiff(diffText) : [];

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
        // Use last focused line if available, otherwise default to first file at line 1
        if (lastFocusedLine) {
          handleLineClick(lastFocusedLine.file, lastFocusedLine.line, lastFocusedLine.side);
        } else if (files.length > 0) {
          const fileName = files[0].newPath || files[0].oldPath;
          handleLineClick(fileName, 1, "new");
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [files, lastFocusedLine]);

  const handleModeChange = (newMode: DiffModeConfig) => {
    setDiffMode(newMode);
    loadDiff(newMode);
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    
    if (!workingDir) return;
    
    try {
      const content = await invoke<string>("read_file_content", {
        path: workingDir,
        filePath,
      });
      setFileContent(content);
      setCurrentFile(filePath);
      setViewMode("file");
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const handleExplorerSelect = async (filePath: string) => {
    const file = await fileExplorer.onSelectFile(filePath);
    await handleFileSelect(file);
    return file;
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

  const handleGeneratePrompt = async () => {
    const prompt = generatePrompt(comments);
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleInstallCli = async () => {
    try {
      const result = await invoke<{
        success: boolean;
        message: string;
        path_warning: boolean;
      }>("install_cli");
      
      if (result.success) {
        if (result.path_warning) {
          alert(
            `✅ ${result.message}\n\n` +
            `To add ~/.local/bin to your PATH, add this line to your shell config:\n` +
            `export PATH="$HOME/.local/bin:$PATH"`
          );
        } else {
          alert(`✅ ${result.message}`);
        }
      }
    } catch (err) {
      alert(`❌ Failed to install CLI: ${err}`);
    }
  };

  const renderFile = (file: any) => {
    const tokens = highlight(file.hunks, {
      language: detectLanguage(file.newPath || file.oldPath),
    });

    return (
      <div key={file.oldPath + file.newPath} className="mb-6">
        <div className="bg-gray-700 px-4 py-2 font-semibold border-b border-gray-600 flex justify-between items-center">
          <div>
            {file.type === "delete" && (
              <span className="text-red-400">Deleted: {file.oldPath}</span>
            )}
            {file.type === "add" && (
              <span className="text-green-400">Added: {file.newPath}</span>
            )}
            {file.type === "modify" && (
              <span className="text-blue-400">Modified: {file.newPath}</span>
            )}
            {file.type === "rename" && (
              <span className="text-yellow-400">
                Renamed: {file.oldPath} → {file.newPath}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              const fileName = file.newPath || file.oldPath;
              // Find the first changed line in this file's hunks
              let firstLine = 1;
              if (file.hunks && file.hunks.length > 0) {
                const firstHunk = file.hunks[0];
                // Use the first new line number from the hunk
                firstLine = firstHunk.newStart || 1;
              }
              setLastFocusedLine({ file: fileName, line: firstLine, side: "new" });
              handleLineClick(fileName, firstLine, "new");
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            + Add Comment
          </button>
        </div>
        {addingCommentAt &&
          addingCommentAt.file === (file.newPath || file.oldPath) && (
            <div className="px-4 py-2 bg-gray-800">
              <AddCommentForm
                file={addingCommentAt.file}
                startLine={addingCommentAt.startLine}
                endLine={addingCommentAt.endLine}
                side={addingCommentAt.side}
                onSubmit={handleAddComment}
                onCancel={() => setAddingCommentAt(null)}
              />
            </div>
          )}
        <Diff
          viewType={viewType}
          diffType={file.type}
          hunks={file.hunks}
          tokens={tokens}
          gutterEvents={{
            onClick: (event: any) => {
              const { change } = event;
              if (change) {
                const fileName = file.newPath || file.oldPath;
                // react-diff-view uses newLineNumber and oldLineNumber, not lineNumber
                const side = change.isNormal
                  ? "new"
                  : change.type === "insert"
                    ? "new"
                    : "old";
                const lineNumber = side === "new" ? change.newLineNumber : change.oldLineNumber;
                if (lineNumber) {
                  handleLineClick(fileName, lineNumber, side);
                }
              }
            },
          }}
        >
          {(hunks: any[]) =>
            hunks.map((hunk) => (
              <Hunk key={hunk.content} hunk={hunk} />
            ))
          }
        </Diff>
        {(() => {
          const fileName = file.newPath || file.oldPath;
          const fileComments = comments.filter((c) => c.file === fileName);
          if (fileComments.length === 0) return null;
          return (
            <div className="px-4 py-2 bg-gray-800">
              <CommentWidget
                comments={fileComments}
                onEdit={updateComment}
                onDelete={deleteComment}
                editingId={editingCommentId}
                onStartEdit={startEditing}
                onStopEdit={stopEditing}
              />
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Code Review Tool</h1>
            <p className="text-gray-400 text-sm mt-1">
              {isGitRepo ? (
                <span className="text-green-400">
                  Git repo detected: {workingDir}
                </span>
              ) : (
                "Paste a unified diff or open from a git repository"
              )}
            </p>
          </div>
          {isGitRepo && (
            <div className="text-sm text-gray-400">
              Press <kbd className="px-2 py-1 bg-gray-700 rounded">Shift</kbd>{" "}
              <kbd className="px-2 py-1 bg-gray-700 rounded">Shift</kbd> to search files
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType("split")}
            className={`px-4 py-2 rounded transition-colors ${
              viewType === "split"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewType("unified")}
            className={`px-4 py-2 rounded transition-colors ${
              viewType === "unified"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Unified View
          </button>
        </div>

        {isGitRepo && (
          <>
            <div className="h-6 w-px bg-gray-600" />
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleModeChange({ mode: "unstaged" })}
                className={`px-4 py-2 rounded transition-colors ${
                  diffMode.mode === "unstaged"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Unstaged
              </button>
              <button
                onClick={() => handleModeChange({ mode: "staged" })}
                className={`px-4 py-2 rounded transition-colors ${
                  diffMode.mode === "staged"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Staged
              </button>
              <input
                type="text"
                value={commitRef}
                onChange={(e) => setCommitRef(e.target.value)}
                placeholder="HEAD~1"
                className="px-3 py-2 bg-gray-900 text-white rounded text-sm w-32"
              />
              <button
                onClick={() =>
                  handleModeChange({ mode: "commit", commitRef })
                }
                className={`px-4 py-2 rounded transition-colors ${
                  diffMode.mode === "commit"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Compare
              </button>
            </div>
          </>
        )}

        {!isGitRepo && (
          <button
            onClick={() => setDiffText(EXAMPLE_DIFF)}
            className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors ml-auto"
          >
            Load Example
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {comments.length > 0 && (
            <>
              <span className="px-3 py-1 bg-yellow-600 text-white rounded text-sm">
                {comments.length} comment{comments.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleGeneratePrompt}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                {promptCopied ? "Copied!" : "Generate Prompt"}
              </button>
            </>
          )}
          <button
            onClick={handleInstallCli}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
            title="Install CLI command"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Install CLI
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {isGitRepo && diffResult ? (
          <div className="w-64 border-r border-gray-700 flex flex-col bg-gray-800">
            <div className="px-4 py-2 border-b border-gray-700 font-semibold">
              Changed Files ({diffResult.files.length})
            </div>
            <div className="flex-1 overflow-auto">
              <FileList
                files={diffResult.files}
                selectedFile={selectedFile}
                onSelectFile={handleFileSelect}
              />
            </div>
          </div>
        ) : (
          <div className="w-1/3 border-r border-gray-700 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-semibold">
              Paste Diff
            </div>
            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
              placeholder="Paste your unified diff here..."
            />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 text-lg">Loading...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 text-lg">Error: {error}</div>
            </div>
          ) : viewMode === "file" && currentFile ? (
            <div className="p-6">
              <div className="bg-gray-800 px-4 py-2 mb-4 rounded">
                <button
                  onClick={() => setViewMode("diff")}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ← Back to diff
                </button>
                <h2 className="text-xl font-semibold mt-2">{currentFile}</h2>
              </div>
              <FileViewer
                fileName={currentFile}
                content={fileContent}
                language={detectLanguage(currentFile)}
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
              />
            </div>
          ) : (
            <div className="p-6">
              {files.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-lg">No diff to display</p>
                  <p className="text-sm mt-2">
                    {isGitRepo
                      ? "No changes detected in this mode"
                      : "Paste a unified diff in the left panel"}
                  </p>
                </div>
              ) : (
                files.map(renderFile)
              )}
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
