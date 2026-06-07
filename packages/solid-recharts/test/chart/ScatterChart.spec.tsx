// Ported from recharts 3.8.1 test/chart/ScatterChart.spec.tsx (commit
// 7a23854). Solid deviations: this first batch covers the base three-dimensional
// scatter render, clip path, empty data, and item mouse-enter callback.
import { describe, expect, test, vi } from "vitest";
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "../../src";
import { expectScatterPoints } from "../helper/expectScatterPoints";
import { assertNotNull } from "../helper/assertNotNull";
import { fireEvent, render } from "../helper/render";

describe("ScatterChart of three dimension data", () => {
  const data01 = [
    { x: 100, y: 200, z: 200 },
    { x: 120, y: 100, z: 260 },
    { x: 170, y: 300, z: 400 },
    { x: 140, y: 250, z: 280 },
    { x: 150, y: 400, z: 500 },
    { x: 110, y: 280, z: 200 },
  ];

  const data02 = [
    { x: 200, y: 260, z: 240 },
    { x: 240, y: 290, z: 220 },
    { x: 190, y: 290, z: 250 },
    { x: 198, y: 250, z: 210 },
    { x: 180, y: 280, z: 260 },
    { x: 210, y: 220, z: 230 },
  ];

  test("Render 2 Scatter", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={data01} fillOpacity={0.3} fill="#ff7300" />
        <Scatter name="B school" data={data02} fill="#347300" />
        <Tooltip />
        <Legend />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".recharts-scatter")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(
      data01.length + data02.length,
    );
    expect(container.querySelectorAll(".recharts-scatter-symbol path")).toHaveLength(
      data01.length + data02.length,
    );

    expectScatterPoints(container, [
      {
        cx: "73.33333333333333",
        cy: "185",
        d: "M0,0",
        height: "3.638913473173784",
        transform: "translate(73.33333333333333, 185)",
        width: "3.638913473173784",
      },
      {
        cx: "100",
        cy: "267.5",
        d: "M0,0",
        height: "3.960594802695323",
        transform: "translate(100, 267.5)",
        width: "3.960594802695323",
      },
      {
        cx: "126.66666666666667",
        cy: "102.5",
        d: "M0,0",
        height: "4.624978308224887",
        transform: "translate(126.66666666666667, 102.5)",
        width: "4.624978308224887",
      },
      {
        cx: "153.33333333333334",
        cy: "143.75",
        d: "M0,0",
        height: "4.062165001543845",
        transform: "translate(153.33333333333334, 143.75)",
        width: "4.062165001543845",
      },
      {
        cx: "180.00000000000003",
        cy: "20",
        d: "M0,0",
        height: "5.046265044040321",
        transform: "translate(180.00000000000003, 20)",
        width: "5.046265044040321",
      },
      {
        cx: "206.66666666666669",
        cy: "119.00000000000001",
        d: "M0,0",
        height: "3.638913473173784",
        transform: "translate(206.66666666666669, 119.00000000000001)",
        width: "3.638913473173784",
      },
      {
        cx: "73.33333333333333",
        cy: "135.5",
        d: "M0,0",
        height: "3.8563503319209342",
        transform: "translate(73.33333333333333, 135.5)",
        width: "3.8563503319209342",
      },
      {
        cx: "100",
        cy: "110.75000000000001",
        d: "M0,0",
        height: "3.749208526326083",
        transform: "translate(100, 110.75000000000001)",
        width: "3.749208526326083",
      },
      {
        cx: "126.66666666666667",
        cy: "110.75000000000001",
        d: "M0,0",
        height: "3.9088200952233594",
        transform: "translate(126.66666666666667, 110.75000000000001)",
        width: "3.9088200952233594",
      },
      {
        cx: "153.33333333333334",
        cy: "143.75",
        d: "M0,0",
        height: "3.694472617243352",
        transform: "translate(153.33333333333334, 143.75)",
        width: "3.694472617243352",
      },
      {
        cx: "180.00000000000003",
        cy: "119.00000000000001",
        d: "M0,0",
        height: "3.960594802695323",
        transform: "translate(180.00000000000003, 119.00000000000001)",
        width: "3.960594802695323",
      },
      {
        cx: "206.66666666666669",
        cy: "168.49999999999997",
        d: "M0,0",
        height: "3.803156745151513",
        transform: "translate(206.66666666666669, 168.49999999999997)",
        width: "3.803156745151513",
      },
    ]);
  });

  test("should render clipPath if one of axes has allowDataOverflow=true", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <XAxis dataKey="x" name="stature" unit="cm" allowDataOverflow />
        <YAxis dataKey="y" name="weight" unit="kg" allowDataOverflow />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={[]} fillOpacity={0.3} fill="#ff7300" />
        <Tooltip />
        <Legend layout="vertical" />
      </ScatterChart>
    ));

    const clipPath = container.querySelector("clipPath rect");
    assertNotNull(clipPath);
    expect(clipPath.getAttributeNames().sort()).toEqual(["height", "width", "x", "y"]);
    expect(clipPath).toHaveAttribute("width", "280");
    expect(clipPath).toHaveAttribute("height", "330");
    expect(clipPath).toHaveAttribute("x", "100");
    expect(clipPath).toHaveAttribute("y", "10");
  });

  test("Don't render any symbols when data is empty", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={[]} fillOpacity={0.3} fill="#ff7300" />
        <Tooltip />
        <Legend layout="vertical" />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".recharts-symbol")).toHaveLength(0);
  });

  test("mouse enter on scatter symbol should call onMouseEnter from props", () => {
    const onMouseEnter = vi.fn();
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter
          name="A school"
          data={data01}
          fillOpacity={0.3}
          fill="#ff7300"
          onMouseEnter={onMouseEnter}
        />
        <Scatter name="B school" data={data02} fill="#347300" />
        <Tooltip />
        <Legend />
      </ScatterChart>
    ));

    const symbol = container.querySelectorAll(".recharts-scatter-symbol")[0];
    assertNotNull(symbol);
    fireEvent.mouseEnter(symbol);

    expect(onMouseEnter).toHaveBeenCalled();
  });
});
