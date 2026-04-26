import type { Comment, ChangedFileRailItem } from "../types";
import { FileList } from "./FileList";
import { RailComments } from "./RailComments";

interface RightRailProps {
  files: ChangedFileRailItem[];
  comments: Comment[];
  width: number;
  visible: boolean;
  resizing: boolean;
  viewedCount: number;
  renderableFilesCount: number;
  activeFile?: string;
  onStartResize: () => void;
  onScrollToFile: (path: string) => void;
  onPreviewFile: (path: string) => void;
  onGoToComment: (comment: Comment) => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
  onOpenCommentOverview: () => void;
}

export function RightRail({
  files,
  comments,
  width,
  visible,
  resizing,
  viewedCount,
  renderableFilesCount,
  activeFile,
  onStartResize,
  onScrollToFile,
  onPreviewFile,
  onGoToComment,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
  onOpenCommentOverview,
}: RightRailProps) {
  if (!visible) return null;

  return (
    <aside
      className={`relative flex flex-col border-l border-ctp-surface1 bg-ctp-mantle ${
        resizing ? "select-none" : ""
      }`}
      style={{ width: `${width}px` }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize review rail"
        onMouseDown={(event) => {
          event.preventDefault();
          onStartResize();
        }}
        className="absolute left-0 top-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-ctp-peach/30 transition-colors"
      />

      <section className="flex min-h-0 flex-[3] flex-col border-b border-ctp-surface1">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ctp-surface1">
          <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full flex-shrink-0" />
          <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
            Changed Files
          </span>
          {renderableFilesCount > 0 && (
            <span className="ml-auto text-[10px] text-ctp-overlay0">
              {viewedCount}/{renderableFilesCount} viewed
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <FileList
            files={files}
            selectedFile={activeFile}
            onSelectFile={onScrollToFile}
            onPreviewFile={onPreviewFile}
          />
        </div>
      </section>

      <section className="flex min-h-0 flex-[2] flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ctp-surface1">
          <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full flex-shrink-0" />
          <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
            Comments
          </span>
          {comments.length > 0 && (
            <span className="ml-auto text-[10px] text-ctp-overlay0">
              {comments.length}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <RailComments
            comments={comments}
            onGoToComment={onGoToComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            editingCommentId={editingCommentId}
            onStartEditComment={onStartEditComment}
            onStopEditComment={onStopEditComment}
            onOpenOverview={comments.length > 0 ? onOpenCommentOverview : undefined}
          />
        </div>
      </section>
    </aside>
  );
}
