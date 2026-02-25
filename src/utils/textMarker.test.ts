import { describe, expect, it } from "vitest";
import { clearMarks, markText } from "./textMarker";

describe("textMarker", () => {
  it("marks text that spans multiple text nodes", () => {
    document.body.innerHTML = `
      <div id="container">
        <span>val</span><span>ue</span> and value
      </div>
    `;

    const container = document.getElementById("container") as HTMLElement;
    const marks = markText(container, "value", "search-match");

    expect(marks).toHaveLength(2);
    expect(container.querySelectorAll("mark.search-match")).toHaveLength(2);
    expect(container.textContent).toContain("value and value");
  });

  it("clears marks and restores plain text", () => {
    document.body.innerHTML = `
      <div id="container">
        <span>val</span><span>ue</span> and value
      </div>
    `;

    const container = document.getElementById("container") as HTMLElement;
    markText(container, "value", "search-match");

    clearMarks(container, "search-match");

    expect(container.querySelectorAll("mark.search-match")).toHaveLength(0);
    expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe("value and value");
  });
});
