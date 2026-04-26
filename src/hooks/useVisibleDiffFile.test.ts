import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisibleDiffFile } from "./useVisibleDiffFile";

type MockEntry = Pick<IntersectionObserverEntry, "target" | "isIntersecting" | "boundingClientRect">;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  options?: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: MockEntry[]) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

function rect(top: number, bottom: number): DOMRectReadOnly {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

function appendDiffFile(container: HTMLElement, filePath: string) {
  const element = document.createElement("section");
  element.dataset.diffFile = filePath;
  container.appendChild(element);
  return element;
}

describe("useVisibleDiffFile", () => {
  let container: HTMLDivElement;
  let containerRef: { current: HTMLDivElement };

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    container = document.createElement("div");
    document.body.appendChild(container);
    containerRef = { current: container };
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(rect(100, 700) as DOMRect);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns undefined initially and observes diff file elements", () => {
    const first = appendDiffFile(container, "README.md");
    const second = appendDiffFile(container, "src/App.tsx");

    const { result } = renderHook(() =>
      useVisibleDiffFile({ containerRef, filePaths: ["README.md", "src/App.tsx"] })
    );

    expect(result.current).toBeUndefined();
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].options?.root).toBe(container);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(first);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(second);
  });

  it("tracks the visible file nearest the top of the scroll container", () => {
    const first = appendDiffFile(container, "README.md");
    const second = appendDiffFile(container, "src/App.tsx");

    const { result } = renderHook(() =>
      useVisibleDiffFile({ containerRef, filePaths: ["README.md", "src/App.tsx"] })
    );

    act(() => {
      MockIntersectionObserver.instances[0].trigger([
        { target: first, isIntersecting: true, boundingClientRect: rect(80, 400) },
        { target: second, isIntersecting: true, boundingClientRect: rect(120, 500) },
      ]);
    });

    expect(result.current).toBe("src/App.tsx");
  });

  it("keeps a long file active after its top scrolls above the container", () => {
    const first = appendDiffFile(container, "README.md");
    const second = appendDiffFile(container, "src/App.tsx");

    const { result } = renderHook(() =>
      useVisibleDiffFile({ containerRef, filePaths: ["README.md", "src/App.tsx"] })
    );

    act(() => {
      MockIntersectionObserver.instances[0].trigger([
        { target: first, isIntersecting: true, boundingClientRect: rect(-200, 500) },
        { target: second, isIntersecting: false, boundingClientRect: rect(620, 900) },
      ]);
    });

    expect(result.current).toBe("README.md");
  });

  it("ignores observer updates while suppressed", () => {
    const first = appendDiffFile(container, "README.md");
    const second = appendDiffFile(container, "src/App.tsx");
    const suppressRef = { current: false };

    const { result } = renderHook(() =>
      useVisibleDiffFile({ containerRef, filePaths: ["README.md", "src/App.tsx"], suppressRef })
    );

    act(() => {
      MockIntersectionObserver.instances[0].trigger([
        { target: first, isIntersecting: true, boundingClientRect: rect(120, 500) },
      ]);
    });
    expect(result.current).toBe("README.md");

    suppressRef.current = true;
    act(() => {
      MockIntersectionObserver.instances[0].trigger([
        { target: second, isIntersecting: true, boundingClientRect: rect(110, 500) },
      ]);
    });

    expect(result.current).toBe("README.md");
  });

  it("disconnects and re-observes when file paths change", () => {
    appendDiffFile(container, "README.md");
    const second = appendDiffFile(container, "src/App.tsx");

    const { rerender, unmount } = renderHook(
      ({ filePaths }) => useVisibleDiffFile({ containerRef, filePaths }),
      { initialProps: { filePaths: ["README.md"] } }
    );

    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledTimes(1);

    rerender({ filePaths: ["src/App.tsx"] });

    expect(MockIntersectionObserver.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(MockIntersectionObserver.instances).toHaveLength(2);
    expect(MockIntersectionObserver.instances[1].observe).toHaveBeenCalledWith(second);

    unmount();

    expect(MockIntersectionObserver.instances[1].disconnect).toHaveBeenCalledTimes(1);
  });
});
