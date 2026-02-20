import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollProgress } from "./useScrollProgress";

describe("useScrollProgress", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  let container: HTMLDivElement;
  let containerRef: { current: HTMLDivElement };

  const setContainerDimensions = (
    scrollHeight: number,
    clientHeight: number,
    scrollTop: number
  ) => {
    Object.defineProperty(container, "scrollHeight", {
      configurable: true,
      value: scrollHeight,
    });
    Object.defineProperty(container, "clientHeight", {
      configurable: true,
      value: clientHeight,
    });
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: scrollTop,
    });
  };

  beforeEach(() => {
    // Mock ResizeObserver (not available in jsdom)
    globalThis.ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor() {}
    } as any;

    container = document.createElement("div");
    document.body.appendChild(container);
    containerRef = { current: container };

    let rafQueue: FrameRequestCallback[] = [];

    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    window.cancelAnimationFrame = vi.fn((id: number) => {
      rafQueue = rafQueue.filter((_, index) => index + 1 !== id);
    });

    vi.stubGlobal("flushRaf", () => {
      const pending = [...rafQueue];
      rafQueue = [];
      pending.forEach((callback) => callback(performance.now()));
    });

    setContainerDimensions(600, 600, 0);
  });

  afterEach(() => {
    document.body.removeChild(container);
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.unstubAllGlobals();
  });

  it("returns not scrollable when content fits container", () => {
    setContainerDimensions(600, 600, 0);

    const { result } = renderHook(() => useScrollProgress(containerRef));

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.isScrollable).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("calculates progress based on scroll position", () => {
    setContainerDimensions(1400, 700, 350);

    const { result } = renderHook(() => useScrollProgress(containerRef));

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.isScrollable).toBe(true);
    expect(result.current.progress).toBe(50);
  });

  it("throttles scroll updates with requestAnimationFrame", () => {
    setContainerDimensions(2000, 1000, 0);

    const { result } = renderHook(() => useScrollProgress(containerRef));

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.progress).toBe(0);

    act(() => {
      setContainerDimensions(2000, 1000, 250);
      container.dispatchEvent(new Event("scroll"));
      setContainerDimensions(2000, 1000, 500);
      container.dispatchEvent(new Event("scroll"));
      setContainerDimensions(2000, 1000, 750);
      container.dispatchEvent(new Event("scroll"));
    });

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.progress).toBe(75);
  });

  it("returns defaults when no containerRef provided", () => {
    const { result } = renderHook(() => useScrollProgress());

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.isScrollable).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
