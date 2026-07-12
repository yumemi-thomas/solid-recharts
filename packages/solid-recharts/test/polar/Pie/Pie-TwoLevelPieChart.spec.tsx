// Ported from recharts 3.8.1 test/polar/Pie/Pie-TwoLevelPieChart.spec.tsx.
// Two concentric Pies, each with a function-form `activeShape`. Hovering a
// sector of one Pie activates only THAT Pie's sector (the active index is
// matched per graphical-item id + dataKey), so at most one `.customized-active-shape`
// is rendered at a time. Solid uses `fireEvent.mouseEnter` + `flush()` to drive
// the item-hover state (recharts uses `fireEvent.mouseOver`).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { Pie, PieChart, Sector } from "../../../src";
import type { PieSectorShapeProps } from "../../../src/polar/Pie";
import { render, fireEvent } from "../../helper/render";

const data1 = [
  { name: "Group A", value: 400 },
  { name: "Group B", value: 300 },
  { name: "Group C", value: 300 },
  { name: "Group D", value: 200 },
];

const data2 = [
  { name: "A1", value: 100 },
  { name: "A2", value: 300 },
  { name: "B1", value: 100 },
  { name: "B2", value: 200 },
  { name: "C1", value: 200 },
  { name: "C2", value: 100 },
];

describe("TwoLevelPieChart with activeShape", () => {
  it("should only show active shape for the hovered pie component", () => {
    const renderActiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
      <Sector {...props} fill="#ff7300" class="customized-active-shape" />
    );

    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          isAnimationActive={false}
          activeShape={renderActiveShape}
          data={data1}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        />
        <Pie
          isAnimationActive={false}
          activeShape={renderActiveShape}
          data={data2}
          cx={200}
          cy={200}
          innerRadius={100}
          outerRadius={140}
          fill="#82ca9d"
          dataKey="value"
        />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(0);
    const allSectors = container.querySelectorAll(".recharts-pie-sector");
    expect(allSectors).toHaveLength(data1.length + data2.length);

    fireEvent.mouseEnter(allSectors[0]!);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);

    const innerPieSector = allSectors[data1.length]!; // first sector of the inner pie
    fireEvent.mouseEnter(innerPieSector);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);

    fireEvent.mouseLeave(innerPieSector);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(0);
  });

  it("should correctly identify sectors from different pies when they have different dataKeys", () => {
    const data1WithDifferentKey = [
      { name: "Group A", uv: 400 },
      { name: "Group B", uv: 300 },
    ];
    const data2WithDifferentKey = [
      { name: "A1", pv: 100 },
      { name: "A2", pv: 300 },
    ];

    const renderActiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
      <Sector {...props} fill="#ff7300" class="customized-active-shape" />
    );

    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          isAnimationActive={false}
          activeShape={renderActiveShape}
          data={data1WithDifferentKey}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#8884d8"
          dataKey="uv"
        />
        <Pie
          isAnimationActive={false}
          activeShape={renderActiveShape}
          data={data2WithDifferentKey}
          cx={200}
          cy={200}
          innerRadius={100}
          outerRadius={140}
          fill="#82ca9d"
          dataKey="pv"
        />
      </PieChart>
    ));
    flush();

    const allSectors = container.querySelectorAll(".recharts-pie-sector");

    fireEvent.mouseEnter(allSectors[0]!);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);

    fireEvent.mouseEnter(allSectors[2]!);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);

    fireEvent.mouseLeave(allSectors[2]!);
    flush();
    expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(0);
  });
});
