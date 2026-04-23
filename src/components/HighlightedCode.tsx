import { hljs } from "../highlight";

interface HighlightedCodeProps {
  className?: string;
  children?: React.ReactNode;
}

export function HighlightedCode({ className, children }: HighlightedCodeProps) {
  const text = extractText(children);
  const language = extractLanguage(className);

  if (!language || !hljs.getLanguage(language)) {
    return <code className={className}>{children}</code>;
  }

  const highlighted = hljs.highlight(text, { language, ignoreIllegals: true });

  return (
    <code
      className={className}
      dangerouslySetInnerHTML={{ __html: highlighted.value }}
    />
  );
}

function extractLanguage(className?: string): string | undefined {
  if (!className) return undefined;
  const match = className.match(/language-(\w+)/);
  return match?.[1];
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as any).props.children);
  }
  return String(children ?? "");
}
