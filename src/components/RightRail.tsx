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
  jsonOutput: boolean;
  cliInstalled: boolean | null;
  cliJustInstalled: boolean;
  installMessage: string | null;
  onStartResize: () => void;
  onPreviewPrompt: () => void;
  onGeneratePrompt: () => void;
  onInstallCli: () => void;
  onScrollToFile: (path: string) => void;
  onPreviewFile: (path: string) => void;
  onGoToComment: (comment: Comment) => void;
  onOpenCommentOverview: () => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
  editingCommentId: string | null;
  onStartEditComment: (id: string) => void;
  onStopEditComment: () => void;
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
  jsonOutput,
  cliInstalled,
  cliJustInstalled,
  installMessage,
  onStartResize,
  onPreviewPrompt,
  onGeneratePrompt,
  onInstallCli,
  onScrollToFile,
  onPreviewFile,
  onGoToComment,
  onOpenCommentOverview,
  onEditComment,
  onDeleteComment,
  editingCommentId,
  onStartEditComment,
  onStopEditComment,
}: RightRailProps) {
  if (!visible) return null;

  return (
    <aside
      className={`relative flex flex-col border-l border-ctp-surface1 bg-ctp-mantle pt-9 ${
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
        {(comments.length > 0 || cliInstalled === false || cliJustInstalled) && (
          <div className="border-b border-ctp-surface1 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ctp-overlay0">
              Review
            </div>
            <div className="space-y-1">
              {comments.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onOpenCommentOverview}
                    className="w-full rounded-sm border border-ctp-surface1 px-2 py-1.5 text-left text-xs text-ink-secondary transition-colors hover:bg-ctp-surface0 hover:text-ink-primary"
                  >
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                  </button>
                  {jsonOutput && (
                    <button
                      type="button"
                      onClick={onPreviewPrompt}
                      className="w-full rounded-sm border border-ctp-surface1 px-2 py-1.5 text-left text-xs text-ink-secondary transition-colors hover:bg-ctp-surface0 hover:text-ink-primary"
                    >
                      Preview prompt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onGeneratePrompt}
                    className="w-full rounded-sm border border-accent-review bg-surface-hover px-2 py-1.5 text-left text-xs font-medium text-ink-primary transition-colors hover:bg-ctp-surface0"
                  >
                    {jsonOutput ? "Publish comments" : "Generate prompt"}
                  </button>
                </>
              )}
              {(cliInstalled === false || cliJustInstalled) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={onInstallCli}
                    disabled={cliJustInstalled}
                    className="w-full rounded-sm border border-ctp-surface1 px-2 py-1.5 text-left text-xs text-ink-secondary transition-colors hover:bg-ctp-surface0 hover:text-ink-primary disabled:cursor-not-allowed disabled:border-accent-review disabled:text-ink-primary"
                  >
                    {cliJustInstalled ? "CLI installed" : "Install CLI"}
                  </button>
                  {installMessage && (
                    <div className="absolute right-0 top-full z-50 mt-2 max-w-md whitespace-pre-wrap rounded-sm border border-divider bg-surface px-4 py-2 text-sm text-ink-primary shadow-lg">
                      {installMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
            onOpenOverview={comments.length > 0 ? onOpenCommentOverview : undefined}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            editingCommentId={editingCommentId}
            onStartEditComment={onStartEditComment}
            onStopEditComment={onStopEditComment}
          />
        </div>
      </section>
    </aside>
  );
}
