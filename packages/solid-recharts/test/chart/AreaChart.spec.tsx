// Port of recharts 3.8.1 test/chart/AreaChart.spec.tsx (commit 7a23854).
//
// Tier A (byte-identical DOM assertions): simple monotone path, single-dot, no-path
// on a non-matching dataKey, stacked (4 paths), vertical chart path, dots+labels,
// empty data, stacked-null-as-0 (connectNulls), plus the layout-context cases
// (viewBox / clipPathId / width / height). Geometry mirrors the reference setup
// exactly (mockGetBoundingClientRect 100x100, width=100 height=50, monotone curve).
//
// PERMANENT-N/A (not ported): stacked-percentage / stacked-number / stackId-number
// cases assert via a render-spy on selectors at intermediate render boundaries
// (recharts <Customized>/spy + render-count); the value-equivalents live in the
// stacked rendering spec. activeDot ReactElement/function + ranged active dots need
// Tooltip-hover + fake timers + RANGE areas (range area is a deferred Area feature).
//
// Solid deviations: `render(() => …)` + `flush()` (the area registers via an effect
// and its points compute from the microtask-batched store); `createEffect(compute,
// effect)` for context spies. Any reactive-graph diagnostic fired during the test
// fails it via the global guard in test/setup.ts.
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { createEffect } from "solid-js";
import { render } from "@solidjs/testing-library";
import { AreaChart, Area, XAxis, YAxis } from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectAreaCurve } from "../helper/expectAreaCurve";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { PageData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";

const data = [
  { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
  { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
  { name: "Page D", uv: 200, pv: 9800, amt: 2400 },
  { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
  { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
];

describe("<AreaChart />", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  test("Renders 2 path in simple AreaChart", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data}>
        <Area
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(1);

    expectAreaCurve(container, [
      {
        d: "M5,5C11,10,17,15,23,15C29,15,35,15,41,15C47,15,53,25,59,25C65,25,71,17.2,77,17.2C83,17.2,89,21.65,95,26.1",
      },
    ]);
  });

  test("Renders 1 dot when data only have one element", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data.slice(0, 1)}>
        <Area
          type="monotone"
          dataKey="pv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-area-dot")).toHaveLength(1);
    expectAreaCurve(container, []);
  });

  test("Renders no path when dataKey does not match the source data", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data}>
        <Area
          type="monotone"
          dataKey="any"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(0);
  });

  test("Renders 4 path in a stacked AreaChart", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data}>
        <Area
          type="monotone"
          dataKey="uv"
          stackId="test"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="pv"
          stackId="test"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(2);

    expectAreaCurve(container, [
      {
        d: "M5,43.4C11,43.6,17,43.8,23,43.8C29,43.8,35,43.8,41,43.8C47,43.8,53,44.2,59,44.2C65,44.2,71,43.888,77,43.888C83,43.888,89,44.066,95,44.244",
      },
      {
        d: "M5,33.8C11,29.666,17,25.532,23,25.532C29,25.532,35,38.208,41,38.208C47,38.208,53,5,59,5C65,5,71,28.256,77,28.256C83,28.256,89,26.65,95,25.044",
      },
    ]);
  });

  test("Renders a path in a vertical AreaChart", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" />
        <Area
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(1);

    expectAreaCurve(container, [
      {
        d: "M95,5C91.25,5.667,87.5,6.333,87.5,7C87.5,7.667,87.5,8.333,87.5,9C87.5,9.667,80,10.333,80,11C80,11.667,85.85,12.333,85.85,13C85.85,13.667,82.513,14.333,79.175,15",
      },
    ]);
  });

  test("Renders dots and labels when dot is set to true", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={data}>
        <Area
          isAnimationActive={false}
          type="monotone"
          dot
          label
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-dots")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-area-dot")).toHaveLength(6);
    expect(container.querySelectorAll(".recharts-label-list")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(6);
  });

  test("Render empty when data is empty", () => {
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={[]}>
        <Area
          type="monotone"
          dot
          label
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-area-dots")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label-list")).toHaveLength(0);
  });

  test("Renders null points as 0 if stacked and connectNulls is true", () => {
    const dataWithNullPV = [
      { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
      { name: "Page B", uv: 300, amt: 2400 },
      { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
    ];
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={dataWithNullPV}>
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="pv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="amt"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));
    expectAreaCurve(container, [
      { d: "M5,42.333C20,42.667,35,43,50,43C65,43,80,43,95,43" },
      { d: "M5,26.333C20,34.667,35,43,50,43C65,43,80,38.34,95,33.68" },
      { d: "M5,10.333C20,18.667,35,27,50,27C65,27,80,22.34,95,17.68" },
    ]);
  });

  test("connects across points where every stacked series is null if connectNulls is true", () => {
    const dataWithAllNullPageB = [
      { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
      { name: "Page B" },
      { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
    ];
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={dataWithAllNullPageB}>
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="pv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          connectNulls
          type="monotone"
          dataKey="amt"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));

    container.querySelectorAll(".recharts-area-curve").forEach((path) => {
      const d = path.getAttribute("d");
      assertNotNull(d);
      const commands = [...d.matchAll(/[a-zA-Z][\d ,.-]+/g)];
      expect(commands).toHaveLength(2);
      expect(d.startsWith("M5,")).toBe(true);
    });
  });

  test("breaks at points where every stacked series is null if connectNulls is false", () => {
    const dataWithAllNullPageB = [
      { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
      { name: "Page B" },
      { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
    ];
    const { container } = render(() => (
      <AreaChart width={100} height={50} data={dataWithAllNullPageB}>
        <Area
          stackId="1"
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          type="monotone"
          dataKey="pv"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
        <Area
          stackId="1"
          type="monotone"
          dataKey="amt"
          stroke="#ff7300"
          fill="#ff7300"
          isAnimationActive={false}
        />
      </AreaChart>
    ));

    container.querySelectorAll(".recharts-area-curve").forEach((path) => {
      const d = path.getAttribute("d");
      assertNotNull(d);
      expect([...d.matchAll(/M/g)].length).toBeGreaterThan(1);
    });
  });

  describe("AreaChart layout context", () => {
    it("should provide viewBox", () => {
      const spy = vi.fn();
      const Comp = () => {
        const vb = useViewBox();
        createEffect(() => {
          const value = (() => vb())();
          ((v) => spy(v))(value);
        });
        return null;
      };
      render(() => (
        <AreaChart width={100} height={50} barSize={20}>
          <Comp />
        </AreaChart>
      ));
      expect(spy).toHaveBeenCalledWith({ x: 5, y: 5, width: 90, height: 40 });
    });

    it("should provide clipPathId", () => {
      const spy = vi.fn();
      const Comp = () => {
        spy(useClipPathId());
        return null;
      };
      render(() => (
        <AreaChart width={100} height={50} barSize={20}>
          <Comp />
        </AreaChart>
      ));
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/recharts\d+-clip/));
    });

    it("should provide width", () => {
      const spy = vi.fn();
      const Comp = () => {
        const w = useChartWidth();
        createEffect(() => {
          const value = (() => w())();
          ((v) => spy(v))(value);
        });
        return null;
      };
      render(() => (
        <AreaChart width={100} height={50} barSize={20}>
          <Comp />
        </AreaChart>
      ));
      expect(spy).toHaveBeenCalledWith(100);
    });

    it("should provide height", () => {
      const spy = vi.fn();
      const Comp = () => {
        const h = useChartHeight();
        createEffect(() => {
          const value = (() => h())();
          ((v) => spy(v))(value);
        });
        return null;
      };
      render(() => (
        <AreaChart width={100} height={50} barSize={20}>
          <Comp />
        </AreaChart>
      ));
      expect(spy).toHaveBeenCalledWith(50);
    });
  });

  // Solid-native rendering checks retained from the original subset port (these
  // pin the dot rendering / default-no-dots behaviour with the margin-based geometry).
  it("renders 1 filled area in a simple AreaChart", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" isAnimationActive={false} />
      </AreaChart>
    ));
    const areas = container.querySelectorAll(".recharts-area .recharts-area-area");
    expect(areas).toHaveLength(1);
    const area = areas[0];
    expect(area).toHaveAttribute("class", "recharts-curve recharts-area-area");
    expect(area).toHaveAttribute("fill", "#ff7300");
    expect(area).toHaveAttribute(
      "d",
      "M20,20L92,110L164,110L236,200L308,129.8L380,209.9L380,380L308,380L236,380L164,380L92,380L20,380Z",
    );
  });

  it("renders one dot per point when dot is enabled", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" dot isAnimationActive={false} />
      </AreaChart>
    ));
    const dotsLayer = container.querySelector(".recharts-area-dots");
    expect(dotsLayer).not.toBeNull();
    const dots = container.querySelectorAll(".recharts-area-dots .recharts-area-dot");
    expect(dots).toHaveLength(PageData.length);
    expect(dots[0]!.getAttribute("cx")).toBe("20");
    expect(dots[0]!.getAttribute("cy")).toBe("20");
  });

  it("renders a custom dot via the dot render prop (function form)", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area
          dataKey="uv"
          fill="#ff7300"
          isAnimationActive={false}
          dot={(p) => <rect class="custom-dot" x={p.cx} y={p.cy} width={2} height={2} />}
        />
      </AreaChart>
    ));
    expect(container.querySelectorAll(".recharts-area-dots rect.custom-dot")).toHaveLength(
      PageData.length,
    );
  });

  it("renders no dots by default", () => {
    const { container } = render(() => (
      <AreaChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Area dataKey="uv" fill="#ff7300" isAnimationActive={false} />
      </AreaChart>
    ));
    expect(container.querySelector(".recharts-area-dot")).toBeNull();
  });
});
