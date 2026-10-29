// Not a recharts port: an audit of the function-form props that hand a props object to user
// code (`shape`, `activeShape`, `dot`, `tick`, `content`, `label`, `node`, …). recharts passes
// `className` to those as a string; the library builds many of its own `class` values as
// structured arrays now (`class={["recharts-…", props.class]}`), and one of those once travelled
// into a user callback. Every callback below must see `class` / `className` as a string (or
// not at all), so a structured value cannot reach user code unnoticed again.
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  Label,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "../src";
import { PageData } from "./_data";
import { showTooltip } from "./component/Tooltip/tooltipTestHelpers";
import { funnelChartMouseHoverTooltipSelector } from "./component/Tooltip/tooltipMouseHoverSelectors";

const funnelData = [
  { value: 100, name: "A" },
  { value: 80, name: "B" },
  { value: 50, name: "C" },
];
const sankeyData = {
  nodes: [{ name: "A" }, { name: "B" }, { name: "C" }],
  links: [
    { source: 0, target: 1, value: 10 },
    { source: 0, target: 2, value: 5 },
  ],
};
const treemapData = [
  { name: "a", value: 10 },
  { name: "b", value: 20 },
  { name: "c", value: 30 },
];
const scatterData = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
];

type Recorder = ReturnType<typeof vi.fn<(props: unknown) => null>>;
const recorder = (): Recorder => vi.fn((_props: unknown): null => null);

/** Every `class` / `className` a callback was called with. */
function classesSeen(spy: Recorder): ReadonlyArray<unknown> {
  return spy.mock.calls.flatMap(([props]) =>
    typeof props === "object" && props != null
      ? ["class", "className"].filter((key) => key in props).map((key) => Reflect.get(props, key))
      : [],
  );
}

type Case = {
  name: string;
  /** Mounts the chart with the recorder wired to the callback prop under test. */
  mount: (spy: Recorder) => JSX.Element;
  /** Drives the interaction that makes the chart call the callback, when it is not rendered up front. */
  interact?: (container: HTMLElement) => void;
};

