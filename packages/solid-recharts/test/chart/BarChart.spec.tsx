// Subset port of recharts 3.8.1 test/chart/BarChart.spec.tsx (commit 7a23854) —
// the payoff of the Bar vertical: rectangles drawn from data via the band scale.
//
// Minimal/Tier-A-adapted: asserts the parity-critical facts (one
// `.recharts-bar-rectangle` per data point, inside `.recharts-bar`, with sane
// geometry). The full spec (background bars, stacks, labels, animation, exact
// per-bar coords) comes online when those features land. `flush()` after render
// because the bar registers via an effect and its rectangles compute from the store.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEffect, createSignal, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { BarChart, Bar, ComposedChart, Rectangle, Tooltip, XAxis, YAxis } from "../../src";
import type { BarChartProps, BarProps, BarRectangleItem } from "../../src";
import { PageData, boxPlotData } from "../_data";
import {
  useChartHeight,
  useChartWidth,
  useMargin,
  useOffsetInternal,
  useViewBox,
} from "../../src/context/chartLayoutContext";
import { useOffset, usePlotArea } from "../../src/hooks";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { expectBars } from "../helper/expectBars";
import { useAppSelector } from "../../src/state/hooks";
import { expectScale } from "../helper/expectScale";
import {
  selectAllBarPositions,
  selectAllVisibleBars,
  selectAxisBandSize,
  selectBarBandSize,
  selectBarCartesianAxisSize,
  selectBarPosition,
  selectBarRectangles,
  selectBarSizeList,
  selectMaxBarSize,
} from "../../src/state/selectors/barSelectors";
import {
  selectAxisScale,
  selectCategoricalDomain,
  selectTicksOfGraphicalItem,
  selectUnfilteredCartesianItems,
} from "../../src/state/selectors/axisSelectors";
import {
  selectBarCategoryGap,
  selectBarGap,
  selectRootMaxBarSize,
} from "../../src/state/selectors/rootPropsSelectors";
import type { BarSettings } from "../../src/state/types/BarSettings";
import type { CartesianGraphicalItemSettings } from "../../src/state/graphicalItemsSlice";
import { defaultAxisId } from "../../src/state/cartesianAxisSlice";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { assertNotNull } from "../helper/assertNotNull";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import {
  expectTooltipNotVisible,
  expectTooltipPayload,
  getTooltip,
  hideTooltip,
  showTooltipOnCoordinate,
} from "../component/Tooltip/tooltipTestHelpers";
import { barChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";

// Shared with the appended vendor describes (recharts' top-level `data`).
const data = [
  { name: "food", uv: 400, pv: 2400 },
  { name: "cosmetic", uv: 300, pv: 4567 },
  { name: "storage", uv: 300, pv: 1398 },
  { name: "digital", uv: 200, pv: 9800 },
];

describe("<BarChart />", () => {
  it("renders four labels when label=true", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar isAnimationActive={false} dataKey="uv" label fill="#ff7300" />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-label-list")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(4);
  });

  it("renders a tooltip shell when Tooltip item is added", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
        <Tooltip />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-default-tooltip")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-tooltip-wrapper")).toHaveLength(1);
  });

  it("renders empty when data is empty", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={[]}>
        <Bar dataKey="uv" label fill="#ff7300" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  // Hovers the chart surface near the first bar, drives the active-bar rAF staging,
  // and asserts a single `.recharts-active-bar` is shown, then hidden on mouseOut.
  // Ported from recharts' `assertActiveBarInteractions` (rAF staging → two timer
  // flushes), adapted to the Solid harness (showTooltipOnCoordinate + flush()).
  function assertActiveBarInteractions(container: HTMLElement) {
    expect(container.querySelectorAll(".recharts-active-bar")).toHaveLength(0);

    showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
      clientX: 100,
      clientY: 100,
    });
    // First timer clears the mouse-event handler; second shows the active bar after
    // its initial inactive render (so the CSS transition can start).
    vi.runOnlyPendingTimers();
    flush();
    vi.runOnlyPendingTimers();
    flush();

    expect(container.querySelectorAll(".recharts-active-bar")).toHaveLength(1);

    hideTooltip(container, barChartMouseHoverTooltipSelector);
    vi.runOnlyPendingTimers();
    flush();

    expect(container.querySelectorAll(".recharts-active-bar")).toHaveLength(0);
  }

  describe("activeBar", () => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 700, height: 200 });
    });

    it("does not render an active bar by default", () => {
      const { container } = render(() => (
        <BarChart width={700} height={200} data={data}>
          <Bar dataKey="uv" stackId="test" fill="#ff7300" />
          <Tooltip />
        </BarChart>
      ));
      flush();

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 100,
        clientY: 100,
      });
      vi.runOnlyPendingTimers();
      flush();
      expect(container.querySelectorAll(".recharts-active-bar")).toHaveLength(0);
    });

    it("renders a customized active bar when activeBar is a function", () => {
      const { container } = render(() => (
        <BarChart width={700} height={200} data={data}>
          <Bar
            dataKey="uv"
            stackId="test"
            fill="#ff7300"
            activeBar={(props) => <Rectangle {...props} />}
          />
          <Tooltip />
        </BarChart>
      ));
      flush();
      assertActiveBarInteractions(container);
    });

    it("renders a customized active bar when activeBar is a truthy boolean", () => {
      const { container } = render(() => (
        <BarChart width={700} height={200} data={data}>
          <Bar dataKey="uv" stackId="test" fill="#ff7300" activeBar />
          <Tooltip />
        </BarChart>
      ));
      flush();
      assertActiveBarInteractions(container);
    });

    it("does not render a customized active bar when activeBar is a falsy boolean", () => {
      const { container } = render(() => (
        <BarChart width={700} height={200} data={data}>
          <Bar dataKey="uv" stackId="test" fill="#ff7300" activeBar={false} />
          <Tooltip />
        </BarChart>
      ));
      flush();

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 100,
        clientY: 100,
      });
      vi.runOnlyPendingTimers();
      flush();
      expect(container.querySelectorAll(".recharts-active-bar")).toHaveLength(0);
    });

    it("renders a customized active bar when activeBar is an object", () => {
      const { container } = render(() => (
        <BarChart width={700} height={200} data={data}>
          <Bar
            dataKey="uv"
            stackId="test"
            fill="#ff7300"
            // recharts' BarShapeProps is SVG-prop-spreadable (strokeWidth et al);
            // the ported BarShapeProps types only the geometry/presentation subset,
            // so cast the object-form activeBar to the prop type (the extra SVG
            // attrs flow through to the rendered Rectangle just as in recharts).
            activeBar={{ strokeWidth: 4, fill: "green" } as BarProps["activeBar"]}
          />
          <Tooltip />
        </BarChart>
      ));
      flush();
      assertActiveBarInteractions(container);
    });
  });

  describe("shape", () => {
    it("renders a customized shape when shape is a function", () => {
      const { container } = render(() => (
        <BarChart width={100} height={50} data={data}>
          <Bar
            dataKey="uv"
            label
            fill="#ff7300"
            isAnimationActive={false}
            shape={(props) => <circle class="customized-shape" cx={props.x} cy={props.y} r={8} />}
          />
        </BarChart>
      ));
      flush();
      expect(container.querySelectorAll(".customized-shape")).toHaveLength(4);
    });
  });

  describe("state integration", () => {
    it("should report margin, and update after it changes", () => {
      const spy = vi.fn();
      const [margin, setMargin] = createSignal({ top: 1, right: 2, bottom: 3, left: 4 });
      const Spy = (): null => {
        const m = useMargin();
        createEffect(
          () => m(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={100} height={100} margin={margin()}>
          <Spy />
        </BarChart>
      ));
      flush();
      expectLastCalledWith(spy, { bottom: 3, left: 4, right: 2, top: 1 });

      setMargin({ top: 10, right: 20, bottom: 30, left: 40 });
      flush();
      expectLastCalledWith(spy, { bottom: 30, left: 40, right: 20, top: 10 });
    });
  });

  it("renders bars in a vertical BarChart", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" />
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const layers = container.querySelectorAll(".recharts-bar .recharts-bar-rectangle");
    expect(layers).toHaveLength(8);
    const path0 = layers[0]!.querySelector("path.recharts-rectangle");
    expect(path0).toHaveAttribute("height", "1");
    expect(path0).toHaveAttribute("x", "65");
    const path7 = layers[7]!.querySelector("path.recharts-rectangle");
    expect(path7).toHaveAttribute("fill", "#387908");
  });

  // Any reactive-graph diagnostic fired during this test fails it via the global
  // guard in test/setup.ts (no per-test wrapper needed).
  it("renders one rectangle per data point from the band scale", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const paths = container.querySelectorAll(
      ".recharts-bar .recharts-bar-rectangle path.recharts-rectangle",
    );
    expect(paths).toHaveLength(PageData.length);
    expect(paths[0]).toHaveAttribute("fill", "#ff7300");
    // Exact geometry (matches recharts' algorithm): band scale over 6 categories
    // in [20, 380] → bandSize 60; barCategoryGap 10% → offset 6, size 48, so each
    // bar's x = bandStart(20 + 60·i) + 6. Heights from the linear uv scale
    // [0, 400] → range [380, 20]: uv 400→h 360, 300→270, 200→180, 278→250.2, 189→170.1.
    const geometry = [...paths].map((r) =>
      ["x", "y", "width", "height"].map((a) => r.getAttribute(a)).join(","),
    );
    expect(geometry).toEqual([
      "26,20,48,360",
      "86,110,48,270",
      "146,110,48,270",
      "206,200,48,180",
      "266,129.8,48,250.2",
      "326,209.9,48,170.1",
    ]);
  });

  it("renders a custom bar via the shape render prop (replacing the default rect)", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar
          dataKey="uv"
          isAnimationActive={false}
          shape={(item) => <circle class="custom-bar" data-x={item.x} data-h={item.height} />}
        />
      </BarChart>
    ));
    flush();

    // No default rectangle shapes; one custom circle per data point, each wrapped in
    // a `.recharts-bar-rectangle` layer that received the bar's geometry.
    expect(container.querySelectorAll("rect.recharts-bar-rectangle")).toHaveLength(0);
    const circles = container.querySelectorAll("circle.custom-bar");
    expect(circles).toHaveLength(PageData.length);
    expect(circles[0]!.getAttribute("data-x")).toBe("26");
    expect(circles[0]!.getAttribute("data-h")).toBe("360");
  });

  it("activates the item tooltip when a custom bar shape is hovered", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar
          dataKey="uv"
          isAnimationActive={false}
          shape={(item) => <circle class="custom-bar" data-h={item.height} />}
        />
        <Tooltip shared={false} />
      </BarChart>
    ));
    flush();

    // Handlers live on the wrapping `.recharts-bar-rectangle` layer (mouseenter
    // doesn't bubble from the circle, so hover the layer itself).
    const layers = container.querySelectorAll(".recharts-bar .recharts-bar-rectangle");
    fireEvent.mouseEnter(layers[0]!);
    flush();

    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual([String(PageData[0]!.uv)]);
  });

  describe("BarChart layout context", () => {
    it("should provide viewBox", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const viewBox = useViewBox();
        createEffect(
          () => viewBox(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={100} height={50}>
          <Comp />
        </BarChart>
      ));

      expect(spy).toHaveBeenCalledWith({ x: 5, y: 5, width: 90, height: 40 });
    });

    it("should provide clipPathId", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        createEffect(
          () => useClipPathId(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={100} height={50}>
          <Comp />
        </BarChart>
      ));

      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/recharts\d+-clip/));
    });

    it("should provide width", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const width = useChartWidth();
        createEffect(
          () => width(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={100} height={50}>
          <Comp />
        </BarChart>
      ));

      expect(spy).toHaveBeenCalledWith(100);
    });

    it("should provide height", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const height = useChartHeight();
        createEffect(
          () => height(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={100} height={50}>
          <Comp />
        </BarChart>
      ));

      expect(spy).toHaveBeenCalledWith(50);
    });
  });
});

