import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileList } from "./FileList";
import type { ChangedFile } from "../types";

const files: ChangedFile[] = [
  { path: "src/App.tsx", status: "modified" },
  { path: "README.md", status: "added" },
];

describe("FileList", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSelectFile when a file row is clicked", () => {
    const onSelectFile = vi.fn();
    render(<FileList files={files} onSelectFile={onSelectFile} />);

    fireEvent.click(screen.getByRole("button", { name: "Go to README.md" }));

    expect(onSelectFile).toHaveBeenCalledWith("README.md");
  });

  it("calls onPreviewFile from the preview action without selecting the row", () => {
    const onSelectFile = vi.fn();
    const onPreviewFile = vi.fn();
    render(
      <FileList
        files={files}
        onSelectFile={onSelectFile}
        onPreviewFile={onPreviewFile}
      />
    );

    fireEvent.click(screen.getByLabelText("Preview src/App.tsx"));

    expect(onPreviewFile).toHaveBeenCalledWith("src/App.tsx");
    expect(onSelectFile).not.toHaveBeenCalled();
  });

  it("uses meta-click as a preview shortcut", () => {
    const onSelectFile = vi.fn();
    const onPreviewFile = vi.fn();
    render(
      <FileList
        files={files}
        onSelectFile={onSelectFile}
        onPreviewFile={onPreviewFile}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to README.md" }), { metaKey: true });

    expect(onPreviewFile).toHaveBeenCalledWith("README.md");
    expect(onSelectFile).not.toHaveBeenCalled();
  });

  it("marks the active file row and scrolls it into view", () => {
    const { rerender } = render(
      <FileList files={files} activeFile="README.md" onSelectFile={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Go to README.md" }).closest("[data-active-file-row]")).toHaveAttribute(
      "data-active-file-row",
      "true"
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

    scrollIntoView.mockClear();
    rerender(<FileList files={files} activeFile="src/App.tsx" onSelectFile={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Go to src/App.tsx" }).closest("[data-active-file-row]")).toHaveAttribute(
      "data-active-file-row",
      "true"
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });
});
