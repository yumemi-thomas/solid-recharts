// Ported from recharts 3.8.1 test/chart/AccessibilityScans.spec.tsx (commit
// 7a23854).
//
// Harness deviations: React `render` -> Solid `render(() => <…/>)` + `flush()`;
// @testing-library/react -> the repo's local testing-library at ../helper/render.
//
// The reference spec's PRIMARY assertion in every case is
// `expect((await axe(container)).violations).toEqual([])`, which depends on the
// `vitest-axe` / `axe-core` packages. Those packages are NOT installed in this
// repo, so the static a11y-violation scan cannot run. Ported here are only the
// cases that carry a SECONDARY, framework-independent assertion: the root-SVG
// `role="application"` attribute (and its absence under
// `accessibilityLayer={false}`), plus the Scatter point geometry. Cases whose
// ONLY assertion is the axe scan (Sankey, Sunburst, Treemap, and the combined
// tooltip/legend/axes/brush/grid/margins chart) are intentionally not ported —
// they would be assertion-less without `axe`.
import { flush } from "solid-js";
import { describe, expect, test } from "vitest";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Funnel,
  FunnelChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "../../src";
import { PageData as data } from "../_data";
import { expectScatterPoints } from "../helper/expectScatterPoints";
import { render } from "../helper/render";

describe("Static scanning for accessibility markup issues", () => {
  test("Area chart", () => {
    render(() => (
      <AreaChart width={100} height={50} data={data}>
        <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
      </AreaChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("chart with accessibilityLayer", () => {
    render(() => (
      <AreaChart width={100} height={50} data={data} accessibilityLayer>
        <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
      </AreaChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("chart with accessibilityLayer=false", () => {
    render(() => (
      <AreaChart width={100} height={50} data={data} accessibilityLayer={false}>
        <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
      </AreaChart>
    ));
    flush();
    expect(document.querySelector("svg")).not.toHaveAttribute("role");
  });

  test("Bar chart", () => {
    render(() => (
      <BarChart width={100} height={50} data={data}>
        <Bar dataKey="uv" fill="#ff7300" />
      </BarChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Funnel chart", () => {
    render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} />
      </FunnelChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Line chart", () => {
    render(() => (
      <LineChart width={400} height={400} data={data}>
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Pie chart", () => {
    render(() => (
      <PieChart width={800} height={400}>
        <Pie dataKey="value" data={[data[0]]} cx={200} cy={200} outerRadius={80} fill="#ff7300" />
      </PieChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Radar chart", () => {
    render(() => (
      <RadarChart cx={300} cy={250} outerRadius={150} width={600} height={500} data={data}>
        <Radar dataKey="value" />
      </RadarChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Radial bar chart", () => {
    render(() => (
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
        <RadialBar dataKey="uv" isAnimationActive={false} />
      </RadialBarChart>
    ));
    flush();
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });

  test("Scatter chart", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="uv" name="stature" unit="cm" />
        <YAxis dataKey="pv" name="weight" unit="kg" />
        <Scatter line name="A school" data={data} fill="#ff7300" />
        <Tooltip />
      </ScatterChart>
    ));
    flush();
    expectScatterPoints(container, [
      {
        cx: "92.5",
        cy: "278.59999999999997",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(92.5, 278.59999999999997)",
        width: "9.0270333367641",
      },
      {
        cx: "147.5",
        cy: "200.588",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(147.5, 200.588)",
        width: "9.0270333367641",
      },
      {
        cx: "202.5",
        cy: "314.672",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(202.5, 314.672)",
        width: "9.0270333367641",
      },
      {
        cx: "257.5",
        cy: "12.200000000000006",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(257.5, 12.200000000000006)",
        width: "9.0270333367641",
      },
      {
        cx: "312.5",
        cy: "224.31199999999998",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(312.5, 224.31199999999998)",
        width: "9.0270333367641",
      },
      {
        cx: "367.5",
        cy: "192.20000000000002",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(367.5, 192.20000000000002)",
        width: "9.0270333367641",
      },
    ]);
    expect(document.querySelector("svg")).toHaveAttribute("role", "application");
  });
});
