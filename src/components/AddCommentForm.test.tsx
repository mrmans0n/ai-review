import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddCommentForm } from "./AddCommentForm";

function makeProps(overrides: Partial<Parameters<typeof AddCommentForm>[0]> = {}) {
  return {
    file: "src/app.ts",
    startLine: 1,
    endLine: 1,
    side: "new" as const,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("AddCommentForm", () => {
  it("textarea starts empty when no prefilledCode", () => {
    render(<AddCommentForm {...makeProps()} />);
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("textarea starts with fenced block when prefilledCode and language are provided", () => {
    render(
      <AddCommentForm
        {...makeProps({ prefilledCode: "const x = 1;", language: "typescript" })}
      />
    );
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toContain("```typescript\n");
    expect(textarea.value).toContain("const x = 1;");
    expect(textarea.value).toContain("\n```");
  });

  it("uses plain fence (no language tag) when language is 'plaintext'", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "some code", language: "plaintext" })} />
    );
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/^```\n/);
  });

  it("uses plain fence when language is omitted", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "some code" })} />
    );
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/^```\n/);
  });
});
