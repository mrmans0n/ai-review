import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn(async () => "ok");
const onMock = vi.fn(() => () => {});
const setTitleMock = vi.fn(async () => {});
const openDirMock = vi.fn(async () => "/some/path");

beforeEach(() => {
  invokeMock.mockClear();
  onMock.mockClear();
  setTitleMock.mockClear();
  openDirMock.mockClear();
  (globalThis as unknown as { window: Window }).window =
    (globalThis as unknown as { window: Window }).window ?? ({} as Window);
  window.electronAPI = {
    invoke: invokeMock as unknown as Window["electronAPI"]["invoke"],
    on: onMock,
    setTitle: setTitleMock,
    openDirectoryDialog: openDirMock,
  };
});

describe("bridge", () => {
  it("forwards invoke to electronAPI", async () => {
    const { invoke } = await import("./bridge");
    await invoke("foo", { a: 1 });
    expect(invokeMock).toHaveBeenCalledWith("foo", { a: 1 });
  });

  it("returns an unlisten function from listen", async () => {
    const { listen } = await import("./bridge");
    const off = await listen("evt", () => {});
    expect(typeof off).toBe("function");
    expect(onMock).toHaveBeenCalledWith("evt", expect.any(Function));
  });

  it("getCurrentWindow.setTitle calls electronAPI.setTitle", async () => {
    const { getCurrentWindow } = await import("./bridge");
    getCurrentWindow().setTitle("hi");
    expect(setTitleMock).toHaveBeenCalledWith("hi");
  });

  it("openDirectoryDialog forwards to electronAPI", async () => {
    const { openDirectoryDialog } = await import("./bridge");
    const result = await openDirectoryDialog();
    expect(result).toBe("/some/path");
    expect(openDirMock).toHaveBeenCalled();
  });
});
