import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkSourceLines from "./remarkSourceLines";
import type { SourceBlock } from "./remarkSourceLines";

function processMarkdown(md: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkSourceLines)
    .use(remarkRehype)
    .use(rehypeStringify);

  const file = processor.processSync(md);
  const html = String(file);
  const sourceMap = file.data.sourceMap as SourceBlock[];
  return { html, sourceMap };
}

describe("remarkSourceLines", () => {
  it("adds source lines to a simple heading", () => {
    const { html, sourceMap } = processMarkdown("# Hello");
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="1"');
    expect(sourceMap).toContainEqual({
      startLine: 1,
      endLine: 1,
      nodeType: "heading",
    });
  });

  it("adds source lines to a multi-line paragraph", () => {
    const md = "This is a\nmulti-line paragraph.";
    const { html, sourceMap } = processMarkdown(md);
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="2"');
    expect(sourceMap).toContainEqual({
      startLine: 1,
      endLine: 2,
      nodeType: "paragraph",
    });
  });

  it("adds source lines to a fenced code block", () => {
    const md = "```js\nconst x = 1;\nconst y = 2;\n```";
    const { html, sourceMap } = processMarkdown(md);
    expect(html).toContain('data-source-start="1"');
    expect(html).toContain('data-source-end="4"');
    expect(sourceMap).toContainEqual({
      startLine: 1,
      endLine: 4,
      nodeType: "code",
    });
  });

  it("adds source lines to list items", () => {
    const md = "- item one\n- item two\n- item three";
    const { sourceMap } = processMarkdown(md);
    const listItems = sourceMap.filter((b) => b.nodeType === "listItem");
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toEqual({ startLine: 1, endLine: 1, nodeType: "listItem" });
    expect(listItems[1]).toEqual({ startLine: 2, endLine: 2, nodeType: "listItem" });
    expect(listItems[2]).toEqual({ startLine: 3, endLine: 3, nodeType: "listItem" });
  });

  it("handles an empty document without crashing", () => {
    const { html, sourceMap } = processMarkdown("");
    expect(html).toBe("");
    expect(sourceMap).toEqual([]);
  });

  it("produces a sourceMap for multiple block types", () => {
    const md = "# Title\n\nA paragraph.\n\n> A blockquote.";
    const { sourceMap } = processMarkdown(md);
    const types = sourceMap.map((b) => b.nodeType);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("blockquote");
  });

  it("injects data-source-type attribute matching the node type", () => {
    const { html } = processMarkdown("# Hello");
    expect(html).toContain('data-source-type="heading"');
  });

  it("injects data-source-type for paragraphs", () => {
    const { html } = processMarkdown("A paragraph.");
    expect(html).toContain('data-source-type="paragraph"');
  });

  it("injects data-source-type for code blocks", () => {
    const { html } = processMarkdown("```js\nconst x = 1;\n```");
    expect(html).toContain('data-source-type="code"');
  });

  it("injects data-source-type for all BLOCK_TYPES including nested", () => {
    const md = "# Heading\n\nParagraph\n\n- item\n\n> quote\n\n```\ncode\n```";
    const { html } = processMarkdown(md);
    expect(html).toContain('data-source-type="heading"');
    expect(html).toContain('data-source-type="paragraph"');
    expect(html).toContain('data-source-type="list"');
    expect(html).toContain('data-source-type="listItem"');
    expect(html).toContain('data-source-type="blockquote"');
    expect(html).toContain('data-source-type="code"');
  });

  // GFM tests
  describe("GFM extensions", () => {
    function processGfm(md: string) {
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkSourceLines)
        .use(remarkRehype)
        .use(rehypeStringify);
      const file = processor.processSync(md);
      return {
        html: String(file),
        sourceMap: file.data.sourceMap as SourceBlock[],
      };
    }

    it("adds source lines to GFM tables", () => {
      const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
      const { html, sourceMap } = processGfm(md);
      expect(html).toContain("<table");
      const table = sourceMap.find((b) => b.nodeType === "table");
      expect(table?.startLine).toBe(1);
      expect(table?.endLine).toBe(3);
    });

    it("adds source lines to GFM task list items", () => {
      const md = "- [x] done\n- [ ] todo";
      const { sourceMap } = processGfm(md);
      const listItems = sourceMap.filter((b) => b.nodeType === "listItem");
      expect(listItems).toHaveLength(2);
      expect(listItems[0].startLine).toBe(1);
      expect(listItems[1].startLine).toBe(2);
    });

    it("injects data-source-type for GFM tables", () => {
      const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
      const { html } = processGfm(md);
      expect(html).toContain('data-source-type="table"');
      expect(html).toContain('data-source-type="tableRow"');
      // tableCell is not in BLOCK_TYPES — only block-level nodes are annotated
      expect(html).not.toContain('data-source-type="tableCell"');
    });

    it("does not annotate inline GFM strikethrough (block-level only)", () => {
      const md = "~~deleted text~~";
      const { html, sourceMap } = processGfm(md);
      expect(html).toContain("<del");
      // strikethrough is inline — should not be in sourceMap
      const del = sourceMap.find((b) => b.nodeType === "delete");
      expect(del).toBeUndefined();
      // but the containing paragraph should be annotated
      const para = sourceMap.find((b) => b.nodeType === "paragraph");
      expect(para?.startLine).toBe(1);
    });
  });
});
