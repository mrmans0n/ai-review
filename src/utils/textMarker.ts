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

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const value = textNode.textContent || "";
    matcher.lastIndex = 0;

    const matches: Array<{ start: number; end: number }> = [];
    let match = matcher.exec(value);
    while (match) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      match = matcher.exec(value);
    }

    if (matches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    matches.forEach(({ start, end }) => {
      if (start > cursor) {
        fragment.appendChild(document.createTextNode(value.slice(cursor, start)));
      }

      const mark = document.createElement("mark");
      mark.className = className;
      mark.textContent = value.slice(start, end);
      fragment.appendChild(mark);
      marks.push(mark);

      cursor = end;
    });

    if (cursor < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(cursor)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return marks;
}
