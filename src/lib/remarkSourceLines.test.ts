import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkSourceLines from "./remarkSourceLines";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "dataSourceStart", "dataSourceEnd"],
  },
};

function processMarkdown(md: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkSourceLines)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .processSync(md);
  return String(result);
}

function processToHast(md: string): any {
  const processor = unified()
    .use(remarkParse)
    .use(remarkSourceLines)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema);
  return processor.runSync(processor.parse(md));
}

describe("remarkSourceLines", () => {
  it("adds data-source-start and data-source-end to a paragraph", () => {
    const html = processMarkdown("Hello world");
    expect(html).toContain("data-source-start");
    expect(html).toContain("data-source-end");
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="1"');
  });

  it("adds correct line numbers to headings", () => {
    const md = `# Heading One

## Heading Two`;
    const html = processMarkdown(md);
    expect(html).toContain('<h1 data-source-start="1" data-source-end="1"');
    expect(html).toContain('<h2 data-source-start="3" data-source-end="3"');
  });

  it("handles multi-line paragraphs", () => {
    const md = `First line
second line
third line`;
    const html = processMarkdown(md);
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="3"');
  });

  it("annotates fenced code blocks", () => {
    const md = `Some text

\`\`\`javascript
const x = 1;
const y = 2;
\`\`\``;
    const html = processMarkdown(md);
    expect(html).toContain("<pre");
    expect(html).toContain('data-source-start="3"');
    expect(html).toContain('data-source-end="6"');
  });

  it("annotates list items", () => {
    const md = `- item one
- item two
- item three`;
    const html = processMarkdown(md);
    expect(html).toContain("<ul");
    expect(html).toContain('data-source-start="1"');
  });

  it("annotates blockquotes", () => {
    const md = `> This is a quote
> spanning two lines`;
    const html = processMarkdown(md);
    expect(html).toContain("<blockquote");
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="2"');
  });

  it("annotates multiple blocks with correct positions", () => {
    const md = `# Title

Some paragraph.

- list item`;
    const hast = processToHast(md);
    const elements = hast.children.filter((n: any) => n.type === "element");
    // h1, p, ul
    expect(elements.length).toBe(3);
    expect(elements[0].properties.dataSourceStart).toBe(1);
    expect(elements[1].properties.dataSourceStart).toBe(3);
    expect(elements[2].properties.dataSourceStart).toBe(5);
  });

  it("handles empty input without errors", () => {
    const html = processMarkdown("");
    expect(html).toBe("");
  });
});

function processGfmMarkdown(md: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSourceLines)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .processSync(md);
  return String(result);
}

function processGfmToHast(md: string): any {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSourceLines)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema);
  return processor.runSync(processor.parse(md));
}

describe("remarkSourceLines with GFM", () => {
  it("annotates GFM tables", () => {
    const md = `| Col A | Col B |
| ----- | ----- |
| val 1 | val 2 |
| val 3 | val 4 |`;
    const html = processGfmMarkdown(md);
    expect(html).toContain("<table");
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="4"');
  });

  it("annotates task list items", () => {
    const md = `- [ ] unchecked
- [x] checked
- [ ] another`;
    const html = processGfmMarkdown(md);
    expect(html).toContain("<ul");
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="3"');
  });

  it("annotates strikethrough text within a paragraph", () => {
    const md = `Some ~~deleted~~ text`;
    const hast = processGfmToHast(md);
    const p = hast.children.find((n: any) => n.type === "element" && n.tagName === "p");
    expect(p).toBeDefined();
    expect(p.properties.dataSourceStart).toBe(1);
    expect(p.properties.dataSourceEnd).toBe(1);
  });
});
