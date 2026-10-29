// Ported from recharts 3.8.1 test/util/useElementOffset.spec.tsx.
// Harness changes only (Tier A): React Testing Library's `renderHook`/`act` →
// the local Solid shim; React's `useElementOffset` returns `[value, setter]`,
// the Solid port returns `[Accessor, setter]`, so the current value is read by
// calling the accessor (`result[0]()` where React wrote `result.current[0]`);
// `unmount()` → the Solid renderHook's `cleanup()`. All assertions/expected
// values are byte-identical to recharts.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flush } from "solid-js";
import { renderHook } from "@solidjs/testing-library";
import { useElementOffset } from "../../src/util/useElementOffset";
import { getMockDomRect } from "../helper/mockGetBoundingClientRect";

// Solid updates synchronously; `flush()` drains any pending reactive work so the
// accessor reflects the latest value, mirroring React Testing Library's `act`.
const act = (fn: () => void): void => {
  fn();
  flush();
};

describe("useElementOffset", () => {
  let resizeObserverCallback: ((entries: ResizeObserverEntry[]) => void) | undefined,
    observeSpy: ReturnType<typeof vi.fn>,
    disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resizeObserverCallback = undefined;
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(function ResizeObserverMock(cb: (entries: ResizeObserverEntry[]) => void) {
        resizeObserverCallback = cb;
        return { observe: observeSpy, unobserve: vi.fn(), disconnect: disconnectSpy };
      }),
    );
  });

  it("should return initial zero values", () => {
    const { result } = renderHook(() => useElementOffset());
    const offset = result[0]();
    expect(offset).toEqual({ height: 0, left: 0, top: 0, width: 0 });
  });

  it("should measure element on ref callback with a non-null node", () => {
    const mockRect = getMockDomRect({ width: 100, height: 50, left: 10, top: 20 });
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue(mockRect);

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });

    expect(result[0]()).toEqual({ width: 100, height: 50, left: 10, top: 20 });
  });

  it("should create a ResizeObserver and observe the node", () => {
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue(
      getMockDomRect({ width: 100, height: 50 }),
    );

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });

    expect(observeSpy).toHaveBeenCalledWith(node);
  });

  it("should update state when ResizeObserver detects a size change", () => {
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect")
      .mockReturnValueOnce(getMockDomRect({ width: 100, height: 50 }))
      .mockReturnValue(getMockDomRect({ width: 100, height: 120 }));

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });
    expect(result[0]().height).toBe(50);

    act(() => {
      resizeObserverCallback?.([]);
    });
    expect(result[0]().height).toBe(120);
  });

  it("should ignore changes smaller than EPS (1px)", () => {
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect")
      .mockReturnValueOnce(getMockDomRect({ width: 100, height: 50 }))
      .mockReturnValue(getMockDomRect({ width: 100, height: 50.5 }));

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });
    expect(result[0]().height).toBe(50);

    act(() => {
      resizeObserverCallback?.([]);
    });
    // Height change of 0.5 is below EPS=1, should not update
    expect(result[0]().height).toBe(50);
  });

  it("should not create a ResizeObserver when node is null", () => {
    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](null);
    });

    expect(observeSpy).not.toHaveBeenCalled();
  });

  it("should disconnect the previous ResizeObserver when a new node is attached", () => {
    const node1 = document.createElement("div");
    const node2 = document.createElement("div");
    vi.spyOn(node1, "getBoundingClientRect").mockReturnValue(
      getMockDomRect({ width: 100, height: 50 }),
    );
    vi.spyOn(node2, "getBoundingClientRect").mockReturnValue(
      getMockDomRect({ width: 200, height: 80 }),
    );

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node1);
    });
    expect(disconnectSpy).not.toHaveBeenCalled();

    act(() => {
      result[1](node2);
    });
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(result[0]()).toEqual({ width: 200, height: 80, left: 0, top: 0 });
  });

  it("should disconnect the ResizeObserver on unmount", () => {
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue(
      getMockDomRect({ width: 100, height: 50 }),
    );

    const { result, cleanup } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });

    cleanup();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("should disconnect the previous observer when node is set to null", () => {
    const node = document.createElement("div");
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue(
      getMockDomRect({ width: 100, height: 50 }),
    );

    const { result } = renderHook(() => useElementOffset());
    act(() => {
      result[1](node);
    });
    expect(disconnectSpy).not.toHaveBeenCalled();

    act(() => {
      result[1](null);
    });
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
