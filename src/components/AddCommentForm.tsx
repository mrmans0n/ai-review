import { useState, useEffect, useRef } from "react";

interface AddCommentFormProps {
  file: string;
  startLine: number;
  endLine: number;
  side: "old" | "new";
  onSubmit: (text: string) => void;
  onCancel: () => void;
  prefilledCode?: string;
  language?: string;
}

export function AddCommentForm({
  file,
  startLine,
  endLine,
  side,
  onSubmit,
  onCancel,
  prefilledCode,
  language,
}: AddCommentFormProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertCode = () => {
    if (!prefilledCode) return;
    const langTag = language && language !== "plaintext" ? language : "";
    const codeBlock = `\`\`\`${langTag}\n${prefilledCode}\n\`\`\`\n\n`;
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + codeBlock);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = text.slice(0, start) + codeBlock + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + codeBlock.length;
      el.focus();
    }, 0);
  };

  useEffect(() => {
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }, 50);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-l-2 border-ctp-mauve bg-ctp-surface0 p-3"
    >
      <div className="text-xs text-ctp-subtext mb-2">
        Adding comment on {file} lines {startLine}
        {endLine !== startLine && `-${endLine}`} ({side} side)
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your comment... (Ctrl+Enter to submit, Esc to cancel)"
        className="w-full bg-ctp-mantle border border-ctp-surface1 rounded-sm text-ctp-text text-sm p-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none focus:ring-1 focus:ring-ctp-mauve/30 resize-none"
        rows={4}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3 py-1.5 bg-ctp-mauve text-ctp-base text-sm rounded-sm hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Comment
        </button>
        {prefilledCode && !text.includes("```") && (
          <button
            type="button"
            onClick={insertCode}
            className="px-3 py-1.5 text-ctp-subtext text-sm rounded-sm hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
          >
            Insert code
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-ctp-subtext text-sm rounded-sm hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
