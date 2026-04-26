import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChangedFileRailItem } from "../types";
import { FileList } from "./FileList";

function file(
  path: string,
  overrides: Partial<ChangedFileRailItem> = {}
): ChangedFileRailItem {
  return {
    path,
    displayPath: path,
    status: "modified",
    additions: 0,
    deletions: 0,
    viewed: false,
    commentCount: 0,
    ...overrides,
  };
}

describe("FileList", () => {
  it("renders nested files under collapsible directories", () => {
    render(
      <FileList
        files={[
          file("src/components/FileList.tsx"),
          file("src/hooks/useGit.ts"),
        ]}
        onSelectFile={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Toggle directory src" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(
      screen.getByRole("button", { name: "Toggle directory src/components" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "src/components/FileList.tsx" })).toBeTruthy();
  });

  it("collapses and expands directory nodes", () => {
    render(
      <FileList
        files={[
          file("src/components/FileList.tsx"),
          file("src/hooks/useGit.ts"),
        ]}
        onSelectFile={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle directory src/components" }));
    expect(screen.queryByRole("button", { name: "src/components/FileList.tsx" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle directory src/components" }));
    expect(screen.getByRole("button", { name: "src/components/FileList.tsx" })).toBeTruthy();
  });

  it("preserves collapsed state across metadata updates", () => {
    const { rerender } = render(
      <FileList
        files={[
          file("src/components/FileList.tsx"),
          file("src/hooks/useGit.ts"),
        ]}
        onSelectFile={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle directory src/components" }));
    expect(screen.queryByRole("button", { name: "src/components/FileList.tsx" })).toBeNull();

    rerender(
      <FileList
        files={[
          file("src/components/FileList.tsx", { viewed: true }),
          file("src/hooks/useGit.ts"),
        ]}
        onSelectFile={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "src/components/FileList.tsx" })).toBeNull();
  });

  it("selects a file on normal click and marks the row selected", () => {
    const onSelectFile = vi.fn();
    render(
      <FileList
        files={[file("src/App.tsx")]}
        onSelectFile={onSelectFile}
      />
    );

    const row = screen.getByRole("button", { name: "src/App.tsx" });
    fireEvent.click(row);

    expect(onSelectFile).toHaveBeenCalledWith("src/App.tsx");
    expect(screen.getByTestId("file-row-src/App.tsx").className).toContain("bg-ctp-surface1");
  });

  it("uses a distinct active state from the selected row state", () => {
    render(
      <FileList
        files={[file("src/App.tsx")]}
        selectedFile="src/App.tsx"
        onSelectFile={vi.fn()}
      />
    );

    const row = screen.getByRole("button", { name: "src/App.tsx" });
    expect(row).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("file-row-src/App.tsx").className).toContain("border-accent-review");
  });

  it("uses preview for meta-click without selecting", () => {
    const onSelectFile = vi.fn();
    const onPreviewFile = vi.fn();
    render(
      <FileList
        files={[file("src/App.tsx")]}
        onSelectFile={onSelectFile}
        onPreviewFile={onPreviewFile}
      />
    );

    const row = screen.getByRole("button", { name: "src/App.tsx" });
    fireEvent.click(row, { metaKey: true });

    expect(onPreviewFile).toHaveBeenCalledWith("src/App.tsx");
    expect(onSelectFile).not.toHaveBeenCalled();
    expect(screen.getByTestId("file-row-src/App.tsx").className).not.toContain("bg-ctp-surface1");
  });

  it("uses the preview button without selecting the file", () => {
    const onSelectFile = vi.fn();
    const onPreviewFile = vi.fn();
    render(
      <FileList
        files={[file("src/App.tsx")]}
        onSelectFile={onSelectFile}
        onPreviewFile={onPreviewFile}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview src/App.tsx" }));

    expect(onPreviewFile).toHaveBeenCalledWith("src/App.tsx");
    expect(onSelectFile).not.toHaveBeenCalled();
  });

  it("renders status, stats, viewed state, and comment count", () => {
    render(
      <FileList
        files={[
          file("src/App.tsx", {
            status: "added",
            additions: 12,
            deletions: 3,
            viewed: true,
            commentCount: 2,
          }),
        ]}
        onSelectFile={vi.fn()}
      />
    );

    expect(screen.getByLabelText("added status")).toHaveTextContent("+");
    expect(screen.getByText("+12")).toBeTruthy();
    expect(screen.getByText("-3")).toBeTruthy();
    expect(screen.getByLabelText("viewed")).toBeTruthy();
    expect(screen.getByLabelText("2 comments")).toHaveTextContent("2");
  });
});
