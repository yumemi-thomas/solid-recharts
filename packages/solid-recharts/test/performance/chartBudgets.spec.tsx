// Not a recharts port: update-granularity budgets for the hot paths of a chart —
// tooltip hover and data updates — checked with @solidjs/diagnostics.
//
// Each scenario is captured once with attribution on (`captureArtifact`) and
// asserted against its entry in `budgets.json` (`assertBudgetFile`): a cap on the
// total re-runs it causes, on the unchanged ("wasted") recomputes among them, on
// named scopes, and the diagnostics it may emit. The budgets are the MEASURED
// values — reactive-graph counts are deterministic and, as the two data sizes
// below show, independent of the number of data points. A change that makes a hot
// path do more work fails here; to accept one, update the JSON and say why.
//
// Sending the SAME pointer position again (`mouse-move-same-point`) costs nothing: the
// slice writes (`patched`, ADR-0002) keep a node's reference when the new value equals
// the current one by value, so an event that lands on the data point already shown
// re-runs no scope. (It used to re-run ~30: the freshly built interaction node and its
// `coordinate` replaced the current ones every time.)
//
// Diagnostics: the scenarios that really change the tooltip state report one
// `IMMUTABLE_UPDATE_IN_STORE` — the by-design cost of the immutability contract
// (ADR-0002, "Diagnostics") — and a data update of a bar chart reports one
// `WIDE_SCOPE_DEPS` (the tooltip payload chain, ~230 slice leaves regardless of the
// number of data points). Each scenario lists exactly what it may emit in budgets.json.
//
// Two more groups pin the other findings of the diagnostics:
//  - series that bring their own data (Scatter, Pie) and a Sankey report one
//    `EFFECT_RELAY_TEAR` on mount: their tooltip entry / computed data is derived from
//    the registered item, so it reaches the store from an effect one flush after the
//    item (ADR-0002, "Diagnostics");
//  - 1000-point charts mount in the same number of re-runs as 5-point ones and report
//    no wide-scope or fan-in findings — the data arrays are stored opaque (frozen), so
//    the many scopes that read the rows subscribe to the array, not to each row. The
//    exception is a bar chart: 1000 conditionally rendered rows exceed the runtime's
//    2000-source backstop (`HUGE_FAN_IN`; a `<Show>` per row costs 2-4 sources).
import { describe, expect, it, vi } from "vitest";
import { createSignal, flush, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { assertBudgetFile, captureArtifact, parseBudgetFile } from "@solidjs/diagnostics";
import type { DiagnosticsArtifact } from "@solidjs/diagnostics";
import { fireEvent, render } from "@solidjs/testing-library";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "../../src";
import { exampleSankeyData } from "../_data";
import budgetsJson from "./budgets.json";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

// Round-tripped through `parseBudgetFile`, which validates the file's shape.
const budgets = parseBudgetFile(JSON.stringify(budgetsJson));

type ChartKind = "line-chart" | "bar-chart";
type Datum = { name: string; uv: number; pv: number };

const makeData = (size: number, bump: number): Datum[] =>
  Array.from({ length: size }, (_unused, i) => ({
    name: `Page ${i}`,
    uv: 100 + ((i * 37) % 200) + bump,
    pv: 50 + i,
  }));

const Chart = (props: { kind: ChartKind; data: Datum[] }): JSX.Element => (
  <Show
    when={props.kind === "line-chart"}
    fallback={
      <BarChart width={400} height={400} data={props.data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="uv" isAnimationActive={false} />
      </BarChart>
    }
  >
    <LineChart width={400} height={400} data={props.data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line dataKey="uv" isAnimationActive={false} />
    </LineChart>
  </Show>
);

// Pointer x positions (in a 400px chart) that land on different categories.
const FIRST_POINT_X = 160;
const SECOND_POINT_X = 260;

const hover = (wrapper: Element, clientX: number): void => {
  fireEvent.mouseMove(wrapper, { clientX, clientY: 100 });
  // mouseMove is throttled onto requestAnimationFrame (faked in test/setup.ts).
  vi.runOnlyPendingTimers();
  flush();
};

type Scenario =
  | "mount"
  | "mouse-enter"
  | "mouse-move-same-point"
  | "mouse-move-between-points"
  | "mouse-leave"
  | "data-update";

/** Mounts a chart, brings it to the scenario's starting state, then captures just the scenario. */
async function capture(
  kind: ChartKind,
  size: number,
  scenario: Scenario,
): Promise<DiagnosticsArtifact> {
  mockGetBoundingClientRect({ width: 400, height: 400 });
  const [data, setData] = createSignal(makeData(size, 0));
  const scenarioName = `${kind}/${scenario}`;

  if (scenario === "mount") {
    const { artifact } = await captureArtifact(
      () => {
        render(() => <Chart kind={kind} data={data()} />);
        flush();
      },
      { scenario: scenarioName },
    );
    return artifact;
  }

  const { container } = render(() => <Chart kind={kind} data={data()} />);
  flush();
  const wrapper = container.querySelector(".recharts-wrapper");
  expect(wrapper).not.toBeNull();
  if (wrapper == null) {
    throw new Error("chart wrapper not rendered");
  }

  if (scenario !== "mouse-enter" && scenario !== "data-update") {
    hover(wrapper, FIRST_POINT_X);
  }

  const { artifact } = await captureArtifact(
    () => {
      switch (scenario) {
        case "mouse-enter":
          hover(wrapper, FIRST_POINT_X);
          break;
        case "mouse-move-same-point":
          hover(wrapper, FIRST_POINT_X);
          break;
        case "mouse-move-between-points":
          hover(wrapper, SECOND_POINT_X);
          break;
        case "mouse-leave":
          fireEvent.mouseLeave(wrapper);
          flush();
          break;
        case "data-update":
          setData(makeData(size, 1));
          flush();
          break;
      }
    },
    { scenario: scenarioName },
  );
  return artifact;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  "mount",
  "mouse-enter",
  "mouse-move-same-point",
  "mouse-move-between-points",
  "mouse-leave",
  "data-update",
];

// The same budget must hold for a small and a large data set: update granularity
// does not grow with the number of points.
const SIZES = [5, 50] as const;

describe.each<ChartKind>(["line-chart", "bar-chart"])("%s update budgets", (kind) => {
  it.each(SCENARIOS)("%s stays within its budget", async (scenario) => {
    for (const size of SIZES) {
      const artifact = await capture(kind, size, scenario);
      expect(artifact.scenario).toBe(`${kind}/${scenario}`);
      assertBudgetFile(artifact, budgets);
    }
  });
});

// ---- series with their own data, and a Sankey --------------------------------------

async function captureMount(
  scenario: string,
  chart: () => JSX.Element,
): Promise<DiagnosticsArtifact> {
  mockGetBoundingClientRect({ width: 400, height: 400 });
  const { artifact } = await captureArtifact(
    () => {
      render(chart);
      flush();
    },
    { scenario },
  );
  return artifact;
}

describe("series with their own data", () => {
  it.each(SIZES)("scatter-chart/mount stays within its budget (%i points)", async (size) => {
    const data = makeData(size, 0);
    const artifact = await captureMount("scatter-chart/mount", () => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="uv" type="number" />
        <YAxis dataKey="pv" type="number" />
        <Tooltip />
        <Scatter data={data} isAnimationActive={false} />
      </ScatterChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it.each(SIZES)("pie-chart/mount stays within its budget (%i points)", async (size) => {
    const data = makeData(size, 0);
    const artifact = await captureMount("pie-chart/mount", () => (
      <PieChart width={400} height={400}>
        <Tooltip />
        <Pie data={data} dataKey="uv" isAnimationActive={false} />
      </PieChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it("sankey/mount stays within its budget", async () => {
    const artifact = await captureMount("sankey/mount", () => (
      <Sankey width={600} height={400} data={exampleSankeyData}>
        <Tooltip />
      </Sankey>
    ));
    assertBudgetFile(artifact, budgets);
  });
});

// ---- large data sets --------------------------------------------------------------

const LARGE = 1000;

describe(`${LARGE}-point charts`, () => {
  const data = makeData(LARGE, 0);

  it("line-chart/mount-large stays within its budget", async () => {
    const artifact = await captureMount("line-chart/mount-large", () => (
      <LineChart width={400} height={400} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line dataKey="uv" dot={false} isAnimationActive={false} />
      </LineChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it("area-chart/mount-large stays within its budget", async () => {
    const artifact = await captureMount("area-chart/mount-large", () => (
      <AreaChart width={400} height={400} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Area dataKey="uv" isAnimationActive={false} />
      </AreaChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it("bar-chart/mount-large stays within its budget", async () => {
    const artifact = await captureMount("bar-chart/mount-large", () => (
      <BarChart width={400} height={400} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="uv" isAnimationActive={false} />
      </BarChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it("scatter-chart/mount-large stays within its budget", async () => {
    const artifact = await captureMount("scatter-chart/mount-large", () => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="uv" type="number" />
        <YAxis dataKey="pv" type="number" />
        <Tooltip />
        <Scatter data={data} isAnimationActive={false} />
      </ScatterChart>
    ));
    assertBudgetFile(artifact, budgets);
  });

  it("pie-chart/mount-large stays within its budget", async () => {
    const artifact = await captureMount("pie-chart/mount-large", () => (
      <PieChart width={400} height={400}>
        <Tooltip />
        <Pie data={data} dataKey="uv" isAnimationActive={false} />
      </PieChart>
    ));
    assertBudgetFile(artifact, budgets);
  });
});
