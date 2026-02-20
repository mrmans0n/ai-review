import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("textarea starts empty even when prefilledCode is provided", () => {
    render(
      <AddCommentForm
        {...makeProps({ prefilledCode: "const x = 1;", language: "typescript" })}
      />
    );
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("shows Insert code button when prefilledCode is provided", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "const x = 1;", language: "typescript" })} />
    );
    expect(screen.getByText("Insert code")).toBeTruthy();
  });

  it("does not show Insert code button when no prefilledCode", () => {
    render(<AddCommentForm {...makeProps()} />);
    expect(screen.queryByText("Insert code")).toBeNull();
  });

  it("clicking Insert code inserts a fenced block with language tag", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "const x = 1;", language: "typescript" })} />
    );
    fireEvent.click(screen.getByText("Insert code"));
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toContain("```typescript\n");
    expect(textarea.value).toContain("const x = 1;");
    expect(textarea.value).toContain("\n```");
  });

  it("hides Insert code button after code is inserted", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "const x = 1;", language: "typescript" })} />
    );
    expect(screen.getByText("Insert code")).toBeTruthy();
    fireEvent.click(screen.getByText("Insert code"));
    expect(screen.queryByText("Insert code")).toBeNull();
  });

  it("clicking Insert code uses plain fence when language is 'plaintext'", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "some code", language: "plaintext" })} />
    );
    fireEvent.click(screen.getByText("Insert code"));
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/^```\n/);
  });

  it("clicking Insert code uses plain fence when language is omitted", () => {
    render(
      <AddCommentForm {...makeProps({ prefilledCode: "some code" })} />
    );
    fireEvent.click(screen.getByText("Insert code"));
    const textarea = screen.getByPlaceholderText(/Enter your comment/) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/^```\n/);
  });
});
