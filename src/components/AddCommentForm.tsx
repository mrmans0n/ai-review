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
  const langTag = prefilledCode && language && language !== "plaintext" ? language : "";
  const initialText = prefilledCode
    ? `\`\`\`${langTag}\n${prefilledCode}\n\`\`\`\n\n`
    : "";
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      className="bg-blue-900 bg-opacity-30 border-l-4 border-blue-500 p-3 my-2"
    >
      <div className="text-xs text-gray-400 mb-2">
        Adding comment on {file} lines {startLine}
        {endLine !== startLine && `-${endLine}`} ({side} side)
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your comment... (Ctrl+Enter to submit, Esc to cancel)"
        className="w-full bg-gray-800 text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={4}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Comment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
