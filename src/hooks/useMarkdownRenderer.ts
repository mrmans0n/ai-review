import { useMemo } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeReact from "rehype-react";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import remarkSourceLines from "../lib/remarkSourceLines";
import type { ReactElement } from "react";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "dataSourceStart",
      "dataSourceEnd",
    ],
  },
};

interface RenderedMarkdown {
  content: ReactElement | null;
}

export function useMarkdownRenderer(markdown: string): RenderedMarkdown {
  const content = useMemo(() => {
    if (!markdown) return null;

    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .use(remarkSourceLines)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeReact, { jsx, jsxs, Fragment });

    const result = processor.processSync(markdown);
    return result.result as ReactElement;
  }, [markdown]);

  return { content };
}
