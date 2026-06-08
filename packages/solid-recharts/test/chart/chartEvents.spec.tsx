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
//   - the "chart wrapper event data" cases (trigger=click / hover / undefined):
//     blocked on Solid 2.0 reactivity timing — handleClick / dispatchMouseClick
//     writes the active tooltip index then synchronously dispatches the external
//     onClick handler, but the store write is not flushed before
//     externalEventsMiddleware reads store.state, so the handler receives the
//     stale (inactive) tooltip state instead of the golden value. Needs a src
//     flush() between the index write and the external-handler dispatch.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render } from "../helper/render";
import {
  BarChartCase,
  ComposedChartCase,
  ScatterChartCase,
} from "../helper/parameterizedTestCases";
import { assertNotNull } from "../helper/assertNotNull";

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
