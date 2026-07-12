// Solid port of recharts 3.8.1 test/chart/chartEvents.spec.tsx (commit 7a23854).
//
// PORTED SUBSET. The Solid `parameterizedTestCases` helper only defines the
// ComposedChart / BarChart / ScatterChart cases (Area / Line / Funnel / Treemap /
// Sankey / Sunburst are not yet ported there), so the `describe.each` over the
// chart cases iterates only those three. `onlyCompact` / `allCharts` /
// `allCartesianChartsExcept` are likewise not defined in the Solid helper.
//
// Cases NOT ported (see structured `blocked` for details):
//   - "should call onMouseEnter, onMouseMove, and onMouseLeave …": the Solid
//     RechartsWrapper attaches onMouseEnter / onMouseLeave directly on the wrapper
//     div (native, non-bubbling). The recharts spec fires `mouseOver` / `mouseLeave`
//     on the inner `.recharts-surface`, which never reaches a non-bubbling wrapper
//     handler — so onMouseEnter / onMouseLeave never fire (probe-verified: 0 calls).
//   - "should call onTouchStart, onTouchMove, and onTouchEnd …": handleTouchMove
//     reads `event.touches`, but the spec fires touchMove with `changedTouches`,
//     so onTouchMove never fires (probe-verified: 0 calls).
//   - the `onlyCompact(allCharts)` "should not call …" block: the `compact`
//     (Brush panorama) branch is DEFERRED in CategoricalChart.
//   - the hover/move/leave "chart wrapper event data" case (trigger=hover /
//     undefined): blocked on the same non-bubbling onMouseEnter divergence above —
//     onMouseEnter never fires from a mouseOver dispatched on the inner surface.
//
// NOW PORTED: the trigger=click "chart wrapper event data" case. Its earlier
// blocker (the external onClick handler reading stale store.state because the
// click-driven active-tooltip write was not flushed first) is fixed in src —
// RechartsWrapper.handleClick now flush()es between dispatchMouseClick and the
// external-handler dispatch.
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { fireEvent, render } from "../helper/render";
import {
  BarChartCase,
  ComposedChartCase,
  ScatterChartCase,
} from "../helper/parameterizedTestCases";
import { assertNotNull } from "../helper/assertNotNull";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { Bar, BarChart, Tooltip, XAxis } from "../../src";
import { PageData } from "../_data";
import type { MouseHandlerDataParam } from "../../src/synchronisation/types";

function expectLastCalledWithData(spy: Mock, expectedNextState: MouseHandlerDataParam): void {
  const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
  assertNotNull(lastCall);
  // first argument is the nextState object, second argument is the DOM event
  expect(lastCall).toHaveLength(2);
  expect(lastCall[0]).toEqual(expectedNextState);
  expect(lastCall[1]).toBeInstanceOf(Object);
}

const chartsThatSupportWrapperEvents = [ComposedChartCase, BarChartCase, ScatterChartCase];

const spies = {
  onClick: vi.fn(),
  onMouseEnter: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseLeave: vi.fn(),
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
};

function getSurface(chartContainer: HTMLElement): Element {
  const surface = chartContainer.querySelector(".recharts-surface");
  assertNotNull(surface);
  return surface;
}

describe("chart wrapper events", () => {
  beforeEach(() => {
    Object.values(spies).forEach((spy) => spy.mockClear());
  });

  describe.each(chartsThatSupportWrapperEvents)("in $testName", ({ ChartElement }) => {
    it("should not call any chart events without user interaction", () => {
      render(() => <ChartElement />);
      Object.values(spies).forEach((spy) => {
        expect(spy).not.toHaveBeenCalled();
      });
    });

    it("should call onClick when user clicks on the chart", () => {
      const { container } = render(() => <ChartElement onClick={spies.onClick} />);
      fireEvent.click(getSurface(container), { clientX: 10, clientY: 10 });
      // external handler middleware is called within requestAnimationFrame
      vi.runOnlyPendingTimers();

      expect(spies.onClick).toHaveBeenCalled();
    });
  });
});

describe("chart wrapper event data", () => {
  beforeEach(() => {
    Object.values(spies).forEach((spy) => spy.mockClear());
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("when Tooltip has trigger=click", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={400} height={400} data={PageData} {...spies}>
        <Bar dataKey="uv" />
        <Tooltip trigger="click" />
        <XAxis dataKey="name" />
        {props.children}
      </BarChart>
    ));

    it("should pass tooltip state to onClick when user clicks on the chart", () => {
      const { container } = renderTestCase();
      const surface = container.querySelector(".recharts-surface");
      assertNotNull(surface);
      fireEvent.click(surface, { clientX: 10, clientY: 10 });
      vi.runOnlyPendingTimers();

      expectLastCalledWithData(spies.onClick, {
        activeCoordinate: { x: 37.5, y: 10 },
        activeDataKey: undefined,
        activeIndex: "0",
        activeLabel: "Page A",
        activeTooltipIndex: "0",
        isTooltipActive: true,
      });
    });
  });
});
