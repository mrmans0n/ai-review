import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LfsTextPreview } from "./LfsTextPreview";

vi.mock("highlight.js/lib/core", () => ({
  default: {
    highlight: (_code: string, _opts: any) => ({ value: _code }),
  },
}));

function makeProps(overrides: Partial<Parameters<typeof LfsTextPreview>[0]> = {}) {
  return {
    fileName: "config.yaml",
    status: "modified",
    oldContent: null as string | null,
    newContent: null as string | null,
    language: "yaml",
    loading: false,
    error: null as string | null,
    ...overrides,
  };
}

describe("LfsTextPreview", () => {
  it("shows loading message when loading", () => {
    render(<LfsTextPreview {...makeProps({ loading: true })} />);
    expect(screen.getByText("Loading LFS content preview...")).toBeTruthy();
  });

  it("shows error message when error is set", () => {
    render(<LfsTextPreview {...makeProps({ error: "Object not found" })} />);
    expect(screen.getByText("Failed to load LFS content")).toBeTruthy();
    expect(screen.getByText("Object not found")).toBeTruthy();
  });

  it("shows single pane for added files", () => {
    render(
      <LfsTextPreview
        {...makeProps({ status: "added", newContent: "key: value" })}
      />
    );
    expect(screen.getByText("config.yaml")).toBeTruthy();
    expect(screen.getByText("key: value")).toBeTruthy();
  });

  it("shows single pane for deleted files", () => {
    render(
      <LfsTextPreview
        {...makeProps({ status: "deleted", oldContent: "old content" })}
      />
    );
    expect(screen.getByText("old content")).toBeTruthy();
  });

  it("shows Old/New side-by-side for modified files", () => {
    render(
      <LfsTextPreview
        {...makeProps({
          status: "modified",
          oldContent: "before",
          newContent: "after",
        })}
      />
    );
    expect(screen.getByText("Old")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText("before")).toBeTruthy();
    expect(screen.getByText("after")).toBeTruthy();
  });

  it("shows fallback when no content available", () => {
    render(<LfsTextPreview {...makeProps()} />);
    expect(screen.getByText("No LFS content preview available")).toBeTruthy();
  });
});
