import { useState } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import "react-diff-view/style/index.css";
import "./diff.css";
import "highlight.js/styles/github-dark.css";
import { highlight } from "./highlight";

// Example diff that loads on startup
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
 };
diff --git a/src/utils/logger.ts b/src/utils/logger.ts
new file mode 100644
index 0000000..9876543
--- /dev/null
+++ b/src/utils/logger.ts
@@ -0,0 +1,12 @@
+export enum LogLevel {
+  DEBUG,
+  INFO,
+  WARN,
+  ERROR,
+}
+
+export const log = (level: LogLevel, message: string) => {
+  const timestamp = new Date().toISOString();
+  console.log(\`[\${timestamp}] [\${LogLevel[level]}] \${message}\`);
+};
+`;

function App() {
  const [diffText, setDiffText] = useState(EXAMPLE_DIFF);
  const [viewType, setViewType] = useState<"split" | "unified">("split");

  // Parse the diff text
  const files = parseDiff(diffText);

  const renderFile = (file: any) => {
    return (
      <div key={file.oldPath + file.newPath} className="mb-6">
        <div className="bg-gray-700 px-4 py-2 font-semibold border-b border-gray-600">
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
        <Diff
          viewType={viewType}
          diffType={file.type}
          hunks={file.hunks}
          tokens={highlight(file.hunks, { language: detectLanguage(file.newPath) })}
        >
          {(hunks: any[]) =>
            hunks.map((hunk) => (
              <Hunk key={hunk.content} hunk={hunk} />
            ))
          }
        </Diff>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">AI Code Review Tool</h1>
        <p className="text-gray-400 text-sm mt-1">
          Paste a unified diff below or use the example to get started
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-4">
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
        <button
          onClick={() => setDiffText(EXAMPLE_DIFF)}
          className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors ml-auto"
        >
          Load Example
        </button>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Input Panel */}
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

        {/* Diff Viewer Panel */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {files.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <p className="text-lg">No diff to display</p>
                <p className="text-sm mt-2">Paste a unified diff in the left panel</p>
              </div>
            ) : (
              files.map(renderFile)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Detect language from file extension
function detectLanguage(filename: string): string {
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