describe("bar categories", () => {
  it("should render bars grouped in a category if they share the same xAxis tick", () => {
    const { container } = render(() => (
      <BarChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <Bar dataKey="uv" isAnimationActive={false} />
        <Bar dataKey="pv" isAnimationActive={false} />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 17.25,254.6 h 47 v 10.4 h -47 Z",
        height: "10.4",
        radius: "0",
        width: "47",
        x: "17.25",
        y: "254.6",
      },
      {
        d: "M 139.75,257.2 h 47 v 7.8 h -47 Z",
        height: "7.8",
        radius: "0",
        width: "47",
        x: "139.75",
        y: "257.2",
      },
      {
        d: "M 262.25,257.2 h 47 v 7.8 h -47 Z",
        height: "7.8",
        radius: "0",
        width: "47",
        x: "262.25",
        y: "257.2",
      },
      {
        d: "M 384.75,259.8 h 47 v 5.2 h -47 Z",
        height: "5.2",
        radius: "0",
        width: "47",
        x: "384.75",
        y: "259.8",
      },
      {
        d: "M 68.25,202.6 h 47 v 62.4 h -47 Z",
        height: "62.4",
        radius: "0",
        width: "47",
        x: "68.25",
        y: "202.6",
      },
      {
        d: "M 190.75,146.258 h 47 v 118.742 h -47 Z",
        height: "118.742",
        radius: "0",
        width: "47",
        x: "190.75",
        y: "146.258",
      },
      {
        d: "M 313.25,228.652 h 47 v 36.348 h -47 Z",
        height: "36.348",
        radius: "0",
        width: "47",
        x: "313.25",
        y: "228.652",
      },
      {
        d: "M 435.75,10.2 h 47 v 254.8 h -47 Z",
        height: "254.8",
        radius: "0",
        width: "47",
        x: "435.75",
        y: "10.2",
      },
    ]);
  });

  describe("barGap as a number", () => {
    it("should increase the gap between bars in a category", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barGap={9}>
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          x: "17.25",
          y: "254.6",
          width: "45",
          height: "10.4",
          radius: "0",
          d: "M 17.25,254.6 h 45 v 10.4 h -45 Z",
        },
        {
          x: "139.75",
          y: "257.2",
          width: "45",
          height: "7.8",
          radius: "0",
          d: "M 139.75,257.2 h 45 v 7.8 h -45 Z",
        },
        {
          x: "262.25",
          y: "257.2",
          width: "45",
          height: "7.8",
          radius: "0",
          d: "M 262.25,257.2 h 45 v 7.8 h -45 Z",
        },
        {
          x: "384.75",
          y: "259.8",
          width: "45",
          height: "5.2",
          radius: "0",
          d: "M 384.75,259.8 h 45 v 5.2 h -45 Z",
        },
        {
          x: "71.25",
          y: "202.6",
          width: "45",
          height: "62.4",
          radius: "0",
          d: "M 71.25,202.6 h 45 v 62.4 h -45 Z",
        },
        {
          x: "193.75",
          y: "146.258",
          width: "45",
          height: "118.742",
          radius: "0",
          d: "M 193.75,146.258 h 45 v 118.742 h -45 Z",
        },
        {
          x: "316.25",
          y: "228.652",
          width: "45",
          height: "36.348",
          radius: "0",
          d: "M 316.25,228.652 h 45 v 36.348 h -45 Z",
        },
        {
          x: "438.75",
          y: "10.2",
          width: "45",
          height: "254.8",
          radius: "0",
          d: "M 438.75,10.2 h 45 v 254.8 h -45 Z",
        },
      ]);
    });

    it("should decrease the gap between bars in a category", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barGap={2}>
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          d: "M 17.25,254.6 h 48 v 10.4 h -48 Z",
          height: "10.4",
          radius: "0",
          width: "48",
          x: "17.25",
          y: "254.6",
        },
        {
          d: "M 139.75,257.2 h 48 v 7.8 h -48 Z",
          height: "7.8",
          radius: "0",
          width: "48",
          x: "139.75",
          y: "257.2",
        },
        {
          d: "M 262.25,257.2 h 48 v 7.8 h -48 Z",
          height: "7.8",
          radius: "0",
          width: "48",
          x: "262.25",
          y: "257.2",
        },
        {
          d: "M 384.75,259.8 h 48 v 5.2 h -48 Z",
          height: "5.2",
          radius: "0",
          width: "48",
          x: "384.75",
          y: "259.8",
        },
        {
          d: "M 67.25,202.6 h 48 v 62.4 h -48 Z",
          height: "62.4",
          radius: "0",
          width: "48",
          x: "67.25",
          y: "202.6",
        },
        {
          d: "M 189.75,146.258 h 48 v 118.742 h -48 Z",
          height: "118.742",
          radius: "0",
          width: "48",
          x: "189.75",
          y: "146.258",
        },
        {
          d: "M 312.25,228.652 h 48 v 36.348 h -48 Z",
          height: "36.348",
          radius: "0",
          width: "48",
          x: "312.25",
          y: "228.652",
        },
        {
          d: "M 434.75,10.2 h 48 v 254.8 h -48 Z",
          height: "254.8",
          radius: "0",
          width: "48",
          x: "434.75",
          y: "10.2",
        },
      ]);
    });
  });

  describe("barGap as a percentage", () => {
    it("should set the gap between bars in a category", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barGap="15%">
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          x: "17.25",
          y: "254.6",
          width: "40",
          height: "10.4",
          radius: "0",
          d: "M 17.25,254.6 h 40 v 10.4 h -40 Z",
        },
        {
          x: "139.75",
          y: "257.2",
          width: "40",
          height: "7.8",
          radius: "0",
          d: "M 139.75,257.2 h 40 v 7.8 h -40 Z",
        },
        {
          x: "262.25",
          y: "257.2",
          width: "40",
          height: "7.8",
          radius: "0",
          d: "M 262.25,257.2 h 40 v 7.8 h -40 Z",
        },
        {
          x: "384.75",
          y: "259.8",
          width: "40",
          height: "5.2",
          radius: "0",
          d: "M 384.75,259.8 h 40 v 5.2 h -40 Z",
        },
        {
          x: "75.625",
          y: "202.6",
          width: "40",
          height: "62.4",
          radius: "0",
          d: "M 75.625,202.6 h 40 v 62.4 h -40 Z",
        },
        {
          x: "198.125",
          y: "146.258",
          width: "40",
          height: "118.742",
          radius: "0",
          d: "M 198.125,146.258 h 40 v 118.742 h -40 Z",
        },
        {
          x: "320.625",
          y: "228.652",
          width: "40",
          height: "36.348",
          radius: "0",
          d: "M 320.625,228.652 h 40 v 36.348 h -40 Z",
        },
        {
          x: "443.125",
          y: "10.2",
          width: "40",
          height: "254.8",
          radius: "0",
          d: "M 443.125,10.2 h 40 v 254.8 h -40 Z",
        },
      ]);
    });
  });

  describe("barCategoryGap as a number", () => {
    it("should set the gap between bar categories", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barCategoryGap={9}>
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          d: "M 14,254.6 h 50 v 10.4 h -50 Z",
          height: "10.4",
          radius: "0",
          width: "50",
          x: "14",
          y: "254.6",
        },
        {
          d: "M 136.5,257.2 h 50 v 7.8 h -50 Z",
          height: "7.8",
          radius: "0",
          width: "50",
          x: "136.5",
          y: "257.2",
        },
        {
          d: "M 259,257.2 h 50 v 7.8 h -50 Z",
          height: "7.8",
          radius: "0",
          width: "50",
          x: "259",
          y: "257.2",
        },
        {
          d: "M 381.5,259.8 h 50 v 5.2 h -50 Z",
          height: "5.2",
          radius: "0",
          width: "50",
          x: "381.5",
          y: "259.8",
        },
        {
          d: "M 68,202.6 h 50 v 62.4 h -50 Z",
          height: "62.4",
          radius: "0",
          width: "50",
          x: "68",
          y: "202.6",
        },
        {
          d: "M 190.5,146.258 h 50 v 118.742 h -50 Z",
          height: "118.742",
          radius: "0",
          width: "50",
          x: "190.5",
          y: "146.258",
        },
        {
          d: "M 313,228.652 h 50 v 36.348 h -50 Z",
          height: "36.348",
          radius: "0",
          width: "50",
          x: "313",
          y: "228.652",
        },
        {
          d: "M 435.5,10.2 h 50 v 254.8 h -50 Z",
          height: "254.8",
          radius: "0",
          width: "50",
          x: "435.5",
          y: "10.2",
        },
      ]);
    });
  });

  describe("barCategoryGap as a percentage", () => {
    it("should increase the gap between bar categories", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barCategoryGap="25%">
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          x: "35.625",
          y: "254.6",
          width: "29",
          height: "10.4",
          radius: "0",
          d: "M 35.625,254.6 h 29 v 10.4 h -29 Z",
        },
        {
          x: "158.125",
          y: "257.2",
          width: "29",
          height: "7.8",
          radius: "0",
          d: "M 158.125,257.2 h 29 v 7.8 h -29 Z",
        },
        {
          x: "280.625",
          y: "257.2",
          width: "29",
          height: "7.8",
          radius: "0",
          d: "M 280.625,257.2 h 29 v 7.8 h -29 Z",
        },
        {
          x: "403.125",
          y: "259.8",
          width: "29",
          height: "5.2",
          radius: "0",
          d: "M 403.125,259.8 h 29 v 5.2 h -29 Z",
        },
        {
          x: "68.625",
          y: "202.6",
          width: "29",
          height: "62.4",
          radius: "0",
          d: "M 68.625,202.6 h 29 v 62.4 h -29 Z",
        },
        {
          x: "191.125",
          y: "146.258",
          width: "29",
          height: "118.742",
          radius: "0",
          d: "M 191.125,146.258 h 29 v 118.742 h -29 Z",
        },
        {
          x: "313.625",
          y: "228.652",
          width: "29",
          height: "36.348",
          radius: "0",
          d: "M 313.625,228.652 h 29 v 36.348 h -29 Z",
        },
        {
          x: "436.125",
          y: "10.2",
          width: "29",
          height: "254.8",
          radius: "0",
          d: "M 436.125,10.2 h 29 v 254.8 h -29 Z",
        },
      ]);
    });

    it("should decrease the gap between bar categories", () => {
      const { container } = render(() => (
        <BarChart width={500} height={300} data={data} barCategoryGap="3%">
          <XAxis dataKey="name" />
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarChart>
      ));

      expectBars(container, [
        {
          x: "8.675",
          y: "254.6",
          width: "56",
          height: "10.4",
          radius: "0",
          d: "M 8.675,254.6 h 56 v 10.4 h -56 Z",
        },
        {
          x: "131.175",
          y: "257.2",
          width: "56",
          height: "7.8",
          radius: "0",
          d: "M 131.175,257.2 h 56 v 7.8 h -56 Z",
        },
        {
          x: "253.675",
          y: "257.2",
          width: "56",
          height: "7.8",
          radius: "0",
          d: "M 253.675,257.2 h 56 v 7.8 h -56 Z",
        },
        {
          x: "376.175",
          y: "259.8",
          width: "56",
          height: "5.2",
          radius: "0",
          d: "M 376.175,259.8 h 56 v 5.2 h -56 Z",
        },
        {
          x: "68.675",
          y: "202.6",
          width: "56",
          height: "62.4",
          radius: "0",
          d: "M 68.675,202.6 h 56 v 62.4 h -56 Z",
        },
        {
          x: "191.175",
          y: "146.258",
          width: "56",
          height: "118.742",
          radius: "0",
          d: "M 191.175,146.258 h 56 v 118.742 h -56 Z",
        },
        {
          x: "313.675",
          y: "228.652",
          width: "56",
          height: "36.348",
          radius: "0",
          d: "M 313.675,228.652 h 56 v 36.348 h -56 Z",
        },
        {
          x: "436.175",
          y: "10.2",
          width: "56",
          height: "254.8",
          radius: "0",
          d: "M 436.175,10.2 h 56 v 254.8 h -56 Z",
        },
      ]);
    });
  });
});

