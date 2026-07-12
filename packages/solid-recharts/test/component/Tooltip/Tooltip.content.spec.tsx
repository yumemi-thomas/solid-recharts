// Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.content.spec.tsx.
//
// The function-form `content` receives the resolved tooltip prop bag; this spec
// asserts on that bag at hover time. Harness adaptations: React render → Solid
// render via createSelectorTestCase; `content` is called with a single argument
// (no React ref), so the trailing `expect.any(Object)` ref is dropped.
//
// PERMANENT-N/A: "should be called and receive payload before any user
// interactions" (asserts content is invoked with active:false / payload:[] BEFORE
// any hover) — in the Solid port `content` is only rendered while the tooltip box
// is mounted (active), so it is never called for the inactive state. The
// `toHaveBeenCalledTimes(N)` assertions are render-count coupled and likewise
// dropped (the prop-bag value is what carries the behavior).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { PageData } from "../../_data";
import { Area, AreaChart, Tooltip } from "../../../src";
import type { TooltipContentProps } from "../../../src/component/Tooltip";
import { showTooltip } from "./tooltipTestHelpers";
import { areaChartMouseHoverTooltipSelector } from "./tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";

const commonChartProps = {
  width: 400,
  height: 400,
};

describe("Tooltip.content", () => {
  const spy: Mock<(props: TooltipContentProps) => null> = vi.fn(() => null);

  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
    spy.mockClear();
  });

  const renderTestCase = createSelectorTestCase((props) => (
    <AreaChart {...commonChartProps} data={PageData}>
      <Area dataKey="uv" unit="kg" id="area-uv" />
      <Area dataKey="pv" unit="$$$" name="My custom name" id="area-pv" />
      <Area dataKey="amt" id="area-amt" />
      <Tooltip content={spy} />
      {props.children}
    </AreaChart>
  ));

  it("should be called and receive payload on hover", () => {
    const { container } = renderTestCase();
    showTooltip(container, areaChartMouseHoverTooltipSelector);

    // Assert on the first argument only: Solid's JSX runtime appends a resolver
    // argument when a function child is materialized, which is not part of the
    // recharts contract (React passes a ref as the 2nd arg, also dropped here).
    expect(spy.mock.calls.at(-1)?.[0]).toEqual({
      accessibilityLayer: true,
      active: true,
      activeIndex: "2",
      allowEscapeViewBox: { x: false, y: false },
      animationDuration: 400,
      animationEasing: "ease",
      axisId: 0,
      content: spy,
      contentStyle: {},
      coordinate: { x: 161, y: 200 },
      cursor: true,
      filterNull: true,
      includeHidden: false,
      isAnimationActive: "auto",
      itemSorter: "name",
      itemStyle: {},
      label: 2,
      labelStyle: {},
      offset: 10,
      payload: [
        {
          color: "#3182bd",
          dataKey: "uv",
          fill: "#3182bd",
          graphicalItemId: "area-uv",
          hide: false,
          name: "uv",
          nameKey: undefined,
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          stroke: "#3182bd",
          strokeWidth: 1,
          type: undefined,
          unit: "kg",
          value: 300,
        },
        {
          color: "#3182bd",
          dataKey: "pv",
          fill: "#3182bd",
          graphicalItemId: "area-pv",
          hide: false,
          name: "My custom name",
          nameKey: undefined,
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          stroke: "#3182bd",
          strokeWidth: 1,
          type: undefined,
          unit: "$$$",
          value: 1398,
        },
        {
          color: "#3182bd",
          dataKey: "amt",
          fill: "#3182bd",
          graphicalItemId: "area-amt",
          hide: false,
          name: "amt",
          nameKey: undefined,
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          stroke: "#3182bd",
          strokeWidth: 1,
          type: undefined,
          unit: undefined,
          value: 2400,
        },
      ],
      reverseDirection: { x: false, y: false },
      separator: " : ",
      trigger: "hover",
      useTranslate3d: false,
      wrapperStyle: {},
    });
  });
});
