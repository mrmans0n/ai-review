import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollProgress } from "./useScrollProgress";

describe("useScrollProgress", () => {
  const originalInnerHeight = window.innerHeight;
  const originalScrollY = window.scrollY;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  const setScrollableDimensions = (scrollHeight: number, innerHeight: number) => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: scrollHeight,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: innerHeight,
    });
  };

  const setScrollY = (value: number) => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value,
    });
  };

  beforeEach(() => {
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

    setScrollableDimensions(600, 600);
    setScrollY(0);
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: originalScrollY,
    });
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.unstubAllGlobals();
  });

  it("returns not scrollable when content fits viewport", () => {
    setScrollableDimensions(600, 600);

    const { result } = renderHook(() => useScrollProgress());

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.isScrollable).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("calculates progress based on scroll position", () => {
    setScrollableDimensions(1400, 700);
    setScrollY(350);

    const { result } = renderHook(() => useScrollProgress());

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.isScrollable).toBe(true);
    expect(result.current.progress).toBe(50);
  });

  it("throttles scroll updates with requestAnimationFrame", () => {
    setScrollableDimensions(2000, 1000);

    const { result } = renderHook(() => useScrollProgress());

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.progress).toBe(0);

    act(() => {
      setScrollY(250);
      window.dispatchEvent(new Event("scroll"));
      setScrollY(500);
      window.dispatchEvent(new Event("scroll"));
      setScrollY(750);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);

    act(() => {
      (globalThis as any).flushRaf();
    });

    expect(result.current.progress).toBe(75);
  });
});
