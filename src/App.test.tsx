import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";

const mockParsedFile = {
  oldPath: "src/app.ts",
  newPath: "src/app.ts",
  type: "modify",
  hunks: [
    {
      content: "@@ -1 +1 @@",
      oldStart: 1,
      oldLines: 1,
      newStart: 1,
      newLines: 1,
      changes: [],
    },
  ],
};

vi.mock("./lib/bridge", () => ({
  invoke: vi.fn((command: string) => {
    if (command === "get_working_directory") return Promise.resolve("/repo");
    if (command === "is_wait_mode") return Promise.resolve(false);
    if (command === "is_json_output") return Promise.resolve(false);
    if (command === "get_initial_diff_mode") return Promise.resolve(null);
    if (command === "check_cli_installed") return Promise.resolve(true);
    if (command === "is_git_repo") return Promise.resolve(true);
    if (command === "get_git_change_status") {
      return Promise.resolve({ has_staged: false, has_unstaged: true });
    }
    if (command === "get_unstaged_diff") {
      return Promise.resolve({
        diff: "diff --git a/src/app.ts b/src/app.ts\n",
        files: [{ path: "src/app.ts", status: "modified" }],
      });
    }
    return Promise.resolve([]);
  }),
  listen: vi.fn(async () => () => {}),
  getCurrentWindow: vi.fn(() => ({ setTitle: vi.fn() })),
  openDirectoryDialog: vi.fn(),
}));

vi.mock("react-diff-view", () => ({
  parseDiff: vi.fn(() => [mockParsedFile]),
  Diff: ({ children }: { children: (hunks: typeof mockParsedFile.hunks) => React.ReactNode }) => (
    <div data-testid="mock-diff">{children(mockParsedFile.hunks)}</div>
  ),
  Hunk: ({ hunk }: { hunk: (typeof mockParsedFile.hunks)[number] }) => (
    <div data-testid="mock-hunk">{hunk.content}</div>
  ),
  Decoration: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  getChangeKey: vi.fn(() => "change-key"),
  getCollapsedLinesCountBetween: vi.fn(() => 0),
  expandFromRawCode: vi.fn(() => []),
}));

vi.mock("./highlight", () => ({
  highlight: vi.fn(() => undefined),
}));

describe("App diff layout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it("renders diff content edge-to-edge horizontally", async () => {
    render(<App />);

    const diffContent = await screen.findByTestId("diff-content");

    await waitFor(() => {
      expect(screen.getByTestId("mock-diff")).toBeInTheDocument();
    });
    expect(diffContent).toHaveClass("pb-6");
    expect(diffContent).toHaveClass("pt-12");
    expect(diffContent).not.toHaveClass("p-6");
    expect(diffContent).not.toHaveClass("px-5");
    expect(diffContent).not.toHaveClass("px-6");
  });
});
