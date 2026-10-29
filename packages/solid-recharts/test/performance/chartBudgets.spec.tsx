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
// Known cost, pinned rather than hidden: sending the SAME pointer position again
// (`mouse-move-same-point`) re-runs the tooltip pipeline as much as moving to a new
// point does. The slice immutability contract replaces `store.axisInteraction`
// with an equal-valued fresh object, so its readers cannot be skipped. The target
// is 0 re-runs; lower the budget when that lands.
import { describe, expect, it, vi } from "vitest";
import { createSignal, flush, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { assertBudgetFile, captureArtifact, parseBudgetFile } from "@solidjs/diagnostics";
import type { DiagnosticsArtifact } from "@solidjs/diagnostics";
import { fireEvent, render } from "@solidjs/testing-library";
import { Bar, BarChart, Line, LineChart, Tooltip, XAxis, YAxis } from "../../src";
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
