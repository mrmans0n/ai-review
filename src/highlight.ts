import { tokenize, markEdits } from "react-diff-view";
import hljs from "highlight.js/lib/core";

// Import only the languages we need
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import kotlin from "highlight.js/lib/languages/kotlin";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import ruby from "highlight.js/lib/languages/ruby";
import php from "highlight.js/lib/languages/php";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";

// Register languages
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("php", php);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("yaml", yaml);

interface HighlightOptions {
  language?: string;
  enhance?: boolean;
}

export function highlight(hunks: any[], options: HighlightOptions = {}) {
  const { language = "plaintext", enhance = true } = options;

  if (!language || language === "plaintext") {
    return undefined;
  }

  try {
    const highlighter = (code: string) => {
      try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } catch {
        return code;
      }
    };

    const tokens = tokenize(hunks, {
      highlight: true,
      enhancers: enhance ? [markEdits(hunks, { type: "block" })] : [],
      language,
      refractor: { highlight: highlighter } as any,
    });

    return tokens;
  } catch (error) {
    console.error("Syntax highlighting failed:", error);
    return undefined;
  }
}
