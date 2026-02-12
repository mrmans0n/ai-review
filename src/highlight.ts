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
    // Create a refractor-like object that returns tokens instead of HTML
    const refractor = {
      highlight: (code: string, lang: string) => {
        try {
          const result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
          // Convert highlight.js tokens to refractor-like token structure
          return convertHljsToTokens(result);
        } catch {
          return [{ type: "text", value: code }];
        }
      },
    };

    const tokens = tokenize(hunks, {
      highlight: true,
      enhancers: enhance ? [markEdits(hunks, { type: "block" })] : [],
      language,
      refractor: refractor as any,
    });

    return tokens;
  } catch (error) {
    console.error("Syntax highlighting failed:", error);
    return undefined;
  }
}

// Convert highlight.js result to token structure compatible with react-diff-view
function convertHljsToTokens(result: any): any[] {
  const tokens: any[] = [];
  const parseNode = (node: any) => {
    if (typeof node === "string") {
      return { type: "text", value: node };
    }
    if (node.children) {
      const children = node.children.flatMap((child: any) => parseNode(child));
      return {
        type: "element",
        tagName: "span",
        properties: { className: [`hljs-${node.scope}`] },
        children,
      };
    }
    return { type: "text", value: node.value || "" };
  };

  if (result._emitter && result._emitter.rootNode) {
    result._emitter.rootNode.children.forEach((child: any) => {
      tokens.push(parseNode(child));
    });
  } else {
    // Fallback: parse the highlighted HTML
    tokens.push({ type: "text", value: result.value });
  }

  return tokens;
}
