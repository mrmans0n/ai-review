import { useMemo } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeReact from "rehype-react";
import * as runtime from "react/jsx-runtime";
import remarkSourceLines from "../lib/remarkSourceLines";
import { HighlightedCode } from "../components/HighlightedCode";
import type { SourceBlock } from "../lib/remarkSourceLines";
import type { ReactElement } from "react";

// Allow data-source-* attributes through the sanitizer
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "data-source-start",
      "data-source-end",
      "data-source-type",
    ],
    code: [...(defaultSchema.attributes?.["code"] || []), "className"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml", "toml"])
  .use(remarkSourceLines)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeReact, { ...runtime, components: { code: HighlightedCode } } as any);

export function useMarkdownRenderer(markdown: string): {
  content: ReactElement;
  sourceMap: SourceBlock[];
} {
  return useMemo(() => {
    const file = processor.processSync(markdown);
    const content = file.result as ReactElement;
    const sourceMap = (file.data.sourceMap as SourceBlock[]) || [];
    return { content, sourceMap };
  }, [markdown]);
}
