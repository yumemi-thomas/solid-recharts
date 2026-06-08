// Ported from recharts 3.8.1 test/container/ClipPath.spec.tsx (commit
// 7a23854). Solid deviations: this batch covers the root clip path, the
// Line/Bar/Scatter overflow matrix, the Line clipDot=false second-clipPath
// dimension cases, and the Area animation clip path presence/absence.
import { describe, expect, it } from "vitest";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "../../src";
import { PageData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";
import { render } from "../helper/render";

function selectAllClipPaths(container: Element | null): NodeListOf<SVGRectElement> {
  assertNotNull(container);
  return container.querySelectorAll("clipPath rect");
}

function expectClipPathDimensions(
  clipPathElement: Element,
  expectedDimensions: { x: string; y: string; width: string; height: string },
): void {
  const actualDimensions = {
    x: clipPathElement.getAttribute("x"),
    y: clipPathElement.getAttribute("y"),
    width: clipPathElement.getAttribute("width"),
    height: clipPathElement.getAttribute("height"),
  };
  expect(actualDimensions).toEqual(expectedDimensions);
}

function expectClipPath(
  container: Element | null,
  expectedDimensions: { x: string; y: string; width: string; height: string },
): void {
  const allClipPaths = selectAllClipPaths(container);
  expect(allClipPaths).toHaveLength(1);
  const clipPath = allClipPaths[0];
  assertNotNull(clipPath);
  expectClipPathDimensions(clipPath, expectedDimensions);
}

describe("clip paths", () => {
  describe("in chart root", () => {
    it("should render clipPath with rect based on margin", () => {
      const { container } = render(() => (
        <BarChart width={500} height={500} margin={{ top: 11, right: 22, bottom: 44, left: 99 }} />
      ));
      expectClipPath(container, {
        height: "445",
        width: "379",
        x: "99",
        y: "11",
      });
    });
  });

  describe("in Line", () => {
    it("should render no clipPaths by default, and not clip the curve", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="pv" />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      expect(selectAllClipPaths(line)).toHaveLength(0);
      const curve = container.querySelector(".recharts-line-curve");
      assertNotNull(curve);
      expect(curve.getAttribute("clip-path")).toEqual(null);
    });

    it("should clip in X dimension if xAxis has allowDataOverflow = true, and should clip the curve", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="pv" />
          <XAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      expectClipPath(line, {
        height: "830",
        width: "379",
        x: "99",
        y: "-196.5",
      });
      assertNotNull(line);
      const clipPath = line.querySelector("clipPath");
      assertNotNull(clipPath);
      const clipPathId = clipPath.getAttribute("id");
      expect(clipPathId).toEqual(expect.stringMatching(/clipPath-recharts-line-/));
      const curve = container.querySelector(".recharts-line-curve");
      assertNotNull(curve);
      expect(curve.getAttribute("clip-path")).toEqual(`url(#${clipPathId})`);
    });

    it("should clip in Y dimension if yAxis has allowDataOverflow = true", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="pv" />
          <YAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      expectClipPath(line, {
        height: "445",
        width: "638",
        x: "-0.5",
        y: "11",
      });
    });

    it("should clip in both dimensions if both axes have allowDataOverflow = true", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="pv" />
          <XAxis allowDataOverflow />
          <YAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      expectClipPath(line, {
        height: "415",
        width: "319",
        x: "159",
        y: "11",
      });
    });

    it("should render another clipPath when dot has clipDot = false", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="uv" dot={{ clipDot: false }} />
          <YAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      const allClipPaths = selectAllClipPaths(line);
      expect(allClipPaths).toHaveLength(2);
      const dotClipPath = allClipPaths[1];
      assertNotNull(dotClipPath);
      expectClipPathDimensions(dotClipPath, {
        height: "453",
        width: "327",
        x: "155",
        y: "7",
      });
    });

    it("should change the dimensions of the second clipPath based on strokeWidth", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="uv" dot={{ "stroke-width": 13, clipDot: false }} />
          <YAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      const allClipPaths = selectAllClipPaths(line);
      expect(allClipPaths).toHaveLength(2);
      const dotClipPath = allClipPaths[1];
      assertNotNull(dotClipPath);
      expectClipPathDimensions(dotClipPath, {
        height: "464",
        width: "338",
        x: "149.5",
        y: "1.5",
      });
    });

    it("should change the dimensions of the second clipPath based on r", () => {
      const { container } = render(() => (
        <LineChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Line dataKey="uv" dot={{ r: 5, clipDot: false }} />
          <YAxis allowDataOverflow />
        </LineChart>
      ));
      const line = container.querySelector(".recharts-line");
      const allClipPaths = selectAllClipPaths(line);
      expect(allClipPaths).toHaveLength(2);
      const dotClipPath = allClipPaths[1];
      assertNotNull(dotClipPath);
      expectClipPathDimensions(dotClipPath, {
        height: "457",
        width: "331",
        x: "153",
        y: "5",
      });
    });
  });

  describe("in Bar", () => {
    it("should render no clipPaths by default, and not clip its layer", () => {
      const { container } = render(() => (
        <BarChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Bar dataKey="pv" />
        </BarChart>
      ));
      const bar = container.querySelector(".recharts-bar");
      assertNotNull(bar);
      expect(selectAllClipPaths(bar)).toHaveLength(0);
      const layer = bar.querySelector(".recharts-bar-rectangles");
      assertNotNull(layer);
      expect(layer.getAttribute("clip-path")).toBe(null);
    });

    it("should clip in X dimension if xAxis has allowDataOverflow = true, and clip its layer", () => {
      const { container } = render(() => (
        <BarChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Bar dataKey="pv" />
          <XAxis allowDataOverflow />
        </BarChart>
      ));
      const bar = container.querySelector(".recharts-bar");
      expectClipPath(bar, {
        height: "830",
        width: "379",
        x: "99",
        y: "-196.5",
      });
      assertNotNull(bar);
      const clipPath = bar.querySelector("clipPath");
      assertNotNull(clipPath);
      const clipPathId = clipPath.getAttribute("id");
      expect(clipPathId).toEqual(expect.stringMatching(/clipPath-recharts-bar-/));
      const layer = bar.querySelector(".recharts-bar-rectangles");
      assertNotNull(layer);
      expect(layer.getAttribute("clip-path")).toEqual(`url(#${clipPathId})`);
    });

    it("should clip in Y dimension if yAxis has allowDataOverflow = true", () => {
      const { container } = render(() => (
        <BarChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Bar dataKey="pv" />
          <YAxis allowDataOverflow />
        </BarChart>
      ));
      const bar = container.querySelector(".recharts-bar");
      expectClipPath(bar, {
        height: "445",
        width: "638",
        x: "-0.5",
        y: "11",
      });
    });

    it("should clip in both dimensions if both axes have allowDataOverflow = true", () => {
      const { container } = render(() => (
        <BarChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Bar dataKey="pv" />
          <XAxis allowDataOverflow />
          <YAxis allowDataOverflow />
        </BarChart>
      ));
      const bar = container.querySelector(".recharts-bar");
      expectClipPath(bar, {
        height: "415",
        width: "319",
        x: "159",
        y: "11",
      });
    });
  });

  describe("in Scatter", () => {
    it("should render no clipPaths by default, and not clip its layer", () => {
      const { container } = render(() => (
        <ScatterChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Scatter dataKey="pv" />
        </ScatterChart>
      ));
      const scatter = container.querySelector(".recharts-scatter");
      assertNotNull(scatter);
      expect(selectAllClipPaths(scatter)).toHaveLength(0);
      expect(scatter.getAttribute("clip-path")).toBe(null);
    });

    it("should clip in X dimension if xAxis has allowDataOverflow = true, and clip its layer", () => {
      const { container } = render(() => (
        <ScatterChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Scatter dataKey="pv" />
          <XAxis allowDataOverflow />
        </ScatterChart>
      ));
      const scatter = container.querySelector(".recharts-scatter");
      assertNotNull(scatter);
      expectClipPath(scatter, {
        height: "830",
        width: "379",
        x: "99",
        y: "-196.5",
      });
      const clipPath = scatter.querySelector("clipPath");
      assertNotNull(clipPath);
      const clipPathId = clipPath.getAttribute("id");
      expect(clipPathId).toEqual(expect.stringMatching(/clipPath-recharts-scatter-/));
      expect(scatter.getAttribute("clip-path")).toEqual(`url(#${clipPathId})`);
    });

    it("should clip in Y dimension if yAxis has allowDataOverflow = true", () => {
      const { container } = render(() => (
        <ScatterChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Scatter dataKey="pv" />
          <YAxis allowDataOverflow />
        </ScatterChart>
      ));
      const scatter = container.querySelector(".recharts-scatter");
      expectClipPath(scatter, {
        height: "445",
        width: "638",
        x: "-0.5",
        y: "11",
      });
    });

    it("should clip in both dimensions if both axes have allowDataOverflow = true", () => {
      const { container } = render(() => (
        <ScatterChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Scatter dataKey="pv" />
          <XAxis allowDataOverflow />
          <YAxis allowDataOverflow />
        </ScatterChart>
      ));
      const scatter = container.querySelector(".recharts-scatter");
      expectClipPath(scatter, {
        height: "415",
        width: "319",
        x: "159",
        y: "11",
      });
    });
  });

  describe("in Area", () => {
    it("should render one animation clipPaths by default", () => {
      const { container } = render(() => (
        <AreaChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Area dataKey="pv" />
        </AreaChart>
      ));
      const area = container.querySelector(".recharts-area");
      expectClipPath(area, {
        height: "457",
        width: "0",
        x: "99",
        y: "0",
      });
    });

    it("should not render any clipPaths if isAnimationActive=false", () => {
      const { container } = render(() => (
        <AreaChart
          width={500}
          height={500}
          margin={{ top: 11, right: 22, bottom: 44, left: 99 }}
          data={PageData}
        >
          <Area dataKey="pv" isAnimationActive={false} />
        </AreaChart>
      ));
      const area = container.querySelector(".recharts-area");
      expect(selectAllClipPaths(area)).toHaveLength(0);
    });
  });
});
