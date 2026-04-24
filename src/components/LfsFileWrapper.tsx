import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ImagePreview } from "./ImagePreview";
import { LfsTextPreview } from "./LfsTextPreview";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import { isWholeFileComment } from "../lib/lfsDetection";
import type { Comment, DiffModeConfig, CommitInfo, BranchInfo } from "../types";

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff",
]);

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

function getImageMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
  };
  return mimeMap[ext] || "application/octet-stream";
}

async function resolvePreviewRefs({
  workingDir,
  diffMode,
  selectedCommit,
  selectedBranch,
}: {
  workingDir: string;
  diffMode: DiffModeConfig;
  selectedCommit: CommitInfo | null;
  selectedBranch: BranchInfo | null;
}): Promise<{ oldRef: string; newRef: string; readNewFromWorkingTree: boolean }> {
  if (selectedCommit) {
    return { oldRef: `${selectedCommit.hash}~1`, newRef: selectedCommit.hash, readNewFromWorkingTree: false };
  }
  if (selectedBranch) {
    const oldRef = await invoke<string>("get_branch_base", { path: workingDir, branch: selectedBranch.name });
    return { oldRef, newRef: selectedBranch.name, readNewFromWorkingTree: false };
  }
  if (diffMode.mode === "unstaged") {
    return { oldRef: ":0", newRef: "HEAD", readNewFromWorkingTree: true };
  }
  if (diffMode.mode === "staged") {
    return { oldRef: "HEAD", newRef: ":0", readNewFromWorkingTree: false };
  }
  if (diffMode.mode === "commit") {
    const commitRef = diffMode.commitRef || "HEAD";
    return { oldRef: `${commitRef}~1`, newRef: commitRef, readNewFromWorkingTree: false };
  }
  if (diffMode.mode === "range" && diffMode.range) {
    const [fromRef, toRef] = diffMode.range.split("..");
    return { oldRef: fromRef || "HEAD", newRef: toRef || "HEAD", readNewFromWorkingTree: false };
  }
  if (diffMode.mode === "branch" && diffMode.branchName) {
    const oldRef = await invoke<string>("get_branch_base", { path: workingDir, branch: diffMode.branchName });
    return { oldRef, newRef: diffMode.branchName, readNewFromWorkingTree: false };
  }
  return { oldRef: "HEAD", newRef: "HEAD", readNewFromWorkingTree: false };
}

interface Change {
  type: string;
  content: string;
  [key: string]: unknown;
}

interface Hunk {
  changes: Change[];
  [key: string]: unknown;
}

interface LfsFileWrapperProps {
  fileName: string;
  oldPath?: string;
  fileStatus: string;
  hunks: Hunk[];
  workingDir: string;
  diffMode: DiffModeConfig;
  selectedCommit: CommitInfo | null;
  selectedBranch: BranchInfo | null;
  comments: Comment[];
  onAddComment: (file: string, startLine: number, endLine: number, side: "old" | "new", text: string) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}

