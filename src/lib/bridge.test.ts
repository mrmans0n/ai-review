import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (name: string, args: unknown) => ({ name, args, result: "ok" })),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({ setTitle: vi.fn() })),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/some/path"),
}));

import { invoke, listen, getCurrentWindow, openDirectoryDialog } from "./bridge";

describe("bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards invoke to the underlying transport", async () => {
    const out = await invoke<{ result: string }>("foo", { a: 1 });
    expect(out.result).toBe("ok");
  });

  it("forwards listen and returns an unlisten function", async () => {
    const unlisten = await listen("evt", () => {});
    expect(typeof unlisten).toBe("function");
  });

  it("exposes a window with setTitle", () => {
    const w = getCurrentWindow();
    w.setTitle("hi");
    expect(w.setTitle).toHaveBeenCalledWith("hi");
  });

  it("exposes a directory open dialog", async () => {
    const path = await openDirectoryDialog();
    expect(path).toBe("/some/path");
  });
});
