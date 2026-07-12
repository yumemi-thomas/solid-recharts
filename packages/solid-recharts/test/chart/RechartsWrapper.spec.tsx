import { Show, createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { assertNotNull } from "../helper/assertNotNull";
import { BarChart } from "../../src";
import { RechartsWrapper } from "../../src/chart/RechartsWrapper";

/*
 * Ported from recharts 3.8.1 test/chart/RechartsWrapper.spec.tsx.
 * Solid adaptation: React rerender is represented by a signal-driven remount.
 */

describe("RechartsWrapper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should call onMouseEnter, and onMouseLeave handlers", () => {
    const onMouseEnterSpy = vi.fn();
    const onMouseLeaveSpy = vi.fn();
    const { container } = render(() => (
      <BarChart
        width={800}
        height={400}
        onMouseEnter={onMouseEnterSpy}
        onMouseLeave={onMouseLeaveSpy}
      />
    ));

    const wrapper = container.querySelector(".recharts-wrapper");
    assertNotNull(wrapper);
    expect(wrapper).toBeInTheDocument();

    expect(onMouseEnterSpy).not.toHaveBeenCalled();
    expect(onMouseLeaveSpy).not.toHaveBeenCalled();

    fireEvent.mouseEnter(wrapper);
    flush();

    expect(onMouseEnterSpy).toHaveBeenCalledTimes(1);
    expect(onMouseLeaveSpy).not.toHaveBeenCalled();

    fireEvent.mouseLeave(wrapper);
    flush();

    expect(onMouseEnterSpy).toHaveBeenCalledTimes(1);
    expect(onMouseLeaveSpy).toHaveBeenCalledTimes(1);
  });

  it("should disconnect the previous ResizeObserver before creating a new one when the DOM node changes", () => {
    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();

    const ResizeObserverMock = vi.fn(function ResizeObserverMock() {
      return {
        observe: observeSpy,
        unobserve: vi.fn(),
        disconnect: disconnectSpy,
      };
    });
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    const [version, setVersion] = createSignal(0);
    render(() => (
      <Show keyed when={version() + 1}>
        <RechartsWrapper responsive width={100} height={100} ref={() => undefined}>
          <div />
        </RechartsWrapper>
      </Show>
    ));

    expect(ResizeObserverMock).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).not.toHaveBeenCalled();

    setVersion(1);
    flush();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(2);
    expect(observeSpy).toHaveBeenCalledTimes(2);
  });
});
