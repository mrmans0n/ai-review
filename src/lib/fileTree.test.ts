import { describe, expect, it } from "vitest";
import type { ChangedFileRailItem } from "../types";
import {
  buildFileTree,
  normalizeFileStatus,
  normalizePath,
} from "./fileTree";

function item(path: string): ChangedFileRailItem {
  return {
    path,
    displayPath: path,
    status: "modified",
    additions: 0,
    deletions: 0,
    viewed: false,
    commentCount: 0,
  };
}

describe("normalizePath", () => {
  it("normalizes backslashes, duplicate slashes, and leading current-directory segments", () => {
    expect(normalizePath("./src\\components//FileList.tsx")).toBe(
      "src/components/FileList.tsx"
    );
  });

  it("trims leading slashes and empty path segments", () => {
    expect(normalizePath("/src///lib/fileTree.ts")).toBe("src/lib/fileTree.ts");
  });
});

describe("normalizeFileStatus", () => {
  it("maps short and long status values consistently", () => {
    expect(normalizeFileStatus("A")).toBe("added");
    expect(normalizeFileStatus("modified")).toBe("modified");
    expect(normalizeFileStatus("D")).toBe("deleted");
    expect(normalizeFileStatus("rename")).toBe("renamed");
    expect(normalizeFileStatus("C")).toBe("copied");
  });

  it("returns unknown for unrecognized statuses", () => {
    expect(normalizeFileStatus("typechange")).toBe("unknown");
  });
});

describe("buildFileTree", () => {
  it("groups nested paths into directories and files", () => {
    const tree = buildFileTree([
      item("src/App.tsx"),
      item("src/components/FileList.tsx"),
      item("README.md"),
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ type: "directory", name: "src" });
    expect(tree[1]).toMatchObject({ type: "file", name: "README.md" });

    const src = tree[0];
    expect(src.type).toBe("directory");
    if (src.type === "directory") {
      expect(src.children.map((child) => child.name)).toEqual([
        "components",
        "App.tsx",
      ]);
    }
  });

  it("flattens single-child directory chains", () => {
    const tree = buildFileTree([item("src/components/forms/Button.tsx")]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      type: "directory",
      name: "src/components/forms",
      path: "src/components/forms",
    });
  });

  it("does not flatten directories with sibling files or directories", () => {
    const tree = buildFileTree([
      item("src/components/Button.tsx"),
      item("src/hooks/useGit.ts"),
      item("src/App.tsx"),
    ]);

    expect(tree[0]).toMatchObject({ type: "directory", name: "src" });
    if (tree[0].type === "directory") {
      expect(tree[0].children.map((child) => child.name)).toEqual([
        "components",
        "hooks",
        "App.tsx",
      ]);
    }
  });
});
