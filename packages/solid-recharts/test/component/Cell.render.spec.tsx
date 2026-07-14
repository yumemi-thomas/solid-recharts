// Proves the CellReader port: <Cell> children supply per-element presentation
// overrides (fill / stroke / class) to Bar, Pie, and RadialBar. The Solid port
// can't introspect children element-types like React's findAllByType — instead
// each <Cell> registers its props during synchronous child resolution
// (collectCells). `isAnimationActive={false}` keeps shapes at final geometry.
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Cell,
} from "../../src";

const data = [
  { name: "A", value: 100 },
  { name: "B", value: 200 },
  { name: "C", value: 300 },
];

describe("<Cell /> presentation overrides", () => {
  it("colors each Bar rectangle from its matching Cell", () => {
    const colors = ["#111111", "#222222", "#333333"];
    const { container } = render(() => (
      <BarChart width={400} height={400} data={data}>
        <Bar dataKey="value" fill="#888888" isAnimationActive={false}>
          {data.map((_entry, i) => (
            <Cell fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    ));
    const rects = [
      ...container.querySelectorAll(
        ".recharts-bar .recharts-bar-rectangle path.recharts-rectangle",
      ),
    ];
    expect(rects).toHaveLength(data.length);
    rects.forEach((r, i) => {
      expect(r).toHaveAttribute("fill", colors[i]!);
    });
  });

  it("falls back to the Bar fill when a Cell omits it", () => {
    const { container } = render(() => (
      <BarChart width={400} height={400} data={data}>
        <Bar dataKey="value" fill="#888888" isAnimationActive={false}>
          {data.map((_entry, i) => (
            <Cell stroke={i === 0 ? "#ff0000" : undefined} />
          ))}
        </Bar>
      </BarChart>
    ));
    const rects = [
      ...container.querySelectorAll(
        ".recharts-bar .recharts-bar-rectangle path.recharts-rectangle",
      ),
    ];
    // No Cell sets fill → all keep the Bar's fill.
    rects.forEach((r) => expect(r).toHaveAttribute("fill", "#888888"));
    // Only the first Cell sets a stroke.
    expect(rects[0]).toHaveAttribute("stroke", "#ff0000");
  });

  it("colors each Pie sector from its matching Cell", () => {
    const colors = ["#aa0000", "#00bb00", "#0000cc"];
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie
          dataKey="value"
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          isAnimationActive={false}
        >
          {data.map((_entry, i) => (
            <Cell fill={colors[i]} />
          ))}
        </Pie>
      </PieChart>
    ));
    const sectors = [...container.querySelectorAll(".recharts-pie-sector .recharts-sector")];
    expect(sectors).toHaveLength(data.length);
    sectors.forEach((s, i) => {
      expect(s).toHaveAttribute("fill", colors[i]!);
    });
  });

  it("applies a Cell className to each RadialBar sector", () => {
    const { container } = render(() => (
      <RadialBarChart
        width={500}
        height={300}
        cx={150}
        cy={150}
        innerRadius={20}
        outerRadius={140}
        barSize={10}
        data={data}
      >
        <RadialBar dataKey="value" isAnimationActive={false}>
          {data.map(() => (
            <Cell class="unit-test-class" />
          ))}
        </RadialBar>
      </RadialBarChart>
    ));
    expect(container.querySelectorAll(".unit-test-class")).toHaveLength(data.length);
  });

  it("colors each Scatter symbol from its matching Cell", () => {
    const scatterData = [
      { x: 100, y: 200 },
      { x: 120, y: 100 },
      { x: 170, y: 300 },
    ];
    const colors = ["#aa0000", "#00bb00", "#0000cc"];
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" />
        <YAxis type="number" dataKey="y" />
        <Scatter data={scatterData} fill="#888888" isAnimationActive={false}>
          {scatterData.map((_entry, i) => (
            <Cell fill={colors[i]} />
          ))}
        </Scatter>
      </ScatterChart>
    ));
    const paths = [...container.querySelectorAll(".recharts-scatter-symbol path")];
    expect(paths).toHaveLength(scatterData.length);
    paths.forEach((p, i) => {
      expect(p).toHaveAttribute("fill", colors[i]!);
    });
  });

  it("accepts attributes used by different SVG shape elements", () => {
    const { container } = render(() => (
      <Cell width={20} height={10} rx={4} cx={5} cy={6} d="M0,0L1,1" />
    ));

    expect(container).toBeEmptyDOMElement();
  });
});