// `defaultIndex` on a Tooltip activates the active shape / active dot without pointer events.
const cases: ReadonlyArray<Case> = [
  {
    name: "Bar shape",
    mount: (spy) => (
      <BarChart width={400} height={300} data={PageData}>
        <Bar dataKey="uv" isAnimationActive={false} shape={spy} />
      </BarChart>
    ),
  },
  {
    name: "Line dot",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <Line dataKey="uv" isAnimationActive={false} dot={spy} />
      </LineChart>
    ),
  },
  {
    name: "Line activeDot",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData} throttledEvents={[]}>
        <Line dataKey="uv" isAnimationActive={false} activeDot={spy} />
        <Tooltip defaultIndex={1} />
      </LineChart>
    ),
  },
  {
    name: "Area dot",
    mount: (spy) => (
      <AreaChart width={400} height={300} data={PageData}>
        <Area dataKey="uv" isAnimationActive={false} dot={spy} />
      </AreaChart>
    ),
  },
  {
    name: "Scatter shape",
    mount: (spy) => (
      <ScatterChart width={400} height={300}>
        <XAxis dataKey="x" type="number" />
        <YAxis dataKey="y" type="number" />
        <Scatter data={scatterData} isAnimationActive={false} shape={spy} />
      </ScatterChart>
    ),
  },
  {
    name: "Funnel shape",
    mount: (spy) => (
      <FunnelChart width={400} height={300}>
        <Funnel dataKey="value" data={funnelData} isAnimationActive={false} shape={spy} />
      </FunnelChart>
    ),
  },
  {
    name: "Funnel activeShape",
    mount: (spy) => (
      <FunnelChart width={400} height={300}>
        <Funnel dataKey="value" data={funnelData} isAnimationActive={false} activeShape={spy} />
      </FunnelChart>
    ),
    interact: (container) => showTooltip(container, funnelChartMouseHoverTooltipSelector),
  },
  {
    name: "Pie shape",
    mount: (spy) => (
      <PieChart width={400} height={300}>
        <Pie data={PageData} dataKey="uv" isAnimationActive={false} shape={spy} />
      </PieChart>
    ),
  },
  {
    name: "Pie activeShape",
    mount: (spy) => (
      <PieChart width={400} height={300} throttledEvents={[]}>
        <Pie data={PageData} dataKey="uv" isAnimationActive={false} activeShape={spy} />
        <Tooltip defaultIndex={0} />
      </PieChart>
    ),
  },
  {
    name: "Pie inactiveShape",
    mount: (spy) => (
      <PieChart width={400} height={300} throttledEvents={[]}>
        <Pie data={PageData} dataKey="uv" isAnimationActive={false} inactiveShape={spy} />
        <Tooltip defaultIndex={0} />
      </PieChart>
    ),
  },
  {
    name: "Pie label",
    mount: (spy) => (
      <PieChart width={400} height={300}>
        <Pie data={PageData} dataKey="uv" isAnimationActive={false} label={spy} />
      </PieChart>
    ),
  },
  {
    name: "Pie labelLine",
    mount: (spy) => (
      <PieChart width={400} height={300}>
        <Pie data={PageData} dataKey="uv" isAnimationActive={false} label labelLine={spy} />
      </PieChart>
    ),
  },
  {
    name: "RadialBar shape",
    mount: (spy) => (
      <RadialBarChart width={400} height={300} data={PageData}>
        <RadialBar dataKey="amt" isAnimationActive={false} shape={spy} />
      </RadialBarChart>
    ),
  },
  {
    name: "RadialBar activeShape",
    mount: (spy) => (
      <RadialBarChart width={400} height={300} data={PageData} throttledEvents={[]}>
        <RadialBar dataKey="amt" isAnimationActive={false} activeShape={spy} />
        <Tooltip defaultIndex={0} />
      </RadialBarChart>
    ),
  },
  {
    name: "RadialBar background",
    mount: (spy) => (
      <RadialBarChart width={400} height={300} data={PageData}>
        <RadialBar dataKey="amt" isAnimationActive={false} background shape={spy} />
      </RadialBarChart>
    ),
  },
  {
    name: "Radar dot",
    mount: (spy) => (
      <RadarChart width={400} height={300} data={PageData}>
        <PolarAngleAxis dataKey="name" />
        <Radar dataKey="uv" isAnimationActive={false} dot={spy} />
      </RadarChart>
    ),
  },
  {
    name: "XAxis tick",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <XAxis dataKey="name" tick={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "YAxis tick",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <YAxis tick={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "PolarAngleAxis tick",
    mount: (spy) => (
      <RadarChart width={400} height={300} data={PageData}>
        <PolarAngleAxis dataKey="name" tick={spy} />
        <Radar dataKey="uv" isAnimationActive={false} />
      </RadarChart>
    ),
  },
  {
    name: "PolarRadiusAxis tick",
    mount: (spy) => (
      <RadarChart width={400} height={300} data={PageData}>
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis tick={spy} />
        <Radar dataKey="uv" isAnimationActive={false} />
      </RadarChart>
    ),
  },
  {
    name: "ReferenceDot shape",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <XAxis dataKey="name" />
        <YAxis />
        <ReferenceDot x="Page B" y={300} r={5} shape={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "ReferenceLine shape",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <XAxis dataKey="name" />
        <YAxis />
        <ReferenceLine y={300} shape={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "ReferenceArea shape",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <XAxis dataKey="name" />
        <YAxis />
        <ReferenceArea x1="Page B" x2="Page D" y1={100} y2={300} shape={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "CartesianGrid horizontal",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <CartesianGrid horizontal={spy} class="user-grid" />
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "CartesianGrid vertical",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <CartesianGrid vertical={spy} class="user-grid" />
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "Area activeDot",
    mount: (spy) => (
      <AreaChart width={400} height={300} data={PageData} throttledEvents={[]}>
        <Area dataKey="uv" isAnimationActive={false} activeDot={spy} />
        <Tooltip defaultIndex={1} />
      </AreaChart>
    ),
  },
  {
    name: "Radar shape",
    mount: (spy) => (
      <RadarChart width={400} height={300} data={PageData}>
        <PolarAngleAxis dataKey="name" />
        <Radar dataKey="uv" isAnimationActive={false} shape={spy} />
      </RadarChart>
    ),
  },
  {
    name: "Radar activeDot",
    mount: (spy) => (
      <RadarChart width={400} height={300} data={PageData} throttledEvents={[]}>
        <PolarAngleAxis dataKey="name" />
        <Radar dataKey="uv" isAnimationActive={false} activeDot={spy} />
        <Tooltip defaultIndex={1} />
      </RadarChart>
    ),
  },
  {
    name: "Legend content",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <Legend content={spy} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "Tooltip content",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData} throttledEvents={[]}>
        <Tooltip content={spy} defaultIndex={1} />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ),
  },
  {
    name: "Label content",
    mount: (spy) => (
      <LineChart width={400} height={300} data={PageData}>
        <Line dataKey="uv" isAnimationActive={false}>
          <Label content={spy} position="top" />
        </Line>
      </LineChart>
    ),
  },
  {
    name: "LabelList content",
    mount: (spy) => (
      <BarChart width={400} height={300} data={PageData}>
        <Bar dataKey="uv" isAnimationActive={false}>
          <LabelList dataKey="uv" content={spy} />
        </Bar>
      </BarChart>
    ),
  },
  {
    name: "Sankey node",
    mount: (spy) => <Sankey width={400} height={300} data={sankeyData} node={spy} />,
  },
  {
    name: "Sankey link",
    mount: (spy) => <Sankey width={400} height={300} data={sankeyData} link={spy} />,
  },
  {
    name: "Treemap content",
    mount: (spy) => (
      <Treemap
        width={400}
        height={300}
        data={treemapData}
        dataKey="value"
        isAnimationActive={false}
        content={spy}
      />
    ),
  },
];

describe("user-facing callbacks receive a string class", () => {
  it.each(cases)("$name", ({ mount, interact }) => {
    const spy = recorder();
    const { container } = render(() => mount(spy));
    flush();
    flush();
    interact?.(container);

    expect(spy.mock.calls.length).toBeGreaterThan(0);
    for (const value of classesSeen(spy)) {
      expect(typeof value === "string" || value === undefined).toBe(true);
    }
  });
});
