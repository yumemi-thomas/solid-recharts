// Solid-recharts spec: components expose a `zIndex` prop wired to the chart's
// z-index portal system (ZIndexLayer). A custom zIndex relocates the element into
// a dedicated `.recharts-zIndex-layer_<n>` portal. recharts supports these props
// but does not unit-test them on these components.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import {
  Area,
  AreaChart,
  ErrorBar,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  Scatter,
  ScatterChart,
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

function portalContains(container: Element, zIndex: number, childSelector: string): boolean {
  const portal = container.querySelector(`.recharts-zIndex-layer_${zIndex}`);
  return portal != null && portal.querySelector(childSelector) != null;
}

describe("component zIndex prop", () => {
  it("ReferenceLine relocates into the requested z-index portal", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" />
        <ReferenceLine y={150} zIndex={1201} />
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1201, ".recharts-reference-line")).toBe(true);
  });

  it("ReferenceDot relocates into the requested z-index portal", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" />
        <ReferenceDot x="b" y={200} r={6} zIndex={1202} />
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1202, ".recharts-reference-dot")).toBe(true);
  });

  it("ReferenceArea relocates into the requested z-index portal", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" />
        <ReferenceArea x1="a" x2="c" y1={0} y2={300} zIndex={1203} />
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1203, ".recharts-reference-area")).toBe(true);
  });

  it("ErrorBar relocates into the requested z-index portal", () => {
    const errData = [
      { name: "a", uv: 100, err: 10 },
      { name: "b", uv: 200, err: 20 },
      { name: "c", uv: 300, err: 30 },
    ];
    const { container } = render(() => (
      <LineChart width={300} height={300} data={errData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv">
          <ErrorBar dataKey="err" zIndex={1205} />
        </Line>
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1205, ".recharts-errorBar")).toBe(true);
  });

  it("XAxis relocates into the requested z-index portal", () => {
    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" zIndex={1206} />
        <YAxis />
        <Line dataKey="uv" />
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1206, ".recharts-xAxis")).toBe(true);
  });

  it("PolarGrid relocates into the requested z-index portal", () => {
    const { container } = render(() => (
      <RadarChart width={300} height={300} data={radarData}>
        <PolarGrid zIndex={1204} />
        <Radar dataKey="v" />
      </RadarChart>
    ));
    flush();
    expect(portalContains(container, 1204, ".recharts-polar-grid")).toBe(true);
  });
});

// The graphical items (Line/Area/Scatter/Pie/Radar/RadialBar) each wrap their whole
// item Layer in <ZIndexLayer> with a non-zero DEFAULT (areas:100, bars:300, lines:400,
// scatters:600 — Pie/Radar reuse area, RadialBar reuses bar), so a user `zIndex`
// relayers the entire item into its portal (recharts parity). These assert both the
// default portal placement AND a custom `zIndex` relocation.
describe("graphical item zIndex relayering", () => {
  it("Line renders in its default (400) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ));
    flush();
    expect(portalContains(dflt, 400, ".recharts-line")).toBe(true);

    const { container } = render(() => (
      <LineChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" zIndex={1210} isAnimationActive={false} />
      </LineChart>
    ));
    flush();
    expect(portalContains(container, 1210, ".recharts-line")).toBe(true);
  });

  it("Area renders in its default (100) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <AreaChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Area dataKey="uv" isAnimationActive={false} />
      </AreaChart>
    ));
    flush();
    expect(portalContains(dflt, 100, ".recharts-area")).toBe(true);

    const { container } = render(() => (
      <AreaChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Area dataKey="uv" zIndex={1211} isAnimationActive={false} />
      </AreaChart>
    ));
    flush();
    expect(portalContains(container, 1211, ".recharts-area")).toBe(true);
  });

  it("Scatter renders in its default (600) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <ScatterChart width={300} height={300}>
        <XAxis dataKey="name" />
        <YAxis dataKey="uv" />
        <Scatter data={data} dataKey="uv" isAnimationActive={false} />
      </ScatterChart>
    ));
    flush();
    expect(portalContains(dflt, 600, ".recharts-scatter")).toBe(true);

    const { container } = render(() => (
      <ScatterChart width={300} height={300}>
        <XAxis dataKey="name" />
        <YAxis dataKey="uv" />
        <Scatter data={data} dataKey="uv" zIndex={1212} isAnimationActive={false} />
      </ScatterChart>
    ));
    flush();
    expect(portalContains(container, 1212, ".recharts-scatter")).toBe(true);
  });

  it("Pie renders in its default (100) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <PieChart width={300} height={300}>
        <Pie data={data} dataKey="uv" isAnimationActive={false} />
      </PieChart>
    ));
    flush();
    expect(portalContains(dflt, 100, ".recharts-pie")).toBe(true);

    const { container } = render(() => (
      <PieChart width={300} height={300}>
        <Pie data={data} dataKey="uv" zIndex={1213} isAnimationActive={false} />
      </PieChart>
    ));
    flush();
    expect(portalContains(container, 1213, ".recharts-pie")).toBe(true);
  });

  it("Radar renders in its default (100) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <RadarChart width={300} height={300} data={radarData}>
        <Radar dataKey="v" isAnimationActive={false} />
      </RadarChart>
    ));
    flush();
    expect(portalContains(dflt, 100, ".recharts-radar")).toBe(true);

    const { container } = render(() => (
      <RadarChart width={300} height={300} data={radarData}>
        <Radar dataKey="v" zIndex={1214} isAnimationActive={false} />
      </RadarChart>
    ));
    flush();
    expect(portalContains(container, 1214, ".recharts-radar")).toBe(true);
  });

  it("RadialBar renders in its default (300) portal and relocates on a custom zIndex", () => {
    const { container: dflt } = render(() => (
      <RadialBarChart width={300} height={300} data={data}>
        <RadialBar dataKey="uv" isAnimationActive={false} />
      </RadialBarChart>
    ));
    flush();
    expect(portalContains(dflt, 300, ".recharts-radial-bar-sectors")).toBe(true);

    const { container } = render(() => (
      <RadialBarChart width={300} height={300} data={data}>
        <RadialBar dataKey="uv" zIndex={1215} isAnimationActive={false} />
      </RadialBarChart>
    ));
    flush();
    expect(portalContains(container, 1215, ".recharts-radial-bar-sectors")).toBe(true);
  });
});
