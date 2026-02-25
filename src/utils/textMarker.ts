const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const shouldSkipNode = (node: Node): boolean => {
  const parent = node.parentElement;
  if (!parent) return false;
  return ["SCRIPT", "STYLE", "MARK"].includes(parent.tagName);
};

export function clearMarks(container: HTMLElement, className: string): void {
  const marks = container.querySelectorAll(`mark.${className}`);

  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
    parent.normalize();
  });
}

type MarkTextOptions = {
  caseSensitive?: boolean;
  wholeWord?: boolean;
};

type TextNodeSegment = {
  node: Text;
  start: number;
  end: number;
};

const findBoundaryPoint = (
  segments: TextNodeSegment[],
  position: number,
): { node: Text; offset: number } | null => {
  for (const segment of segments) {
    if (position >= segment.start && position <= segment.end) {
      return {
        node: segment.node,
        offset: position - segment.start,
      };
    }
  }

  return null;
};

export function markText(
  container: HTMLElement,
  text: string,
  className: string,
  options: MarkTextOptions = {},
): HTMLElement[] {
  if (!text.trim()) return [];

  const escapedText = escapeRegExp(text.trim());
  const pattern = options.wholeWord ? `\\b${escapedText}\\b` : escapedText;
  const flags = options.caseSensitive ? "g" : "gi";
  const matcher = new RegExp(pattern, flags);
  const marks: HTMLElement[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent || shouldSkipNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const segments: TextNodeSegment[] = [];
  let fullText = "";

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const value = textNode.textContent || "";

    segments.push({
      node: textNode,
      start: fullText.length,
      end: fullText.length + value.length,
    });

    fullText += value;
    currentNode = walker.nextNode();
  }

  if (!fullText) return [];

  const matches: Array<{ start: number; end: number }> = [];
  let match = matcher.exec(fullText);

  while (match) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    });

    if (match[0].length === 0) {
      matcher.lastIndex += 1;
    }

    match = matcher.exec(fullText);
  }

  if (matches.length === 0) return [];

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const currentMatch = matches[index];
    const startPoint = findBoundaryPoint(segments, currentMatch.start);
    const endPoint = findBoundaryPoint(segments, currentMatch.end);

    if (!startPoint || !endPoint) continue;

    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);

    const contents = range.extractContents();
    const mark = document.createElement("mark");
    mark.className = className;
    mark.appendChild(contents);
    range.insertNode(mark);

    marks.unshift(mark);
    range.detach();
  }

  return marks;
}
