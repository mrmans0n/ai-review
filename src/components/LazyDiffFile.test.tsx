import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyDiffFile } from "./LazyDiffFile";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  options?: IntersectionObserverInit;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  trigger(entries: Pick<IntersectionObserverEntry, "isIntersecting" | "target">[]) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

describe("LazyDiffFile", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a placeholder (not children) before intersection", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).toBeNull();
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("mounts children when intersection fires", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger([{ isIntersecting: true, target: document.createElement("div") }]);
    });
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("mounts children immediately when forceMount is true", () => {
    render(
      <LazyDiffFile estimatedHeight={1234} forceMount>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("transitions from pending to mounted when forceMount becomes true", () => {
    const { rerender } = render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).toBeNull();

    rerender(
      <LazyDiffFile estimatedHeight={1234} forceMount>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("stays mounted after intersection even if it later leaves the viewport", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger([{ isIntersecting: true, target: document.createElement("div") }]);
    });
    expect(screen.queryByTestId("child")).not.toBeNull();
    act(() => {
      observer.trigger([{ isIntersecting: false, target: document.createElement("div") }]);
    });
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("mounts immediately when IntersectionObserver is unavailable (jsdom shim path)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("stays mounted when forceMount transitions back to false (sticky mount)", () => {
    const { rerender } = render(
      <LazyDiffFile estimatedHeight={1234} forceMount>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();

    rerender(
      <LazyDiffFile estimatedHeight={1234} forceMount={false}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });
});