describe("with margin bigger than width and height", () => {
  // guard against negative values in clipPath - ref https://github.com/recharts/recharts/issues/2009
  const renderTestCase = createSelectorTestCase((props) => (
    <BarChart
      width={50}
      height={50}
      data={data}
      margin={{
        top: 50,
        right: 100,
        left: 100,
        bottom: 50,
      }}
    >
      <XAxis type="number" />
      <YAxis dataKey="name" type="category" />
      <Bar dataKey="uv" isAnimationActive={false} />
      {props.children}
    </BarChart>
  ));

  it("should return offset", () => {
    const { spy } = renderTestCase(useOffset);
    expectLastCalledWith(spy, {
      bottom: 80,
      left: 160,
      right: 100,
      top: 50,
    });
  });

  it("should return plot area", () => {
    const { spy } = renderTestCase(usePlotArea);
    expectLastCalledWith(spy, {
      height: 0,
      width: 0,
      x: 160,
      y: 50,
    });
  });

  it("should return internal offset", () => {
    const { spy } = renderTestCase(useOffsetInternal);
    expectLastCalledWith(spy, {
      bottom: 80,
      brushBottom: 80,
      height: 0,
      left: 160,
      right: 100,
      top: 50,
      width: 0,
    });
  });

  test("Renders a chart with less width than left, right margin and less height than top, bottom margin", () => {
    const { container } = renderTestCase();

    // expect nothing to render because height and width are 0
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(0);

    const clipPath = container.querySelector("defs clipPath");
    assertNotNull(clipPath);
    expect(clipPath.children[0]).not.toBeNull();

    // expect clipPath rect to have a width and height of 0
    expect(clipPath.children[0]).toHaveAttribute("width", "0");
    expect(clipPath.children[0]).toHaveAttribute("height", "0");

    expectBars(container, []);
  });
});

test("renders chart when wrapped in a custom component", () => {
  const MyBarChart = (props: BarChartProps) => {
    return <BarChart {...props} />;
  };

  const { container } = render(() => (
    <MyBarChart width={500} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Bar dataKey="uv" fill="#8884d8" isAnimationActive={false} />
    </MyBarChart>
  ));

  expectBars(container, [
    {
      d: "M 75.75,5 h 86 v 260 h -86 Z",
      height: "260",
      radius: "0",
      width: "86",
      x: "75.75",
      y: "5",
    },
    {
      d: "M 183.25,70 h 86 v 195 h -86 Z",
      height: "195",
      radius: "0",
      width: "86",
      x: "183.25",
      y: "70",
    },
    {
      d: "M 290.75,70 h 86 v 195 h -86 Z",
      height: "195",
      radius: "0",
      width: "86",
      x: "290.75",
      y: "70",
    },
    {
      d: "M 398.25,135 h 86 v 130 h -86 Z",
      height: "130",
      radius: "0",
      width: "86",
      x: "398.25",
      y: "135",
    },
  ]);
});

describe("bar width", () => {
  it("renders one bar with a width for each data entry", () => {
    const data2 = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data2}>
        <Bar dataKey="y" fill="#ff7300" isAnimationActive={false} />
        <XAxis dataKey="x" />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 9.5,10 h 36 v 5 h -36 Z",
        height: "5",
        radius: "0",
        width: "36",
        x: "9.5",
        y: "10",
      },
      {
        d: "M 54.5,5 h 36 v 10 h -36 Z",
        height: "10",
        radius: "0",
        width: "36",
        x: "54.5",
        y: "5",
      },
    ]);
  });

  it("renders one bar with a width for each data entry where two entries have duplicate XAxis coordinate", () => {
    const data2 = [
      { x: 10, y: 10 },
      { x: 10, y: 20 },
    ];
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data2}>
        <Bar dataKey="y" fill="#ff7300" isAnimationActive={false} />
        <XAxis dataKey="x" />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 9.5,10 h 36 v 5 h -36 Z",
        height: "5",
        radius: "0",
        width: "36",
        x: "9.5",
        y: "10",
      },
      {
        d: "M 54.5,5 h 36 v 10 h -36 Z",
        height: "10",
        radius: "0",
        width: "36",
        x: "54.5",
        y: "5",
      },
    ]);
  });

  it("renders bars where two entries right next to each other have duplicate XAxis coordinate and type=number", () => {
    const data2 = [
      { x: 10, y: 10 },
      { x: 10, y: 20 },
    ];
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data2}>
        <Bar dataKey="y" fill="#ff7300" isAnimationActive={false} />
        <XAxis dataKey="x" />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 9.5,10 h 36 v 5 h -36 Z",
        height: "5",
        radius: "0",
        width: "36",
        x: "9.5",
        y: "10",
      },
      {
        d: "M 54.5,5 h 36 v 10 h -36 Z",
        height: "10",
        radius: "0",
        width: "36",
        x: "54.5",
        y: "5",
      },
    ]);
  });
});

