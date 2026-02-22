import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileExplorer } from "./FileExplorer";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function makeProps(overrides: Partial<Parameters<typeof FileExplorer>[0]> = {}) {
  return {
    isOpen: true,
    files: [],
    searchQuery: "",
    selectedIndex: 0,
    loading: false,
    onSearchChange: vi.fn(),
    onSelect: vi.fn().mockResolvedValue(""),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe("FileExplorer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<FileExplorer {...makeProps({ isOpen: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal when open", () => {
    render(<FileExplorer {...makeProps()} />);
    expect(screen.getByText("Open File")).toBeTruthy();
  });

  it("shows loading state", () => {
    render(<FileExplorer {...makeProps({ loading: true })} />);
    expect(screen.getByText("Loading files...")).toBeTruthy();
  });

  it("shows empty message when no files and no query", () => {
    render(<FileExplorer {...makeProps({ files: [], searchQuery: "" })} />);
    expect(screen.getByText("No files found")).toBeTruthy();
  });

  it("shows no-match message when query yields no results", () => {
    render(<FileExplorer {...makeProps({ files: [], searchQuery: "xyz" })} />);
    expect(screen.getByText("No matching files")).toBeTruthy();
  });

  it("renders file names from the list", () => {
    const files = ["src/App.tsx", "src/components/Header.tsx"];
    render(<FileExplorer {...makeProps({ files })} />);
    expect(screen.getByText("App.tsx")).toBeTruthy();
    expect(screen.getByText("Header.tsx")).toBeTruthy();
  });

  it("renders directory path separately from file name", () => {
    render(<FileExplorer {...makeProps({ files: ["src/components/Foo.tsx"] })} />);
    expect(screen.getByText("Foo.tsx")).toBeTruthy();
    expect(screen.getByText("src/components")).toBeTruthy();
  });

  it("calls onSelect when a file is clicked", () => {
    const onSelect = vi.fn().mockResolvedValue("");
    render(<FileExplorer {...makeProps({ files: ["src/App.tsx"], onSelect })} />);
    fireEvent.click(screen.getByText("App.tsx"));
    expect(onSelect).toHaveBeenCalledWith("src/App.tsx");
  });

  it("highlights selected item with peach left border", () => {
    const files = ["src/A.tsx", "src/B.tsx"];
    const { container } = render(
      <FileExplorer {...makeProps({ files, selectedIndex: 1 })} />
    );
    const items = container.querySelectorAll("[class*='cursor-pointer']");
    expect(items[1].className).toContain("border-ctp-peach");
    expect(items[0].className).not.toContain("border-ctp-peach");
  });

  it("list items have no horizontal row dividers", () => {
    const files = ["src/A.tsx", "src/B.tsx"];
    const { container } = render(<FileExplorer {...makeProps({ files })} />);
    const items = container.querySelectorAll("[class*='cursor-pointer']");
    items.forEach((item) => {
      expect(item.className).not.toContain("border-b");
    });
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<FileExplorer {...makeProps({ onClose })} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<FileExplorer {...makeProps({ onClose })} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose for Escape when closed", () => {
    const onClose = vi.fn();
    render(<FileExplorer {...makeProps({ isOpen: false, onClose })} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