export function LfsFileWrapper({
  fileName,
  oldPath,
  fileStatus,
  hunks,
  workingDir,
  diffMode,
  selectedCommit,
  selectedBranch,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
}: LfsFileWrapperProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oldContent, setOldContent] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState(false);
  const oldFilePath = oldPath || fileName;

  const isImage = isImageFile(fileName);
  const wholeFileComments = comments.filter(
    (c) => c.file === fileName && isWholeFileComment(c)
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchContent() {
      setLoading(true);
      setError(null);
      setOldContent(null);
      setNewContent(null);

      try {
        const refs = await resolvePreviewRefs({ workingDir, diffMode, selectedCommit, selectedBranch });
        if (cancelled) return;

        if (isImage) {
          const mimeType = getImageMimeType(fileName);
          const makeDataUrl = (base64: string) => `data:${mimeType};base64,${base64}`;

          if (fileStatus === "added") {
            const base64 = refs.readNewFromWorkingTree
              ? await invoke<string>("read_file_content_base64", { path: workingDir, filePath: fileName })
              : await invoke<string>("get_file_at_ref_filtered_base64", { path: workingDir, gitRef: refs.newRef, filePath: fileName });
            if (!cancelled) setNewContent(makeDataUrl(base64));
          } else if (fileStatus === "deleted") {
            const base64 = await invoke<string>("get_file_at_ref_filtered_base64", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath });
            if (!cancelled) setOldContent(makeDataUrl(base64));
          } else {
            const [oldBase64, newBase64] = await Promise.all([
              invoke<string>("get_file_at_ref_filtered_base64", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath }),
              refs.readNewFromWorkingTree
                ? invoke<string>("read_file_content_base64", { path: workingDir, filePath: fileName })
                : invoke<string>("get_file_at_ref_filtered_base64", { path: workingDir, gitRef: refs.newRef, filePath: fileName }),
            ]);
            if (!cancelled) {
              setOldContent(makeDataUrl(oldBase64));
              setNewContent(makeDataUrl(newBase64));
            }
          }
        } else {
          if (fileStatus === "added") {
            const text = refs.readNewFromWorkingTree
              ? await invoke<string>("read_file_content", { path: workingDir, filePath: fileName })
              : await invoke<string>("get_file_at_ref_filtered", { path: workingDir, gitRef: refs.newRef, filePath: fileName });
            if (!cancelled) setNewContent(text);
          } else if (fileStatus === "deleted") {
            const text = await invoke<string>("get_file_at_ref_filtered", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath });
            if (!cancelled) setOldContent(text);
          } else {
            const [oldText, newText] = await Promise.all([
              invoke<string>("get_file_at_ref_filtered", { path: workingDir, gitRef: refs.oldRef, filePath: oldFilePath }),
              refs.readNewFromWorkingTree
                ? invoke<string>("read_file_content", { path: workingDir, filePath: fileName })
                : invoke<string>("get_file_at_ref_filtered", { path: workingDir, gitRef: refs.newRef, filePath: fileName }),
            ]);
            if (!cancelled) {
              setOldContent(oldText);
              setNewContent(newText);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchContent();
    return () => { cancelled = true; };
  }, [fileName, oldFilePath, fileStatus, workingDir, diffMode, selectedCommit, selectedBranch, isImage]);

  return (
    <div className="p-4 space-y-4">
      {/* Content preview */}
      {isImage ? (
        <ImagePreview
          fileName={fileName}
          status={fileStatus}
          oldImageSrc={oldContent}
          newImageSrc={newContent}
          loading={loading}
          error={error}
        />
      ) : (
        <LfsTextPreview
          fileName={fileName}
          status={fileStatus}
          oldContent={oldContent}
          newContent={newContent}
          loading={loading}
          error={error}
        />
      )}

      {/* Collapsible LFS metadata */}
      <details className="text-sm">
        <summary className="cursor-pointer text-ctp-subtext hover:text-ctp-text transition-colors select-none">
          LFS pointer metadata
        </summary>
        <div className="mt-2 rounded border border-ctp-surface1 bg-ctp-base p-3 font-mono text-xs text-ctp-subtext overflow-x-auto">
          {hunks.map((hunk, hi) =>
            hunk.changes.map((change, ci) => {
              const prefix = change.type === "insert" ? "+" : change.type === "delete" ? "-" : " ";
              const colorClass =
                change.type === "insert" ? "text-ctp-green" : change.type === "delete" ? "text-ctp-red" : "";
              return (
                <div key={`${hi}-${ci}`} className={colorClass}>
                  {prefix}{change.content.replace(/^[+-]/, "")}
                </div>
              );
            })
          )}
        </div>
      </details>

      {/* Whole-file comments */}
      <div className="space-y-2">
        {wholeFileComments.length > 0 && (
          <CommentWidget
            comments={wholeFileComments}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
            editingId={editingCommentId}
            onStartEdit={onStartEditComment}
            onStopEdit={onStopEditComment}
          />
        )}

        {addingComment ? (
          <AddCommentForm
            file={fileName}
            startLine={0}
            endLine={0}
            side="new"
            onSubmit={(text) => {
              onAddComment(fileName, 0, 0, "new", text);
              setAddingComment(false);
            }}
            onCancel={() => setAddingComment(false)}
          />
        ) : (
          <button
            onClick={() => setAddingComment(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 rounded-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
            </svg>
            Add comment
          </button>
        )}
      </div>
    </div>
  );
}