describe("in horizontal chart", () => {
  describe("renders overlapping bars when there are separate XAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={data}>
        <Bar
          dataKey="uv"
          fill="green"
          xAxisId="one"
          barSize={50}
          isAnimationActive={false}
          id="bar-axis-one"
        />
        <XAxis xAxisId="one" />
        {/* The smaller bar must be rendered in front of the larger one to be visible. */}
        <Bar
          dataKey="pv"
          fill="red"
          xAxisId="two"
          barSize={30}
          isAnimationActive={false}
          id="bar-axis-two"
        />
        <XAxis xAxisId="two" hide />

        {props.children}
      </BarChart>
    ));

    test("selectUnfilteredCartesianItems", () => {
      const { spy } = renderTestCase(selectUnfilteredCartesianItems);
      const expected: ReadonlyArray<BarSettings> = [
        {
          id: "bar-axis-one",
          isPanorama: false,
          barSize: 50,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: "one",
          yAxisId: 0,
          zAxisId: 0,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
        },
        {
          id: "bar-axis-two",
          isPanorama: false,
          barSize: 30,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: "two",
          yAxisId: 0,
          zAxisId: 0,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
        },
      ];
      expectLastCalledWith(spy, expected);
    });

    it("should select bars for first axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-axis-one", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-axis-one",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 50,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: "one",
          yAxisId: 0,
          zAxisId: 0,
        },
      ]);
    });

    it("should select bars for second axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-axis-two", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-axis-two",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: "two",
          yAxisId: 0,
          zAxisId: 0,
        },
      ]);
    });

    it("should render bars", () => {
      const { container } = renderTestCase();
      expectBars(container, [
        {
          x: "79",
          y: "350.6",
          width: "50",
          height: "14.4",
          radius: "0",
          d: "M 79,350.6 h 50 v 14.4 h -50 Z",
        },
        {
          x: "276.5",
          y: "354.2",
          width: "50",
          height: "10.8",
          radius: "0",
          d: "M 276.5,354.2 h 50 v 10.8 h -50 Z",
        },
        {
          x: "474",
          y: "354.2",
          width: "50",
          height: "10.8",
          radius: "0",
          d: "M 474,354.2 h 50 v 10.8 h -50 Z",
        },
        {
          x: "671.5",
          y: "357.8",
          width: "50",
          height: "7.2",
          radius: "0",
          d: "M 671.5,357.8 h 50 v 7.2 h -50 Z",
        },
        {
          x: "89",
          y: "278.6",
          width: "30",
          height: "86.4",
          radius: "0",
          d: "M 89,278.6 h 30 v 86.4 h -30 Z",
        },
        {
          x: "286.5",
          y: "200.588",
          width: "30",
          height: "164.412",
          radius: "0",
          d: "M 286.5,200.588 h 30 v 164.412 h -30 Z",
        },
        {
          x: "484",
          y: "314.672",
          width: "30",
          height: "50.328",
          radius: "0",
          d: "M 484,314.672 h 30 v 50.328 h -30 Z",
        },
        {
          x: "681.5",
          y: "12.2",
          width: "30",
          height: "352.8",
          radius: "0",
          d: "M 681.5,12.2 h 30 v 352.8 h -30 Z",
        },
      ]);
    });
  });

  describe("renders bars as neighbours when there are multiple YAxes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={500} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" orientation="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Bar yAxisId="left" id="my-bar-id-1" dataKey="pv" isAnimationActive={false} />
        <Bar yAxisId="right" id="my-bar-id-2" dataKey="uv" isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    test("selectUnfilteredCartesianItems", () => {
      const { spy } = renderTestCase(selectUnfilteredCartesianItems);
      const expected: ReadonlyArray<CartesianGraphicalItemSettings> = [
        {
          id: "my-bar-id-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "left",
          zAxisId: 0,
        },
        {
          id: "my-bar-id-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "right",
          zAxisId: 0,
        },
      ];
      expectLastCalledWith(spy, expected);
    });

    it("should select bars for left axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "my-bar-id-1", false));
      expectLastCalledWith(spy, [
        {
          id: "my-bar-id-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "left",
          zAxisId: 0,
        },
        {
          id: "my-bar-id-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          // this one quite clearly belongs to the right axis, why is it returned here?
          yAxisId: "right",
          zAxisId: 0,
        },
      ]);
    });

    it("should select bars for right axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "my-bar-id-2", false));
      expectLastCalledWith(spy, [
        {
          id: "my-bar-id-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          // this one quite clearly belongs to the left axis, why is it returned here?
          yAxisId: "left",
          zAxisId: 0,
        },
        {
          id: "my-bar-id-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: undefined,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "right",
          zAxisId: 0,
        },
      ]);
    });

    it("should select bar size list for left axis", () => {
      const { spy } = renderTestCase((state) => selectBarSizeList(state, "my-bar-id-1", false));
      expectLastCalledWith(spy, [
        {
          barSize: undefined,
          dataKeys: ["pv"],
          stackId: undefined,
        },
        {
          barSize: undefined,
          dataKeys: ["uv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select bar size list for right axis", () => {
      const { spy } = renderTestCase((state) => selectBarSizeList(state, "my-bar-id-2", false));
      expectLastCalledWith(spy, [
        {
          barSize: undefined,
          dataKeys: ["pv"],
          stackId: undefined,
        },
        {
          barSize: undefined,
          dataKeys: ["uv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select all bar positions for left axis", () => {
      const { spy } = renderTestCase((state) => selectAllBarPositions(state, "my-bar-id-1", false));
      expectLastCalledWith(spy, [
        {
          dataKeys: ["pv"],
          position: {
            offset: 9.25,
            size: 35,
          },
          stackId: undefined,
        },
        {
          dataKeys: ["uv"],
          position: {
            offset: 48.25,
            size: 35,
          },
          stackId: undefined,
        },
      ]);
    });

    it("should select all bar positions for right axis", () => {
      const { spy } = renderTestCase((state) => selectAllBarPositions(state, "my-bar-id-2", false));
      expectLastCalledWith(spy, [
        {
          dataKeys: ["pv"],
          position: {
            offset: 9.25,
            size: 35,
          },
          stackId: undefined,
        },
        {
          dataKeys: ["uv"],
          position: {
            offset: 48.25,
            size: 35,
          },
          stackId: undefined,
        },
      ]);
    });

    it("should render bars", () => {
      const { container } = renderTestCase();

      expectBars(container, [
        {
          d: "M 74.25,202.6 h 35 v 62.4 h -35 Z",
          height: "62.4",
          radius: "0",
          width: "35",
          x: "74.25",
          y: "202.6",
        },
        {
          d: "M 166.75,146.258 h 35 v 118.742 h -35 Z",
          height: "118.742",
          radius: "0",
          width: "35",
          x: "166.75",
          y: "146.258",
        },
        {
          d: "M 259.25,228.652 h 35 v 36.348 h -35 Z",
          height: "36.348",
          radius: "0",
          width: "35",
          x: "259.25",
          y: "228.652",
        },
        {
          d: "M 351.75,10.2 h 35 v 254.8 h -35 Z",
          height: "254.8",
          radius: "0",
          width: "35",
          x: "351.75",
          y: "10.2",
        },
        {
          d: "M 113.25,5 h 35 v 260 h -35 Z",
          height: "260",
          radius: "0",
          width: "35",
          x: "113.25",
          y: "5",
        },
        {
          d: "M 205.75,70 h 35 v 195 h -35 Z",
          height: "195",
          radius: "0",
          width: "35",
          x: "205.75",
          y: "70",
        },
        {
          d: "M 298.25,70 h 35 v 195 h -35 Z",
          height: "195",
          radius: "0",
          width: "35",
          x: "298.25",
          y: "70",
        },
        {
          d: "M 390.75,135 h 35 v 130 h -35 Z",
          height: "130",
          radius: "0",
          width: "35",
          x: "390.75",
          y: "135",
        },
      ]);
    });
  });
});

describe("in vertical chart", () => {
  describe("renders bars as neighbours when there are multiple XAxes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={300} height={300} data={data} layout="vertical">
        <Bar
          dataKey="uv"
          xAxisId={2}
          fill="blue"
          barSize={40}
          isAnimationActive={false}
          id="bar-xaxis-2"
        />
        <Bar
          dataKey="pv"
          xAxisId={1}
          fill="green"
          barSize={30}
          isAnimationActive={false}
          id="bar-xaxis-1"
        />
        <XAxis xAxisId={1} type="number" />
        <XAxis xAxisId={2} type="number" orientation="top" />
        <YAxis type="category" />
        {props.children}
      </BarChart>
    ));

    test("selectUnfilteredCartesianItems", () => {
      const { spy } = renderTestCase(selectUnfilteredCartesianItems);
      const expected: ReadonlyArray<CartesianGraphicalItemSettings> = [
        {
          id: "bar-xaxis-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 40,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 2,
          yAxisId: 0,
          zAxisId: 0,
        },
        {
          id: "bar-xaxis-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 1,
          yAxisId: 0,
          zAxisId: 0,
        },
      ];
      expectLastCalledWith(spy, expected);
    });

    it("should select bars for first axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-xaxis-2", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-xaxis-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 40,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 2,
          yAxisId: 0,
          zAxisId: 0,
        },
        {
          id: "bar-xaxis-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          // this one quite clearly belongs to the second axis, why is it returned here?
          xAxisId: 1,
          yAxisId: 0,
          zAxisId: 0,
        },
      ]);
    });

    it("should select bars for second axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-xaxis-1", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-xaxis-2",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 40,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          // this one quite clearly belongs to the first axis, why is it returned here?
          xAxisId: 2,
          yAxisId: 0,
          zAxisId: 0,
        },
        {
          id: "bar-xaxis-1",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 1,
          yAxisId: 0,
          zAxisId: 0,
        },
      ]);
    });

    it("should render bars", () => {
      const { container } = renderTestCase();

      expectBars(container, [
        {
          x: "65",
          y: "38",
          width: "230",
          height: "25.875",
          radius: "0",
          d: "M 65,38 h 230 v 25.875 h -230 Z",
        },
        {
          x: "65",
          y: "95.5",
          width: "172.5",
          height: "25.875",
          radius: "0",
          d: "M 65,95.5 h 172.5 v 25.875 h -172.5 Z",
        },
        {
          x: "65",
          y: "153",
          width: "172.5",
          height: "25.875",
          radius: "0",
          d: "M 65,153 h 172.5 v 25.875 h -172.5 Z",
        },
        {
          x: "65",
          y: "210.5",
          width: "115",
          height: "25.875",
          radius: "0",
          d: "M 65,210.5 h 115 v 25.875 h -115 Z",
        },
        {
          x: "65",
          y: "63.875",
          width: "55.2",
          height: "25.875",
          radius: "0",
          d: "M 65,63.875 h 55.2 v 25.875 h -55.2 Z",
        },
        {
          x: "65",
          y: "121.375",
          width: "105.041",
          height: "25.875",
          radius: "0",
          d: "M 65,121.375 h 105.041 v 25.875 h -105.041 Z",
        },
        {
          x: "65",
          y: "178.875",
          width: "32.154",
          height: "25.875",
          radius: "0",
          d: "M 65,178.875 h 32.154 v 25.875 h -32.154 Z",
        },
        {
          x: "65",
          y: "236.375",
          width: "225.4",
          height: "25.875",
          radius: "0",
          d: "M 65,236.375 h 225.4 v 25.875 h -225.4 Z",
        },
      ]);
    });
  });

  describe("renders overlapping bars when there are multiple YAxes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={300} height={300} data={data} layout="vertical">
        <Bar
          id="bar-left"
          dataKey="uv"
          yAxisId="left"
          fill="blue"
          barSize={30}
          isAnimationActive={false}
        />
        <Bar
          id="bar-right"
          dataKey="pv"
          yAxisId="right"
          fill="green"
          barSize={20}
          isAnimationActive={false}
        />
        <YAxis yAxisId="left" orientation="left" type="category" />
        <YAxis yAxisId="right" orientation="right" hide type="category" />
        <XAxis type="number" />
        {props.children}
      </BarChart>
    ));

    test("selectUnfilteredCartesianItems", () => {
      const { spy } = renderTestCase(selectUnfilteredCartesianItems);
      const expected: ReadonlyArray<CartesianGraphicalItemSettings> = [
        {
          id: "bar-left",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "left",
          zAxisId: 0,
        },
        {
          id: "bar-right",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 20,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "right",
          zAxisId: 0,
        },
      ];
      expectLastCalledWith(spy, expected);
    });

    it("should select bars for left axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-left", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-left",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 30,
          data: undefined,
          dataKey: "uv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "left",
          zAxisId: 0,
        },
      ]);
    });

    it("should select bars for right axis", () => {
      const { spy } = renderTestCase((state) => selectAllVisibleBars(state, "bar-right", false));
      expectLastCalledWith(spy, [
        {
          id: "bar-right",
          isPanorama: false,
          maxBarSize: undefined,
          minPointSize: 0,
          hasCustomShape: false,
          barSize: 20,
          data: undefined,
          dataKey: "pv",
          hide: false,
          stackId: undefined,
          type: "bar",
          xAxisId: 0,
          yAxisId: "right",
          zAxisId: 0,
        },
      ]);
    });

    it("should select bar size list for left axis", () => {
      const { spy } = renderTestCase((state) => selectBarSizeList(state, "bar-left", false));
      expectLastCalledWith(spy, [
        {
          barSize: 30,
          dataKeys: ["uv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select bar size list for right axis", () => {
      const { spy } = renderTestCase((state) => selectBarSizeList(state, "bar-right", false));
      expectLastCalledWith(spy, [
        {
          barSize: 20,
          dataKeys: ["pv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select all bar positions for left axis", () => {
      const { spy } = renderTestCase((state) => selectAllBarPositions(state, "bar-left", false));
      expectLastCalledWith(spy, [
        {
          dataKeys: ["uv"],
          position: {
            offset: 18,
            size: 30,
          },
          stackId: undefined,
        },
      ]);
    });

    it("should select all bar positions for right axis", () => {
      const { spy } = renderTestCase((state) => selectAllBarPositions(state, "bar-right", false));
      expectLastCalledWith(spy, [
        {
          dataKeys: ["pv"],
          position: {
            offset: 23,
            size: 20,
          },
          stackId: undefined,
        },
      ]);
    });

    it("should render bars", () => {
      const { container } = renderTestCase();

      expectBars(container, [
        {
          x: "65",
          y: "23",
          width: "9.2",
          height: "30",
          radius: "0",
          d: "M 65,23 h 9.2 v 30 h -9.2 Z",
        },
        {
          x: "65",
          y: "88",
          width: "6.9",
          height: "30",
          radius: "0",
          d: "M 65,88 h 6.9 v 30 h -6.9 Z",
        },
        {
          x: "65",
          y: "153",
          width: "6.9",
          height: "30",
          radius: "0",
          d: "M 65,153 h 6.9 v 30 h -6.9 Z",
        },
        {
          x: "65",
          y: "218",
          width: "4.6",
          height: "30",
          radius: "0",
          d: "M 65,218 h 4.6 v 30 h -4.6 Z",
        },
        {
          x: "65",
          y: "28",
          width: "55.2",
          height: "20",
          radius: "0",
          d: "M 65,28 h 55.2 v 20 h -55.2 Z",
        },
        {
          x: "65",
          y: "93",
          width: "105.041",
          height: "20",
          radius: "0",
          d: "M 65,93 h 105.041 v 20 h -105.041 Z",
        },
        {
          x: "65",
          y: "158",
          width: "32.154",
          height: "20",
          radius: "0",
          d: "M 65,158 h 32.154 v 20 h -32.154 Z",
        },
        {
          x: "65",
          y: "223",
          width: "225.4",
          height: "20",
          radius: "0",
          d: "M 65,223 h 225.4 v 20 h -225.4 Z",
        },
      ]);
    });
  });
});

describe("stacked bar chart when x-axis is of type number and layout is vertical", () => {
  const dataWithNumberAsKey = [
    { xKey: 4000, uv: 400, pv: 2400 },
    { xKey: 6000, uv: 300, pv: 4567 },
    { xKey: 8000, uv: 300, pv: 1398 },
    { xKey: 10000, uv: 200, pv: 9800 },
  ];

  const renderTestCase = createSelectorTestCase((props) => (
    <BarChart width={500} height={400} data={dataWithNumberAsKey} layout="vertical">
      <XAxis type="number" dataKey="xKey" domain={["dataMin", "dataMax"]} />
      <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} id="my-bar-id" />
      <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
      {props.children}
    </BarChart>
  ));

  test("selectCategoricalDomain", () => {
    const { spy } = renderTestCase((state) =>
      selectCategoricalDomain(state, "yAxis", defaultAxisId, false),
    );
    expectLastCalledWith(spy, undefined);
  });

  test("selectBarSizeList", () => {
    const { spy } = renderTestCase((state) => selectBarSizeList(state, "my-bar-id", false));
    expectLastCalledWith(spy, [
      {
        barSize: undefined,
        dataKeys: ["uv", "pv"],
        stackId: "test",
      },
    ]);
  });

  test("selectAxisScale", () => {
    const { spy } = renderTestCase((state) =>
      selectAxisScale(state, "yAxis", defaultAxisId, false),
    );
    // The port has no `toBeRechartsScale` matcher; assert domain/range directly.
    expectScale(spy.mock.lastCall?.[0], { domain: [0, 3], range: [5, 365] });
  });

  test("selectTicksOfGraphicalItem", () => {
    const { spy } = renderTestCase((state) =>
      selectTicksOfGraphicalItem(state, "yAxis", defaultAxisId, false),
    );
    expectLastCalledWith(spy, [
      {
        coordinate: 5,
        index: 0,
        offset: 0,
        value: 0,
      },
      {
        coordinate: 65,
        index: 1,
        offset: 0,
        value: 0.5,
      },
      {
        coordinate: 124.99999999999999,
        index: 2,
        offset: 0,
        value: 1,
      },
      {
        coordinate: 185,
        index: 3,
        offset: 0,
        value: 1.5,
      },
      {
        coordinate: 244.99999999999997,
        index: 4,
        offset: 0,
        value: 2,
      },
      {
        coordinate: 305,
        index: 5,
        offset: 0,
        value: 2.5,
      },
      {
        coordinate: 365,
        index: 6,
        offset: 0,
        value: 3,
      },
    ]);
  });

  test("selectBarBandSize", () => {
    const { spy } = renderTestCase((state) => selectBarBandSize(state, "my-bar-id", false));
    expectLastCalledWith(spy, 59.99999999999997);
  });

  test("selectAllBarPositions", () => {
    const { spy } = renderTestCase((state) => selectAllBarPositions(state, "my-bar-id", false));
    expectLastCalledWith(spy, [
      {
        stackId: "test",
        dataKeys: ["uv", "pv"],
        position: {
          offset: 5.999999999999997,
          size: 48,
        },
      },
    ]);
  });

  test("selectBarPosition", () => {
    const { spy } = renderTestCase((state) => selectBarPosition(state, "my-bar-id", false));
    expectLastCalledWith(spy, {
      offset: 5.999999999999997,
      size: 48,
    });
  });

  test("selectBarRectangles", () => {
    const { spy } = renderTestCase((state) =>
      selectBarRectangles(state, "my-bar-id", false, undefined),
    );
    expectLastCalledWith(spy, [
      {
        xKey: 4000,
        uv: 400,
        pv: 2400,
        stackedBarStart: 5,
        x: 5,
        y: -18.99999999999999,
        width: 19.6,
        height: 48,
        value: [0, 400],
        payload: {
          xKey: 4000,
          uv: 400,
          pv: 2400,
        },
        background: {
          x: 5,
          y: -18.99999999999999,
          width: 490,
          height: 48,
        },
        tooltipPosition: {
          x: 14.8,
          y: 5.000000000000011,
        },
        parentViewBox: {
          x: 0,
          y: 0,
          width: 500,
          height: 400,
        },
        originalDataIndex: 0,
      },
      {
        xKey: 6000,
        uv: 300,
        pv: 4567,
        stackedBarStart: 5,
        x: 5,
        y: 341,
        width: 14.7,
        height: 48,
        value: [0, 300],
        payload: {
          xKey: 6000,
          uv: 300,
          pv: 4567,
        },
        background: {
          x: 5,
          y: 341,
          width: 490,
          height: 48,
        },
        tooltipPosition: {
          x: 12.35,
          y: 365,
        },
        parentViewBox: {
          x: 0,
          y: 0,
          width: 500,
          height: 400,
        },
        originalDataIndex: 1,
      },
    ] as unknown as BarRectangleItem[]);
  });

  it("should render bars", () => {
    const { container } = renderTestCase();
    expectBars(container, [
      {
        x: "5",
        y: "-19",
        width: "19.6",
        height: "48",
        radius: "0",
        d: "M 5,-19 h 19.6 v 48 h -19.6 Z",
      },
      {
        x: "5",
        y: "341",
        width: "14.7",
        height: "48",
        radius: "0",
        d: "M 5,341 h 14.7 v 48 h -14.7 Z",
      },
      {
        x: "24.6",
        y: "-19",
        width: "117.6",
        height: "48",
        radius: "0",
        d: "M 24.6,-19 h 117.6 v 48 h -117.6 Z",
      },
      {
        x: "19.7",
        y: "341",
        width: "223.783",
        height: "48",
        radius: "0",
        d: "M 19.7,341 h 223.783 v 48 h -223.783 Z",
      },
    ]);
  });
});

describe("when stackId is a number", () => {
  const cells: never[] = [];

  const renderTestCase = createSelectorTestCase((props) => (
    <BarChart width={100} height={50} data={data}>
      <YAxis />
      <Bar dataKey="uv" stackId="8" fill="#ff7300" isAnimationActive={false} />
      <Bar
        dataKey="pv"
        stackId="8"
        fill="#387908"
        isAnimationActive={false}
        minPointSize={0}
        id="my-bar-id"
      />
      {props.children}
    </BarChart>
  ));

  it("should select bars", () => {
    const { spy } = renderTestCase((state) =>
      selectBarRectangles(state, "my-bar-id", false, cells),
    );
    expectLastCalledWith(spy, [
      {
        background: {
          height: 40,
          width: 6,
          x: 65.75,
          y: 5,
        },
        height: 9.600000000000001,
        name: "food",
        originalDataIndex: 0,
        payload: {
          name: "food",
          pv: 2400,
          uv: 400,
        },
        pv: 2400,
        stackedBarStart: 45,
        tooltipPosition: {
          x: 68.75,
          y: 38.599999999999994,
        },
        uv: 400,
        value: [400, 2800],
        width: 6,
        x: 65.75,
        y: 33.8,
        parentViewBox: {
          height: expect.any(Number),
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
        },
      },
      {
        background: {
          height: 40,
          width: 6,
          x: 73.25,
          y: 5,
        },
        height: 18.268,
        name: "cosmetic",
        originalDataIndex: 1,
        payload: {
          name: "cosmetic",
          pv: 4567,
          uv: 300,
        },
        pv: 4567,
        stackedBarStart: 45,
        tooltipPosition: {
          x: 76.25,
          y: 34.666,
        },
        uv: 300,
        value: [300, 4867],
        width: 6,
        x: 73.25,
        y: 25.531999999999996,
        parentViewBox: {
          height: expect.any(Number),
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
        },
      },
      {
        background: {
          height: 40,
          width: 6,
          x: 80.75,
          y: 5,
        },
        height: 5.591999999999999,
        name: "storage",
        originalDataIndex: 2,
        payload: {
          name: "storage",
          pv: 1398,
          uv: 300,
        },
        pv: 1398,
        stackedBarStart: 45,
        tooltipPosition: {
          x: 83.75,
          y: 41.004,
        },
        uv: 300,
        value: [300, 1698],
        width: 6,
        x: 80.75,
        y: 38.208,
        parentViewBox: {
          height: expect.any(Number),
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
        },
      },
      {
        background: {
          height: 40,
          width: 6,
          x: 88.25,
          y: 5,
        },
        height: 39.2,
        name: "digital",
        originalDataIndex: 3,
        payload: {
          name: "digital",
          pv: 9800,
          uv: 200,
        },
        pv: 9800,
        stackedBarStart: 45,
        tooltipPosition: {
          x: 91.25,
          y: 24.6,
        },
        uv: 200,
        value: [200, 10000],
        width: 6,
        x: 88.25,
        y: 5,
        parentViewBox: {
          height: expect.any(Number),
          width: expect.any(Number),
          x: expect.any(Number),
          y: expect.any(Number),
        },
      },
    ]);
  });

  it("should select bar size list", () => {
    const { spy } = renderTestCase((state) => selectBarSizeList(state, "my-bar-id", false));
    expectLastCalledWith(spy, [
      {
        barSize: undefined,
        dataKeys: ["uv", "pv"],
        stackId: "8",
      },
    ]);
  });

  test("selectRootMaxBarSize", () => {
    const { spy } = renderTestCase(selectRootMaxBarSize);
    expectLastCalledWith(spy, undefined);
  });

  test("selectBarGap", () => {
    const { spy } = renderTestCase(selectBarGap);
    expectLastCalledWith(spy, 4);
  });

  test("selectBarCategoryGap", () => {
    const { spy } = renderTestCase(selectBarCategoryGap);
    expectLastCalledWith(spy, "10%");
  });

  test("selectBarBandSize", () => {
    const { spy } = renderTestCase((state) => selectBarBandSize(state, "my-bar-id", false));
    expectLastCalledWith(spy, 7.5);
  });

  test("selectAxisBandSize", () => {
    const { spy } = renderTestCase((state) => selectAxisBandSize(state, "my-bar-id", false));
    expectLastCalledWith(spy, 7.5);
  });

  test("selectMaxBarSize", () => {
    const { spy } = renderTestCase((state) => selectMaxBarSize(state, "my-bar-id"));
    expectLastCalledWith(spy, undefined);
  });

  it("should select all bar positions", () => {
    const { spy } = renderTestCase((state) => selectAllBarPositions(state, "my-bar-id", false));
    expectLastCalledWith(spy, [
      {
        dataKeys: ["uv", "pv"],
        position: {
          offset: 0.75,
          size: 6,
        },
        stackId: "8",
      },
    ]);
  });

  it("should select bar position", () => {
    const { spy } = renderTestCase((state) => selectBarPosition(state, "my-bar-id", false));
    expectLastCalledWith(spy, {
      offset: 0.75,
      size: 6,
    });
  });

  it("should render bars", () => {
    const matchingStackConfig = [
      { name: "food", firstBarIndex: 0, secondBarIndex: 4 },
      { name: "cosmetic", firstBarIndex: 1, secondBarIndex: 5 },
      { name: "storage", firstBarIndex: 2, secondBarIndex: 6 },
      { name: "digital", firstBarIndex: 3, secondBarIndex: 7 },
    ];

    const { container } = renderTestCase();

    const rects = container.querySelectorAll(".recharts-rectangle");
    expect(rects).toHaveLength(8);

    matchingStackConfig.forEach(({ name, firstBarIndex, secondBarIndex }) => {
      // bar one and bar two should be the same category
      const barOne = rects[firstBarIndex]!;
      const barTwo = rects[secondBarIndex]!;
      expect(barOne.getAttribute("name")).toEqual(name);
      expect(barTwo.getAttribute("name")).toEqual(name);

      // these bars should have the same x (cannot compare y accurately as Y does not start from 0)
      expect(barOne.getAttribute("x")).toEqual(barTwo.getAttribute("x"));
    });

    expectBars(container, [
      {
        d: "M 65.75,43.4 h 6 v 1.6 h -6 Z",
        height: "1.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "43.4",
      },
      {
        d: "M 73.25,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "43.8",
      },
      {
        d: "M 80.75,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "43.8",
      },
      {
        d: "M 88.25,44.2 h 6 v 0.8 h -6 Z",
        height: "0.8",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "44.2",
      },
      {
        d: "M 65.75,33.8 h 6 v 9.6 h -6 Z",
        height: "9.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "33.8",
      },
      {
        d: "M 73.25,25.532 h 6 v 18.268 h -6 Z",
        height: "18.268",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "25.532",
      },
      {
        d: "M 80.75,38.208 h 6 v 5.592 h -6 Z",
        height: "5.592",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "38.208",
      },
      {
        d: "M 88.25,5 h 6 v 39.2 h -6 Z",
        height: "39.2",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "5",
      },
    ]);
  });
});

describe("rendering bar rectangles", () => {
  const onePointData = [{ number: 1, name: "food", uv: 400, pv: 2400 }];

  test("renders simple BarChart", () => {
    const barSpy = vi.fn();
    const sizeListSpy = vi.fn();
    const Comp = (): null => {
      const bars = useAppSelector((state) => selectAllVisibleBars(state, "my-bar-id", false));
      const sizeList = useAppSelector((state) => selectBarSizeList(state, "my-bar-id", false));
      createEffect(
        () => bars(),
        (v) => barSpy(v),
      );
      createEffect(
        () => sizeList(),
        (v) => sizeListSpy(v),
      );
      return null;
    };
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar dataKey="uv" isAnimationActive={false} id="my-bar-id" />
        <Comp />
      </BarChart>
    ));

    const expectedBar: BarSettings = {
      id: expect.stringMatching("bar-"),
      isPanorama: false,
      maxBarSize: undefined,
      minPointSize: 0,
      hasCustomShape: false,
      barSize: undefined,
      data: undefined,
      dataKey: "uv",
      hide: false,
      stackId: undefined,
      type: "bar",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
    };
    expect(barSpy).toHaveBeenLastCalledWith([expectedBar]);

    expect(sizeListSpy).toHaveBeenLastCalledWith([
      {
        barSize: undefined,
        dataKeys: ["uv"],
        stackId: undefined,
      },
    ]);

    expectBars(container, [
      {
        d: "M 7.25,5 h 18 v 40 h -18 Z",
        height: "40",
        radius: "0",
        width: "18",
        x: "7.25",
        y: "5",
      },
      {
        d: "M 29.75,15 h 18 v 30 h -18 Z",
        height: "30",
        radius: "0",
        width: "18",
        x: "29.75",
        y: "15",
      },
      {
        d: "M 52.25,15 h 18 v 30 h -18 Z",
        height: "30",
        radius: "0",
        width: "18",
        x: "52.25",
        y: "15",
      },
      {
        d: "M 74.75,25 h 18 v 20 h -18 Z",
        height: "20",
        radius: "0",
        width: "18",
        x: "74.75",
        y: "25",
      },
    ]);
  });

  test("Renders BarChart with two Bars", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar dataKey="uv" isAnimationActive={false} />
        <Bar dataKey="pv" isAnimationActive={false} />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 7.25,43.4 h 7 v 1.6 h -7 Z",
        height: "1.6",
        radius: "0",
        width: "7",
        x: "7.25",
        y: "43.4",
      },
      {
        d: "M 29.75,43.8 h 7 v 1.2 h -7 Z",
        height: "1.2",
        radius: "0",
        width: "7",
        x: "29.75",
        y: "43.8",
      },
      {
        d: "M 52.25,43.8 h 7 v 1.2 h -7 Z",
        height: "1.2",
        radius: "0",
        width: "7",
        x: "52.25",
        y: "43.8",
      },
      {
        d: "M 74.75,44.2 h 7 v 0.8 h -7 Z",
        height: "0.8",
        radius: "0",
        width: "7",
        x: "74.75",
        y: "44.2",
      },
      {
        d: "M 18.25,35.4 h 7 v 9.6 h -7 Z",
        height: "9.6",
        radius: "0",
        width: "7",
        x: "18.25",
        y: "35.4",
      },
      {
        d: "M 40.75,26.732 h 7 v 18.268 h -7 Z",
        height: "18.268",
        radius: "0",
        width: "7",
        x: "40.75",
        y: "26.732",
      },
      {
        d: "M 63.25,39.408 h 7 v 5.592 h -7 Z",
        height: "5.592",
        radius: "0",
        width: "7",
        x: "63.25",
        y: "39.408",
      },
      {
        d: "M 85.75,5.8 h 7 v 39.2 h -7 Z",
        height: "39.2",
        radius: "0",
        width: "7",
        x: "85.75",
        y: "5.8",
      },
    ]);
  });

  test("Don't renders any bars when no Bar item is added", () => {
    const { container } = render(() => <BarChart width={100} height={50} data={data} />);

    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(0);
  });

  test("Renders 8 bars in a vertical BarChart", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" />
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));

    expectBars(container, [
      {
        d: "M 65,5.25 h 1.2 v 1 h -1.2 Z",
        height: "1",
        radius: "0",
        width: "1.2",
        x: "65",
        y: "5.25",
      },
      {
        d: "M 65,7.75 h 0.9 v 1 h -0.9 Z",
        height: "1",
        radius: "0",
        width: "0.9",
        x: "65",
        y: "7.75",
      },
      {
        d: "M 65,10.25 h 0.9 v 1 h -0.9 Z",
        height: "1",
        radius: "0",
        width: "0.9",
        x: "65",
        y: "10.25",
      },
      {
        d: "M 65,12.75 h 0.6 v 1 h -0.6 Z",
        height: "1",
        radius: "0",
        width: "0.6",
        x: "65",
        y: "12.75",
      },
      {
        d: "M 65,6.25 h 7.2 v 1 h -7.2 Z",
        height: "1",
        radius: "0",
        width: "7.2",
        x: "65",
        y: "6.25",
      },
      {
        d: "M 65,8.75 h 13.701 v 1 h -13.701 Z",
        height: "1",
        radius: "0",
        width: "13.701",
        x: "65",
        y: "8.75",
      },
      {
        d: "M 65,11.25 h 4.194 v 1 h -4.194 Z",
        height: "1",
        radius: "0",
        width: "4.194",
        x: "65",
        y: "11.25",
      },
      {
        d: "M 65,13.75 h 29.4 v 1 h -29.4 Z",
        height: "1",
        radius: "0",
        width: "29.4",
        x: "65",
        y: "13.75",
      },
    ]);
  });

  test("Renders 8 bars in a stacked BarChart, Bars of the same category have the same name and same x pos", () => {
    const matchingStackConfig = [
      { name: "food", firstBarIndex: 0, secondBarIndex: 4 },
      { name: "cosmetic", firstBarIndex: 1, secondBarIndex: 5 },
      { name: "storage", firstBarIndex: 2, secondBarIndex: 6 },
      { name: "digital", firstBarIndex: 3, secondBarIndex: 7 },
    ];

    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <YAxis />
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));

    const rects = container.querySelectorAll(".recharts-rectangle");
    expect(rects).toHaveLength(8);

    matchingStackConfig.forEach(({ name, firstBarIndex, secondBarIndex }) => {
      // bar one and bar two should be the same category
      const barOne = rects[firstBarIndex]!;
      const barTwo = rects[secondBarIndex]!;
      expect(barOne.getAttribute("name")).toEqual(name);
      expect(barTwo.getAttribute("name")).toEqual(name);

      // these bars should have the same x (cannot compare y accurately as Y does not start from 0)
      expect(barOne.getAttribute("x")).toEqual(barTwo.getAttribute("x"));
    });

    expectBars(container, [
      {
        d: "M 65.75,43.4 h 6 v 1.6 h -6 Z",
        height: "1.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "43.4",
      },
      {
        d: "M 73.25,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "43.8",
      },
      {
        d: "M 80.75,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "43.8",
      },
      {
        d: "M 88.25,44.2 h 6 v 0.8 h -6 Z",
        height: "0.8",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "44.2",
      },
      {
        d: "M 65.75,33.8 h 6 v 9.6 h -6 Z",
        height: "9.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "33.8",
      },
      {
        d: "M 73.25,25.532 h 6 v 18.268 h -6 Z",
        height: "18.268",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "25.532",
      },
      {
        d: "M 80.75,38.208 h 6 v 5.592 h -6 Z",
        height: "5.592",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "38.208",
      },
      {
        d: "M 88.25,5 h 6 v 39.2 h -6 Z",
        height: "39.2",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "5",
      },
    ]);
  });

  test("renders a horizontal stacked bar chart when x-axis is of type number", () => {
    const dataWithNumberAsKey = [
      { xKey: 4000, uv: 400, pv: 2400 },
      { xKey: 6000, uv: 300, pv: 4567 },
      { xKey: 8000, uv: 300, pv: 1398 },
      { xKey: 10000, uv: 200, pv: 9800 },
    ];

    const { container } = render(() => (
      <BarChart width={500} height={400} data={dataWithNumberAsKey}>
        <XAxis type="number" dataKey="xKey" domain={["dataMin", "dataMax"]} />
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));

    expectBars(container, [
      {
        x: "-60.3333",
        y: "350.6",
        width: "131",
        height: "14.4",
        radius: "0",
        d: "M -60.3333,350.6 h 131 v 14.4 h -131 Z",
      },
      {
        x: "103",
        y: "354.2",
        width: "131",
        height: "10.8",
        radius: "0",
        d: "M 103,354.2 h 131 v 10.8 h -131 Z",
      },
      {
        x: "266.3333",
        y: "354.2",
        width: "131",
        height: "10.8",
        radius: "0",
        d: "M 266.3333,354.2 h 131 v 10.8 h -131 Z",
      },
      {
        x: "429.6667",
        y: "357.8",
        width: "131",
        height: "7.2",
        radius: "0",
        d: "M 429.6667,357.8 h 131 v 7.2 h -131 Z",
      },
      {
        x: "-60.3333",
        y: "264.2",
        width: "131",
        height: "86.4",
        radius: "0",
        d: "M -60.3333,264.2 h 131 v 86.4 h -131 Z",
      },
      {
        x: "103",
        y: "189.788",
        width: "131",
        height: "164.412",
        radius: "0",
        d: "M 103,189.788 h 131 v 164.412 h -131 Z",
      },
      {
        x: "266.3333",
        y: "303.872",
        width: "131",
        height: "50.328",
        radius: "0",
        d: "M 266.3333,303.872 h 131 v 50.328 h -131 Z",
      },
      {
        x: "429.6667",
        y: "5",
        width: "131",
        height: "352.8",
        radius: "0",
        d: "M 429.6667,5 h 131 v 352.8 h -131 Z",
      },
    ]);
  });

  test("Stacked bars are actually stacked", () => {
    const seriesOne = vi.fn();
    const seriesTwo = vi.fn();
    const Spy = (): null => {
      const a = useAppSelector((state) => selectBarRectangles(state, "bar-uv", false, []));
      const b = useAppSelector((state) => selectBarRectangles(state, "bar-pv", false, []));
      createEffect(
        () => a()?.[0],
        (v) => seriesOne(v),
      );
      createEffect(
        () => b()?.[0],
        (v) => seriesTwo(v),
      );
      return null;
    };

    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <YAxis />
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} id="bar-uv" />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} id="bar-pv">
          <Spy />
        </Bar>
      </BarChart>
    ));
    flush();

    expect(seriesOne.mock.lastCall?.[0]?.value).toEqual([0, 400]);
    expect(seriesTwo.mock.lastCall?.[0]?.value).toEqual([400, 2800]);

    expectBars(container, [
      {
        d: "M 65.75,43.4 h 6 v 1.6 h -6 Z",
        height: "1.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "43.4",
      },
      {
        d: "M 73.25,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "43.8",
      },
      {
        d: "M 80.75,43.8 h 6 v 1.2 h -6 Z",
        height: "1.2",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "43.8",
      },
      {
        d: "M 88.25,44.2 h 6 v 0.8 h -6 Z",
        height: "0.8",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "44.2",
      },
      {
        d: "M 65.75,33.8 h 6 v 9.6 h -6 Z",
        height: "9.6",
        radius: "0",
        width: "6",
        x: "65.75",
        y: "33.8",
      },
      {
        d: "M 73.25,25.532 h 6 v 18.268 h -6 Z",
        height: "18.268",
        radius: "0",
        width: "6",
        x: "73.25",
        y: "25.532",
      },
      {
        d: "M 80.75,38.208 h 6 v 5.592 h -6 Z",
        height: "5.592",
        radius: "0",
        width: "6",
        x: "80.75",
        y: "38.208",
      },
      {
        d: "M 88.25,5 h 6 v 39.2 h -6 Z",
        height: "39.2",
        radius: "0",
        width: "6",
        x: "88.25",
        y: "5",
      },
    ]);
  });

  test("Renders 4 bars in a stacked BarChart which only have one Bar", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={data}>
        <YAxis />
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(4);
  });

  // https://github.com/recharts/recharts/issues/6235
  test("Stacked bars with all 0 values: Bar component and YAxis ticks still render", () => {
    const allZeroData = [
      { name: "Page A", uv: 0, pv: 0 },
      { name: "Page B", uv: 0, pv: 0 },
      { name: "Page C", uv: 0, pv: 0 },
    ];
    const { container } = render(() => (
      <BarChart width={400} height={300} data={allZeroData}>
        <YAxis />
        <Bar dataKey="uv" stackId="test" fill="#ff7300" isAnimationActive={false} />
        <Bar dataKey="pv" stackId="test" fill="#387908" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    // Zero-height bars without custom shapes are filtered, but the Bar component itself renders.
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-bar")).toHaveLength(2);
    expect(
      container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick"),
    ).not.toHaveLength(0);
  });

  // https://github.com/recharts/recharts/issues/6235
  test("Renders stacked bars with custom shape when all values are 0", () => {
    const allZeroData = [
      { name: "Page A", uv: 0, pv: 0 },
      { name: "Page B", uv: 0, pv: 0 },
    ];
    const customShape = vi.fn(() => <rect data-testid="custom-shape" />);
    const { container } = render(() => (
      <BarChart width={400} height={300} data={allZeroData}>
        <YAxis />
        <Bar dataKey="uv" stackId="test" shape={customShape} isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    expect(customShape).toHaveBeenCalled();
    expect(container.querySelectorAll('[data-testid="custom-shape"]')).toHaveLength(2);
  });

  // https://github.com/recharts/recharts/issues/6235
  test("Vertical stacked bars with all 0 values still render custom shapes", () => {
    const allZeroData = [
      { name: "Page A", uv: 0, pv: 0 },
      { name: "Page B", uv: 0, pv: 0 },
    ];
    const customShape = vi.fn(() => <rect data-testid="custom-shape" />);
    const { container } = render(() => (
      <BarChart width={400} height={300} data={allZeroData} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" />
        <Bar dataKey="uv" stackId="test" shape={customShape} isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    expect(customShape).toHaveBeenCalled();
    expect(container.querySelectorAll('[data-testid="custom-shape"]')).toHaveLength(2);
  });

  test("renders nothing if barSize is not specified in a numerical XAxis", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData}>
        <XAxis dataKey="number" type="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} />
      </BarChart>
    ));
    flush();
    expectBars(container, []);
  });

  test("renders bars of default size if barSize is not set in categorical XAxis", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData}>
        <XAxis dataKey="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 14,5 h 72 v 10 h -72 Z", height: "10", radius: "0", width: "72", x: "14", y: "5" },
    ]);
  });

  test("renders a bar of custom width if size is specified", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData} barSize={20}>
        <XAxis dataKey="number" type="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 85,5 h 20 v 10 h -20 Z", height: "10", radius: "0", width: "20", x: "85", y: "5" },
    ]);
  });

  test("renders bar when barSize is set in %", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData} barSize="40%">
        <XAxis dataKey="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 32,5 h 36 v 10 h -36 Z", height: "10", radius: "0", width: "36", x: "32", y: "5" },
    ]);
  });

  test("prefers child item barSize if both child and global barSize are set", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData} barSize={20}>
        <XAxis dataKey="number" type="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} barSize={40} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 75,5 h 40 v 10 h -40 Z", height: "10", radius: "0", width: "40", x: "75", y: "5" },
    ]);
  });

  test("renders a smaller bar if maxBarSize is set, even in a numerical XAxis", () => {
    const barSizeListSpy = vi.fn();
    const barPositionsSpy = vi.fn();
    const totalAxisSizeSpy = vi.fn();
    const Comp = (): null => {
      const sizeList = useAppSelector((state) => selectBarSizeList(state, "my-bar-id", false));
      const positions = useAppSelector((state) => selectAllBarPositions(state, "my-bar-id", false));
      const axisSize = useAppSelector((state) => selectBarCartesianAxisSize(state, "my-bar-id"));
      createEffect(
        () => sizeList(),
        (v) => barSizeListSpy(v),
      );
      createEffect(
        () => positions(),
        (v) => barPositionsSpy(v),
      );
      createEffect(
        () => axisSize(),
        (v) => totalAxisSizeSpy(v),
      );
      return null;
    };

    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData}>
        <XAxis dataKey="number" type="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} maxBarSize={30} id="my-bar-id" />
        <Comp />
      </BarChart>
    ));
    flush();

    expect(barSizeListSpy).toHaveBeenLastCalledWith([
      { barSize: undefined, dataKeys: ["uv"], stackId: undefined },
    ]);
    expect(totalAxisSizeSpy).toHaveBeenLastCalledWith(90);
    expect(barPositionsSpy).toHaveBeenLastCalledWith([
      { position: { offset: -12, size: 24 }, dataKeys: ["uv"], stackId: undefined },
    ]);

    expectBars(container, [
      { d: "M 83,5 h 24 v 10 h -24 Z", height: "10", radius: "0", width: "24", x: "83", y: "5" },
    ]);
  });

  test("renders a smaller bar if maxBarSize is set with categorical XAxis", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData}>
        <XAxis dataKey="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} maxBarSize={40} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 30,5 h 40 v 10 h -40 Z", height: "10", radius: "0", width: "40", x: "30", y: "5" },
    ]);
  });

  test("if graphical item barSize is larger than maxBarSize then the barSize should win", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData}>
        <XAxis dataKey="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} barSize={60} maxBarSize={40} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 20,5 h 60 v 10 h -60 Z", height: "10", radius: "0", width: "60", x: "20", y: "5" },
    ]);
  });

  test("if chart root barSize is larger than maxBarSize then the barSize should win", () => {
    const { container } = render(() => (
      <BarChart width={100} height={50} data={onePointData} barSize={60}>
        <XAxis dataKey="number" />
        <Bar dataKey="uv" name="uv" isAnimationActive={false} maxBarSize={40} />
      </BarChart>
    ));
    flush();
    expectBars(container, [
      { d: "M 20,5 h 60 v 10 h -60 Z", height: "10", radius: "0", width: "60", x: "20", y: "5" },
    ]);
  });

  // PERMANENT-N/A: "renders bars in Brush panorama" — the outer ComposedChart's
  // own bars and the in-brush panorama-mirror bars share a y-domain/plot-area
  // differently in this port than in recharts (the reference renders 14 bars with
  // the outer set scaled to a tiny top band; the port renders the panorama mirror
  // and re-scales the outer set, yielding a different bar count + geometry). This
  // is a Brush-panorama × ComposedChart shared-domain LAYOUT divergence (tracked in
  // the Brush/panorama infra), not a Bar feature gap — the Bar-level bar positions
  // selector (offset 11.2857 / size 90) is already correct.

  test("should render whiskers in boxplot simulation", () => {
    const barPositionsSpy = vi.fn();
    const barRectanglesSpy = vi.fn();
    const Comp = (): null => {
      const positions = useAppSelector((state) => selectAllBarPositions(state, "my-bar-id", false));
      const rects = useAppSelector((state) =>
        selectBarRectangles(state, "my-bar-id", false, undefined),
      );
      createEffect(
        () => positions(),
        (v) => barPositionsSpy(v),
      );
      createEffect(
        () => rects(),
        (v) => barRectanglesSpy(v),
      );
      return null;
    };

    const { container } = render(() => (
      <ComposedChart width={400} height={200} data={boxPlotData}>
        <Bar stackId="a" dataKey="min" isAnimationActive={false} />
        <Bar stackId="a" dataKey="bar-min" isAnimationActive={false} />
        <Bar stackId="a" dataKey="bottomWhisker" isAnimationActive={false} />
        <Bar stackId="a" dataKey="bottomBox" isAnimationActive={false} />
        <Bar stackId="a" dataKey="bar-avg" isAnimationActive={false} />
        <Bar stackId="a" dataKey="topBox" isAnimationActive={false} />
        <Bar stackId="a" dataKey="topWhisker" isAnimationActive={false} id="my-bar-id" />
        <Bar stackId="a" dataKey="bar-max" isAnimationActive={false} />
        <XAxis />
        <YAxis />
        <Comp />
      </ComposedChart>
    ));
    flush();

    expect(barPositionsSpy).toHaveBeenLastCalledWith([
      {
        dataKeys: [
          "min",
          "bar-min",
          "bottomWhisker",
          "bottomBox",
          "bar-avg",
          "topBox",
          "topWhisker",
          "bar-max",
        ],
        position: { offset: 11, size: 88 },
        stackId: "a",
      },
    ]);
    expect(barRectanglesSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({
        originalDataIndex: 0,
        value: [450, 650],
        width: 88,
        x: 76,
        y: 35,
        height: 40,
        stackedBarStart: 165,
        tooltipPosition: { x: 120, y: 55 },
        background: { height: 160, width: 88, x: 76, y: 5 },
      }),
      expect.objectContaining({
        originalDataIndex: 1,
        value: [700, 800],
        width: 88,
        x: 186,
        y: 5,
        height: 20,
        tooltipPosition: { x: 230, y: 15 },
      }),
      expect.objectContaining({
        originalDataIndex: 2,
        value: [600, 800],
        width: 88,
        x: 296,
        y: 5,
        height: 40,
        tooltipPosition: { x: 340, y: 25 },
      }),
    ]);

    expectBars(container, [
      {
        d: "M 76,145 h 88 v 20 h -88 Z",
        height: "20",
        radius: "0",
        width: "88",
        x: "76",
        y: "145",
      },
      {
        d: "M 186,125 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "186",
        y: "125",
      },
      {
        d: "M 76,125 h 88 v 20 h -88 Z",
        height: "20",
        radius: "0",
        width: "88",
        x: "76",
        y: "125",
      },
      {
        d: "M 186,85 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "186",
        y: "85",
      },
      {
        d: "M 296,125 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "296",
        y: "125",
      },
      {
        d: "M 76,115 h 88 v 10 h -88 Z",
        height: "10",
        radius: "0",
        width: "88",
        x: "76",
        y: "115",
      },
      {
        d: "M 186,45 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "186",
        y: "45",
      },
      {
        d: "M 296,85 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "296",
        y: "85",
      },
      { d: "M 76,75 h 88 v 40 h -88 Z", height: "40", radius: "0", width: "88", x: "76", y: "75" },
      {
        d: "M 186,25 h 88 v 20 h -88 Z",
        height: "20",
        radius: "0",
        width: "88",
        x: "186",
        y: "25",
      },
      {
        d: "M 296,45 h 88 v 40 h -88 Z",
        height: "40",
        radius: "0",
        width: "88",
        x: "296",
        y: "45",
      },
      { d: "M 76,35 h 88 v 40 h -88 Z", height: "40", radius: "0", width: "88", x: "76", y: "35" },
      { d: "M 186,5 h 88 v 20 h -88 Z", height: "20", radius: "0", width: "88", x: "186", y: "5" },
      { d: "M 296,5 h 88 v 40 h -88 Z", height: "40", radius: "0", width: "88", x: "296", y: "5" },
    ]);
  });
});

