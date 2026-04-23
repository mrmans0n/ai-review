import { visit } from "unist-util-visit";

/**
 * Remark plugin that copies source position data into hProperties
 * so they survive the remark-rehype transform and appear as
 * data-source-start / data-source-end attributes on the resulting DOM nodes.
 */
const remarkSourceLines = () => {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (!node.position) return;
      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};
      node.data.hProperties.dataSourceStart = node.position.start.line;
      node.data.hProperties.dataSourceEnd = node.position.end.line;
    });
  };
};

export default remarkSourceLines;
