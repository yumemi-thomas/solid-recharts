// Subset port of recharts 3.8.1 test/chart/BarChart.spec.tsx (commit 7a23854) —
// the payoff of the Bar vertical: rectangles drawn from data via the band scale.
//
// Minimal/Tier-A-adapted: asserts the parity-critical facts (one
// `.recharts-bar-rectangle` per data point, inside `.recharts-bar`, with sane
// geometry). The full spec (background bars, stacks, labels, animation, exact
// per-bar coords) comes online when those features land. `flush()` after render
// because the bar registers via an effect and its rectangles compute from the store.
import { describe, expect, it, vi } from "vitest";
import { createEffect, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { BarChart, Bar, Tooltip, XAxis, YAxis } from "../../src";
import type { BarChartProps } from "../../src";
import { PageData } from "../_data";
import {
  useChartHeight,
  useChartWidth,
  useOffsetInternal,
  useViewBox,
} from "../../src/context/chartLayoutContext";
import { useOffset, usePlotArea } from "../../src/hooks";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { expectBars } from "../helper/expectBars";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { assertNotNull } from "../helper/assertNotNull";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

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
