import hljs from "highlight.js/lib/core";

interface LfsTextPreviewProps {
  fileName: string;
  status: string;
  oldContent: string | null;
  newContent: string | null;
  language: string;
  loading: boolean;
  error: string | null;
}

const MAX_LINES = 10_000;

function highlightContent(content: string, language: string): string {
  if (!language || language === "plaintext") return escapeHtml(content);
  try {
    return hljs.highlight(content, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(content);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncateContent(content: string): { text: string; truncated: boolean } {
  const lines = content.split("\n");
  if (lines.length <= MAX_LINES) return { text: content, truncated: false };
  return { text: lines.slice(0, MAX_LINES).join("\n"), truncated: true };
}

function ContentPane({
  title,
  content,
  language,
  dimmed = false,
}: {
  title: string;
  content: string;
  language: string;
  dimmed?: boolean;
}) {
  const { text, truncated } = truncateContent(content);
  const highlighted = highlightContent(text, language);

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2">
        <span className="text-xs uppercase tracking-wider text-ctp-subtext">{title}</span>
      </div>
      <div className={`rounded border overflow-auto max-h-[70vh] bg-ctp-base ${dimmed ? "border-ctp-red/60 opacity-60" : "border-ctp-surface1"}`}>
        <pre className="p-4 text-sm leading-relaxed">
          <code
            className="hljs font-mono text-[13px] text-ctp-text whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
      {truncated && (
        <div className="mt-1 text-xs text-ctp-subtext">
          Content truncated at {MAX_LINES.toLocaleString()} lines
        </div>
      )}
    </div>
  );
}

export function LfsTextPreview({
  fileName,
  status,
  oldContent,
  newContent,
  language,
  loading,
  error,
}: LfsTextPreviewProps) {
  if (loading) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-10 text-center text-ctp-subtext">
        Loading LFS content preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-red/40 p-6">
        <div className="text-ctp-red text-sm font-medium mb-2">Failed to load LFS content</div>
        <div className="text-ctp-subtext text-sm">{error}</div>
      </div>
    );
  }

  if (status === "added" && newContent != null) {
    return <ContentPane title={fileName} content={newContent} language={language} />;
  }

  if (status === "deleted" && oldContent != null) {
    return <ContentPane title={fileName} content={oldContent} language={language} dimmed />;
  }

  if (oldContent != null && newContent != null) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ContentPane title="Old" content={oldContent} language={language} />
          <ContentPane title="New" content={newContent} language={language} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-8 text-center text-ctp-subtext">
      No LFS content preview available
    </div>
  );
}
