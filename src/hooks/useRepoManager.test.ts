import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../lib/bridge", () => ({
  invoke: vi.fn(),
  listen: vi.fn(async () => () => {}),
  openDirectoryDialog: vi.fn(),
}));

import { invoke, openDirectoryDialog } from "../lib/bridge";
import { useRepoManager } from "./useRepoManager";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;
const mockOpen = openDirectoryDialog as ReturnType<typeof vi.fn>;

describe("useRepoManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads repos on mount", async () => {
    mockInvoke.mockResolvedValueOnce([
      { name: "my-repo", path: "/home/user/my-repo" },
    ]);

    const { result } = renderHook(() => useRepoManager());

    await vi.waitFor(() => {
      expect(result.current.repos).toHaveLength(1);
    });

    expect(result.current.repos[0].name).toBe("my-repo");
    expect(mockInvoke).toHaveBeenCalledWith("list_repos");
  });

  it("addRepoViaDialog opens folder picker and adds repo", async () => {
    mockInvoke.mockResolvedValueOnce([]); // initial list_repos
    mockOpen.mockResolvedValueOnce("/home/user/new-repo");
    mockInvoke.mockResolvedValueOnce({ name: "new-repo", path: "/home/user/new-repo" }); // add_repo
    mockInvoke.mockResolvedValueOnce([{ name: "new-repo", path: "/home/user/new-repo" }]); // refreshRepos after add

    const { result } = renderHook(() => useRepoManager());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let addResult: any;
    await act(async () => {
      addResult = await result.current.addRepoViaDialog();
    });

    expect(mockOpen).toHaveBeenCalled();
    expect(addResult).toEqual({ name: "new-repo", path: "/home/user/new-repo" });
  });

  it("addRepoViaDialog returns null when dialog cancelled", async () => {
    mockInvoke.mockResolvedValueOnce([]); // initial list_repos
    mockOpen.mockResolvedValueOnce(null); // user cancelled

    const { result } = renderHook(() => useRepoManager());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let addResult: any;
    await act(async () => {
      addResult = await result.current.addRepoViaDialog();
    });

    expect(addResult).toBeNull();
  });

  it("removeRepo calls command and refreshes list", async () => {
    mockInvoke.mockResolvedValueOnce([
      { name: "repo-a", path: "/a" },
      { name: "repo-b", path: "/b" },
    ]); // initial list
    mockInvoke.mockResolvedValueOnce(undefined); // remove_repo
    mockInvoke.mockResolvedValueOnce([
      { name: "repo-a", path: "/a" },
    ]); // refresh list

    const { result } = renderHook(() => useRepoManager());

    await vi.waitFor(() => {
      expect(result.current.repos).toHaveLength(2);
    });

    await act(async () => {
      await result.current.removeRepo("/b");
    });

    expect(mockInvoke).toHaveBeenCalledWith("remove_repo", { path: "/b" });
    expect(result.current.repos).toHaveLength(1);
  });
});
