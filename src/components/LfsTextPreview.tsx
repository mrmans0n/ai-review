const MAX_PREVIEW_LINES = 10_000;
const MAX_PREVIEW_BYTES = 1_000_000;

interface LfsTextPreviewProps {
  fileName: string;
  status: string;
  oldContent: string | null;
  newContent: string | null;
  loading: boolean;
  error: string | null;
}

function truncateContent(content: string): { text: string; truncated: boolean } {
  if (content.length > MAX_PREVIEW_BYTES) {
    return { text: content.slice(0, MAX_PREVIEW_BYTES), truncated: true };
  }
  const lines = content.split("\n");
  if (lines.length <= MAX_PREVIEW_LINES) {
    return { text: content, truncated: false };
  }
  return { text: lines.slice(0, MAX_PREVIEW_LINES).join("\n"), truncated: true };
}

function ContentPane({ title, content, deleted = false }: { title: string; content: string; deleted?: boolean }) {
  const { text, truncated } = truncateContent(content);
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-ctp-subtext">{title}</span>
        {deleted && <span className="text-xs font-medium text-ctp-red">Removed</span>}
      </div>
      <div className={`rounded border overflow-auto max-h-[70vh] ${deleted ? "border-ctp-red/60" : "border-ctp-surface1"}`}>
        <pre className={`text-sm p-4 bg-ctp-base text-ctp-text whitespace-pre-wrap break-words ${deleted ? "opacity-60" : ""}`}>
          <code>{text}</code>
        </pre>
      </div>
      {truncated && (
        <div className="mt-1 text-xs text-ctp-yellow">
          File truncated — showing first {MAX_PREVIEW_LINES.toLocaleString()} lines
        </div>
      )}
    </div>
  );
}

export function LfsTextPreview({ fileName, status, oldContent, newContent, loading, error }: LfsTextPreviewProps) {
  if (loading) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-10 text-center text-ctp-subtext">
        Loading text preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-red/40 p-6">
        <div className="text-ctp-red text-sm font-medium mb-2">Failed to load text preview</div>
        <div className="text-ctp-subtext text-sm">{error}</div>
      </div>
    );
  }

  if (status === "added" && newContent) {
    return <ContentPane title={fileName} content={newContent} />;
  }

  if (status === "deleted" && oldContent) {
    return <ContentPane title={fileName} content={oldContent} deleted />;
  }

  if (oldContent && newContent) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ContentPane title="Old" content={oldContent} />
          <ContentPane title="New" content={newContent} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-8 text-center text-ctp-subtext">
      No text preview available
    </div>
  );
}