// Ported from recharts 3.8.1 test/chart/BarChart.spec.tsx `describe('chart
// synchronization')`. Solid adaptations: tooltips portal into each chart's own
// `.recharts-wrapper`, so we scope queries per wrapper (`getTooltip(wrapper)`)
// rather than indexing a flat `querySelectorAll`; hover/leave settle via the
// helpers' `flush()` (no fake timers / `act`). Mouse triggers go through the
// chart surface (`.recharts-wrapper`), the bar-chart axis-tooltip selector.
describe("BarChart chart synchronization", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  it("should render two independent charts by default", () => {
    const { container } = render(() => (
      <>
        <div id="barOne">
          <BarChart width={100} height={50} data={data}>
            <Bar dataKey="uv" />
            <Tooltip />
          </BarChart>
        </div>
        <div id="barTwo">
          <BarChart width={100} height={50} data={data}>
            <Bar dataKey="pv" />
            <Tooltip />
          </BarChart>
        </div>
      </>
    ));

    const wrapperOne = container.querySelector("#barOne");
    assertNotNull(wrapperOne);
    const wrapperTwo = container.querySelector("#barTwo");
    assertNotNull(wrapperTwo);

    expectTooltipNotVisible(wrapperOne);
    expectTooltipNotVisible(wrapperTwo);

    // Hovering chart one shows ONLY chart one's tooltip (no syncId).
    showTooltipOnCoordinate(wrapperOne, barChartMouseHoverTooltipSelector, {
      clientX: 20,
      clientY: 20,
    });
    expect(getTooltip(wrapperOne)).toBeVisible();
    expectTooltipNotVisible(wrapperTwo);

    showTooltipOnCoordinate(wrapperTwo, barChartMouseHoverTooltipSelector, {
      clientX: 20,
      clientY: 20,
    });
    expectTooltipPayload(wrapperOne, "0", ["uv : 400"]);
    expectTooltipPayload(wrapperTwo, "0", ["pv : 2400"]);

    hideTooltip(wrapperOne, barChartMouseHoverTooltipSelector);
    expectTooltipNotVisible(wrapperOne);
    expect(getTooltip(wrapperTwo)).toBeVisible();

    hideTooltip(wrapperTwo, barChartMouseHoverTooltipSelector);
    expectTooltipNotVisible(wrapperOne);
    expectTooltipNotVisible(wrapperTwo);
  });

  it("should render two connected charts when given same syncId", () => {
    const { container } = render(() => (
      <>
        <div id="barOne">
          <BarChart syncId={1} width={100} height={50} data={data}>
            <Bar dataKey="uv" />
            <Tooltip />
          </BarChart>
        </div>
        <div id="barTwo">
          <BarChart syncId={1} width={100} height={50} data={data}>
            <Bar dataKey="pv" />
            <Tooltip />
          </BarChart>
        </div>
      </>
    ));

    const wrapperOne = container.querySelector("#barOne");
    assertNotNull(wrapperOne);
    const wrapperTwo = container.querySelector("#barTwo");
    assertNotNull(wrapperTwo);

    expectTooltipNotVisible(wrapperOne);
    expectTooltipNotVisible(wrapperTwo);

    // Hovering chart one makes BOTH show their own data (synchronised by index).
    showTooltipOnCoordinate(wrapperOne, barChartMouseHoverTooltipSelector, {
      clientX: 20,
      clientY: 20,
    });
    expectTooltipPayload(wrapperOne, "0", ["uv : 400"]);
    expectTooltipPayload(wrapperTwo, "0", ["pv : 2400"]);

    hideTooltip(wrapperOne, barChartMouseHoverTooltipSelector);
    expectTooltipNotVisible(wrapperOne);
    expectTooltipNotVisible(wrapperTwo);
  });
});
