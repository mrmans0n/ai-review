import { useState } from "react";
import { LfsTextPreview } from "./LfsTextPreview";
import { ImagePreview } from "./ImagePreview";
import { AddCommentForm } from "./AddCommentForm";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";
import type { LfsPointerInfo } from "../lib/lfsDetection";

interface LfsFileWrapperProps {
  fileName: string;
  fileType: string;
  lfsPointer: LfsPointerInfo;
  hunks: any[];
  isViewed: boolean;
  onToggleViewed: () => void;
  // Content resolution
  previewMode: "image" | "text" | "unsupported";
  // Image preview props (when previewMode === "image")
  oldImageSrc: string | null;
  newImageSrc: string | null;
  imageLoading: boolean;
  imageError: string | null;
  // Text preview props (when previewMode === "text")
  oldTextContent: string | null;
  newTextContent: string | null;
  textLoading: boolean;
  textError: string | null;
  language: string;
  // File status
  status: string;
  // Comments
  comments: Comment[];
  onAddComment: (file: string, startLine: number, endLine: number, side: "old" | "new", text: string) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
}

function LfsPointerDiff({ hunks }: { hunks: any[] }) {
  const lines: string[] = [];
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      const prefix = change.isInsert ? "+" : change.isDelete ? "-" : " ";
      lines.push(`${prefix}${change.content}`);
    }
  }

  return (
    <details className="mt-4">
      <summary className="text-xs text-ctp-subtext cursor-pointer hover:text-ctp-text transition-colors select-none">
        LFS pointer metadata
      </summary>
      <pre className="mt-2 p-3 bg-ctp-base rounded border border-ctp-surface1 text-xs font-mono text-ctp-subtext overflow-x-auto">
        {lines.join("\n")}
      </pre>
    </details>
  );
}

export function LfsFileWrapper({
  fileName,
  fileType,
  lfsPointer,
  hunks,
  isViewed,
  onToggleViewed,
  previewMode,
  oldImageSrc,
  newImageSrc,
  imageLoading,
  imageError,
  oldTextContent,
  newTextContent,
  textLoading,
  textError,
  language,
  status,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
}: LfsFileWrapperProps) {
  const [showAddComment, setShowAddComment] = useState(false);
  const fileComments = comments.filter((c) => c.file === fileName && c.startLine === 0 && c.endLine === 0);

  const statusLabel = fileType === "delete"
    ? "Deleted"
    : fileType === "add"
      ? "Added"
      : fileType === "rename"
        ? "Renamed"
        : "Modified";

  const statusColor = fileType === "delete"
    ? "text-ctp-red"
    : fileType === "add"
      ? "text-ctp-green"
      : fileType === "rename"
        ? "text-ctp-yellow"
        : "text-ctp-blue";

  return (
    <div className="mb-6" data-diff-file={fileName}>
      {/* File header */}
      <div
        className={`sticky top-9 z-10 px-4 py-2 font-medium border-b border-ctp-surface1 flex justify-between items-center transition-colors text-sm ${
          isViewed ? "bg-ctp-surface0/70 text-ctp-subtext backdrop-blur-xl" : "bg-ctp-surface0/85 text-ctp-text backdrop-blur-xl"
        }`}
        onClick={() => {
          if (isViewed) onToggleViewed();
        }}
      >
        <div className="flex items-center gap-3">
          <div>
            <span className={`${statusColor} font-semibold`}>
              {statusLabel}: {fileName}
            </span>
          </div>
          <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-ctp-surface1 text-ctp-subtext rounded">
            LFS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddComment(true);
            }}
            className="px-2 py-0.5 text-xs text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface1 rounded-sm transition-colors"
          >
            Comment
          </button>
          <label
            className="flex items-center gap-2 text-xs uppercase tracking-wide text-ctp-subtext cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isViewed}
              onChange={onToggleViewed}
              className="h-4 w-4 rounded border-ctp-surface1 bg-ctp-mantle text-ctp-blue focus:ring-ctp-blue focus:ring-offset-0"
            />
            Viewed
          </label>
          <span className="text-xs text-ctp-subtext">
            {(lfsPointer.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      {/* Content */}
      {!isViewed && (
        <div className="bg-ctp-mantle border-x border-b border-ctp-surface1 rounded-b p-4">
          {previewMode === "image" && (
            <ImagePreview
              fileName={fileName}
              status={status}
              oldImageSrc={oldImageSrc}
              newImageSrc={newImageSrc}
              loading={imageLoading}
              error={imageError}
            />
          )}

          {previewMode === "text" && (
            <LfsTextPreview
              fileName={fileName}
              status={status}
              oldContent={oldTextContent}
              newContent={newTextContent}
              language={language}
              loading={textLoading}
              error={textError}
            />
          )}

          {previewMode === "unsupported" && (
            <div className="py-8 text-center text-ctp-subtext text-sm">
              Binary LFS file — preview not available
            </div>
          )}

          <LfsPointerDiff hunks={hunks} />

          {/* Whole-file comment form */}
          {showAddComment && (
            <div className="mt-4">
              <AddCommentForm
                file={fileName}
                startLine={0}
                endLine={0}
                side="new"
                onSubmit={(text) => {
                  onAddComment(fileName, 0, 0, "new", text);
                  setShowAddComment(false);
                }}
                onCancel={() => setShowAddComment(false)}
              />
            </div>
          )}

          {/* Whole-file comments */}
          {fileComments.length > 0 && !showAddComment && (
            <div className="mt-4">
              <CommentWidget
                comments={fileComments}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                editingId={editingCommentId}
                onStartEdit={onStartEditComment}
                onStopEdit={onStopEditComment}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
