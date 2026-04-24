import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LfsTextPreview } from "./LfsTextPreview";

describe("LfsTextPreview", () => {
  it("renders loading state", () => {
    render(
      <LfsTextPreview
        fileName="readme.md"
        status="added"
        oldContent={null}
        newContent={null}
        loading={true}
        error={null}
      />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <LfsTextPreview
        fileName="readme.md"
        status="added"
        oldContent={null}
        newContent={null}
        loading={false}
        error="LFS object not available locally"
      />
    );
    expect(screen.getByText(/LFS object not available/)).toBeInTheDocument();
  });

  it("renders new content for added files", () => {
    render(
      <LfsTextPreview
        fileName="readme.md"
        status="added"
        oldContent={null}
        newContent="# Hello World"
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("# Hello World")).toBeInTheDocument();
  });

  it("renders old content for deleted files", () => {
    render(
      <LfsTextPreview
        fileName="readme.md"
        status="deleted"
        oldContent="# Goodbye"
        newContent={null}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("# Goodbye")).toBeInTheDocument();
  });

  it("renders both panes for modified files", () => {
    render(
      <LfsTextPreview
        fileName="readme.md"
        status="modified"
        oldContent="# Old"
        newContent="# New"
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("# Old")).toBeInTheDocument();
    expect(screen.getByText("# New")).toBeInTheDocument();
    expect(screen.getByText("Old")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("truncates content beyond 10000 lines", () => {
    const longContent = Array.from({ length: 10500 }, (_, i) => `line ${i + 1}`).join("\n");
    render(
      <LfsTextPreview
        fileName="big.txt"
        status="added"
        oldContent={null}
        newContent={longContent}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText(/truncated/i)).toBeInTheDocument();
  });
});
