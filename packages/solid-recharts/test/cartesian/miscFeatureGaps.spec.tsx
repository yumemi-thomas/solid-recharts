// Solid-recharts spec for smaller audit gaps: PolarGrid background fill,
// CartesianGrid object-form horizontal/vertical, and chart-level role/tabIndex
// passthrough onto the root <svg>.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "../../src";
import { render } from "../helper/render";

const data = [
  { name: "a", uv: 100 },
  { name: "b", uv: 200 },
  { name: "c", uv: 300 },
];
const radarData = [
  { subject: "Math", v: 120 },
  { subject: "Eng", v: 98 },
  { subject: "Hist", v: 86 },
];

describe("PolarGrid background fill", () => {
  it("renders a filled outer ring when fill is set", () => {
    const { container } = render(() => (
      <RadarChart width={300} height={300} data={radarData}>
        <PolarGrid gridType="circle" fill="#abcdef" fillOpacity={0.3} />
        <Radar dataKey="v" />
      </RadarChart>
    ));
    flush();
    const filled = Array.from(
      container.querySelectorAll(".recharts-polar-grid-concentric circle"),
    ).filter((c) => c.getAttribute("fill") === "#abcdef");
    expect(filled.length).toBe(1);
    expect(filled[0]?.getAttribute("fill-opacity")).toBe("0.3");
  });

  it("renders no filled ring by default", () => {
    const { container } = render(() => (
      <RadarChart width={300} height={300} data={radarData}>
        <PolarGrid gridType="circle" />
        <Radar dataKey="v" />
      </RadarChart>
    ));
    flush();
    const filled = Array.from(
      container.querySelectorAll(".recharts-polar-grid-concentric circle"),
    ).filter((c) => c.getAttribute("fill") !== "none");
    expect(filled.length).toBe(0);
  });
});

describe("CartesianGrid object-form horizontal/vertical", () => {
  it("spreads object-form svg props onto the grid lines", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <CartesianGrid horizontal={{ strokeWidth: 4 }} vertical={false} />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    const hLines = container.querySelectorAll(".recharts-cartesian-grid-horizontal line");
    expect(hLines.length).toBeGreaterThan(0);
    hLines.forEach((l) => expect(l.getAttribute("stroke-width")).toBe("4"));
  });
});

describe("chart role / tabIndex passthrough", () => {
  it("applies role and tabIndex to the root svg", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data} role="img" tabIndex={5}>
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    const svg = container.querySelector("svg.recharts-surface");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("tabindex")).toBe("5");
  });
});
