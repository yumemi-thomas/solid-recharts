// Solid-recharts spec: range areas — when an Area's dataKey returns a [low, high]
// tuple, computeArea flips `isRange` on, the band spans low→high, and recharts
// strokes BOTH edges (a second `.recharts-area-curve` over the baseLine). Ported
// behaviour of recharts test/chart/AreaChart.spec.tsx "Renders two active dots for
// ranged Area chart on hover", plus a structural assertion on the two edge curves.
import { beforeEach, describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { Area, AreaChart, Tooltip, XAxis, YAxis } from "../../src";
import { rangeData } from "../_data";
import { render } from "@solidjs/testing-library";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { areaChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";

describe("range Area (dataKey → [low, high])", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  it("strokes both edges of the band (two area curves)", () => {
    const { container } = render(() => (
      <AreaChart width={400} height={400} data={rangeData}>
        <Area type="monotone" dataKey="temperature" stroke="#8884d8" fill="#8884d8" />
        <XAxis dataKey="day" />
        <YAxis />
      </AreaChart>
    ));
    flush();
    flush();
    // Top edge + lower (baseLine) edge = 2 stroked curves; a scalar area has 1.
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(2);
  });

  it("renders two active dots on hover", () => {
    const { container } = render(() => (
      <AreaChart width={400} height={400} data={rangeData}>
        <Area
          type="monotone"
          dataKey="temperature"
          stroke="#8884d8"
          fill="#8884d8"
          activeDot={{ class: "customized-active-dot", r: 8, stroke: "red" }}
        />
        <Tooltip />
      </AreaChart>
    ));
    flush();
    flush();
    showTooltip(container, areaChartMouseHoverTooltipSelector);

    expect(container.querySelectorAll(".customized-active-dot")).toHaveLength(2);
    expect(container.querySelector(".recharts-tooltip-wrapper")).not.toBeNull();
  });
});
