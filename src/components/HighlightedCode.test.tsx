import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HighlightedCode } from "./HighlightedCode";

describe("HighlightedCode", () => {
  it("highlights code when a registered language class is present", () => {
    const { container } = render(
      <HighlightedCode className="language-typescript">
        {"const x: number = 1;"}
      </HighlightedCode>
    );
    const code = container.querySelector("code")!;
    // hljs wraps tokens in <span class="hljs-*"> elements
    expect(code.innerHTML).toContain("hljs-");
    expect(code.className).toBe("language-typescript");
  });

  it("falls back to plain rendering for unrecognized languages", () => {
    const { container } = render(
      <HighlightedCode className="language-brainfuck">
        {"++++++[>++++++<-]>."}
      </HighlightedCode>
    );
    const code = container.querySelector("code")!;
    // No hljs spans — children rendered as-is
    expect(code.innerHTML).not.toContain("hljs-");
    expect(code.textContent).toBe("++++++[>++++++<-]>.");
  });

  it("falls back to plain rendering when no className is provided (inline code)", () => {
    const { container } = render(
      <HighlightedCode>{"hello world"}</HighlightedCode>
    );
    const code = container.querySelector("code")!;
    expect(code.innerHTML).not.toContain("hljs-");
    expect(code.textContent).toBe("hello world");
  });

  it("extracts text from nested React children", () => {
    const { container } = render(
      <HighlightedCode className="language-json">
        <span>{'{ "key": 42 }'}</span>
      </HighlightedCode>
    );
    const code = container.querySelector("code")!;
    // JSON highlighting should produce hljs spans
    expect(code.innerHTML).toContain("hljs-");
  });
});
