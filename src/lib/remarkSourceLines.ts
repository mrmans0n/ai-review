import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root } from "mdast";
import type { Node } from "unist";

export interface SourceBlock {
  startLine: number;
  endLine: number;
  nodeType: string;
}

/**
 * Remark plugin that injects `data-source-start` and `data-source-end`
 * attributes onto every block-level node that has position information.
 * Also collects a `sourceMap` array on `vfile.data` for programmatic access.
 */
const remarkSourceLines: Plugin<[], Root> = function () {
  return (tree: Root, file: import("vfile").VFile) => {
    const sourceMap: SourceBlock[] = [];

    visit(tree, (node: Node) => {
      if (node.type === "root" || !node.position) return;

      const startLine = node.position.start.line;
      const endLine = node.position.end.line;

      const data = ((node as any).data || ((node as any).data = {})) as Record<string, unknown>;
      const hProperties = (data.hProperties || (data.hProperties = {})) as Record<string, unknown>;
      hProperties["data-source-start"] = startLine;
      hProperties["data-source-end"] = endLine;

      sourceMap.push({
        startLine,
        endLine,
        nodeType: node.type,
      });
    });

    file.data.sourceMap = sourceMap;
  };
};

export default remarkSourceLines;
