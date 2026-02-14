import { describe, it, expect } from "vitest";
import { resolveLineFromNode } from "./resolveLineFromNode";

function makeElement(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

describe("resolveLineFromNode", () => {
  describe("diff view path", () => {
    it("resolves from a td with data-change-key inside data-diff-file", () => {
      const wrapper = makeElement("div", { "data-diff-file": "src/app.ts" });
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = makeElement("td", { "data-change-key": "N42" });
      tr.appendChild(td);
      table.appendChild(tr);
      wrapper.appendChild(table);

      expect(resolveLineFromNode(td)).toEqual({
        file: "src/app.ts",
        line: 42,
        side: "new",
      });
    });

    it("resolves delete changes to old side", () => {
      const wrapper = makeElement("div", { "data-diff-file": "file.ts" });
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = makeElement("td", { "data-change-key": "D10" });
      tr.appendChild(td);
      table.appendChild(tr);
      wrapper.appendChild(table);

      expect(resolveLineFromNode(td)).toEqual({
        file: "file.ts",
        line: 10,
        side: "old",
      });
    });

    it("resolves insert changes to new side", () => {
      const wrapper = makeElement("div", { "data-diff-file": "file.ts" });
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = makeElement("td", { "data-change-key": "I5" });
      tr.appendChild(td);
      table.appendChild(tr);
      wrapper.appendChild(table);

      expect(resolveLineFromNode(td)).toEqual({
        file: "file.ts",
        line: 5,
        side: "new",
      });
    });

    it("walks up from a child element inside a td", () => {
      const wrapper = makeElement("div", { "data-diff-file": "src/app.ts" });
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = makeElement("td", { "data-change-key": "N7" });
      const span = document.createElement("span");
      td.appendChild(span);
      tr.appendChild(td);
      table.appendChild(tr);
      wrapper.appendChild(table);

      expect(resolveLineFromNode(span)).toEqual({
        file: "src/app.ts",
        line: 7,
        side: "new",
      });
    });

    it("walks up from a text node", () => {
      const wrapper = makeElement("div", { "data-diff-file": "src/app.ts" });
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = makeElement("td", { "data-change-key": "N3" });
      const text = document.createTextNode("hello");
      td.appendChild(text);
      tr.appendChild(td);
      table.appendChild(tr);
      wrapper.appendChild(table);

      expect(resolveLineFromNode(text)).toEqual({
        file: "src/app.ts",
        line: 3,
        side: "new",
      });
    });
  });

  describe("FileViewer path", () => {
    it("resolves from a div with data-line-number inside data-file-viewer", () => {
      const wrapper = makeElement("div", { "data-file-viewer": "src/main.ts" });
      const lineDiv = makeElement("div", {
        "data-line-number": "42",
        "data-line-side": "new",
      });
      wrapper.appendChild(lineDiv);

      expect(resolveLineFromNode(lineDiv)).toEqual({
        file: "src/main.ts",
        line: 42,
        side: "new",
      });
    });

    it("walks up from a child element", () => {
      const wrapper = makeElement("div", { "data-file-viewer": "src/main.ts" });
      const lineDiv = makeElement("div", {
        "data-line-number": "15",
        "data-line-side": "new",
      });
      const code = document.createElement("code");
      lineDiv.appendChild(code);
      wrapper.appendChild(lineDiv);

      expect(resolveLineFromNode(code)).toEqual({
        file: "src/main.ts",
        line: 15,
        side: "new",
      });
    });

    it("walks up from a text node", () => {
      const wrapper = makeElement("div", { "data-file-viewer": "src/main.ts" });
      const lineDiv = makeElement("div", {
        "data-line-number": "8",
        "data-line-side": "new",
      });
      const text = document.createTextNode("code here");
      lineDiv.appendChild(text);
      wrapper.appendChild(lineDiv);

      expect(resolveLineFromNode(text)).toEqual({
        file: "src/main.ts",
        line: 8,
        side: "new",
      });
    });

    it("defaults side to new when data-line-side is missing", () => {
      const wrapper = makeElement("div", { "data-file-viewer": "file.ts" });
      const lineDiv = makeElement("div", { "data-line-number": "1" });
      wrapper.appendChild(lineDiv);

      expect(resolveLineFromNode(lineDiv)).toEqual({
        file: "file.ts",
        line: 1,
        side: "new",
      });
    });
  });

  describe("edge cases", () => {
    it("returns null for null input", () => {
      expect(resolveLineFromNode(null)).toBeNull();
    });

    it("returns null for an orphan element with no data attributes", () => {
      const div = document.createElement("div");
      expect(resolveLineFromNode(div)).toBeNull();
    });

    it("returns null for a td without data-change-key", () => {
      const table = document.createElement("table");
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      tr.appendChild(td);
      table.appendChild(tr);

      expect(resolveLineFromNode(td)).toBeNull();
    });
  });
});
