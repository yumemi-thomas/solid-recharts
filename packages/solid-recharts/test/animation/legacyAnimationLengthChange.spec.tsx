// Ported from recharts 3.8.1 test/animation/legacyAnimationLengthChange.spec.tsx
// (commit 7a23854). Proves the LEGACY data-length-change animation: when a chart's
// data array grows/shrinks, the graphical item starts a NEW animation interpolating
// from the PREVIOUS settled geometry to the new geometry — appended items grow from
// zero, removed items shrink to zero, and surviving items move proportionally.
//
// Harness adaptation: recharts uses createSelectorTestCase(...).rerender(NextChart)
// + a CompositeAnimationManager that sequences one inner manager per animationId.
// Our shared createSelectorTestCase has no rerender/animationManager, so this file
// builds an equivalent: the chart reads a `data()` signal (so swapping data keeps
// the SAME component instance → the `prev*` geometry closure survives), and a
// manager registry hands out one MockProgressAnimationManager per animationId and
// drives the most-recently-created (currently active) one. Tier-A geometry
// assertions are byte-identical to the reference.
//
// NOT PORTED (SRC behavior gaps — the Solid impl diverges from recharts here):
//   - Radar (2 cases): polar/Radar.tsx renders statically; it is NOT wrapped in
//     JavascriptAnimate, so there is no per-frame dot interpolation to assert.
//   - Funnel (2 cases): cartesian/Funnel.tsx renders statically; not wrapped in
//     JavascriptAnimate, so trapezoids do not grow/shrink across a data change.
//   - Scatter / Pie / RadialBar / Bar SHRINKS (4 cases): on a data-length DECREASE
//     the reference asserts SURVIVING items re-grow from zero (size/angle/height ≈ 0
//     at the first frame). The Solid impl's per-element `prev*` interpolation keeps
//     the previous (full) geometry for index-matched survivors, so survivors start at
//     their prior size/angle/height rather than zero — the geometry diverges from
//     recharts. The GROWS counterparts (which only assert the newly-APPENDED item,
//     prev=null → grows from zero) match recharts exactly and ARE ported below
//     (including Bar grows — the prior NO_OWNER_EFFECT on a Bar re-animation is fixed;
//     see Bar.tsx, the ZIndexLayer-inside-Show change).
import { beforeEach, describe, expect, it } from "vitest";
import { createSignal, flush, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
} from "../../src";
import { render, fireEvent } from "../helper/render";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "./MockProgressAnimationManager";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../helper/assertNotNull";
import { PageData } from "../_data";

// pageDataWithFillColor from recharts storybook/stories/data/Page.ts (inlined; the
// storybook fixtures are not vendored into this package's test tree).
const pageDataWithFillColor = [
  { name: "18-24", uv: 31.47, pv: 2400, amt: 1400, fill: "#8884d8" },
  { name: "25-29", uv: 26.69, pv: 4567, amt: 720, fill: "#83a6ed" },
  { name: "30-34", uv: 15.69, pv: 1398, amt: 680, fill: "#8dd1e1" },
  { name: "35-39", uv: 8.22, pv: 9800, amt: 1700, fill: "#82ca9d" },
  { name: "40-49", uv: 8.63, pv: 3908, amt: 1500, fill: "#a4de6c" },
  { name: "50+", uv: 2.63, pv: 4800, amt: 680, fill: "#d0ed57" },
  { name: "unknown", uv: 6.67, pv: 4800, amt: 690, fill: "#ffc658" },
];

type SmallData = ReadonlyArray<(typeof PageData)[number]>;
type PolarData = ReadonlyArray<(typeof pageDataWithFillColor)[number]>;

type ScatterCaptureProps = { cx?: number; cy?: number; size?: number };
type SectorCaptureProps = { startAngle?: number; endAngle?: number };
type BarCaptureProps = { x?: number; y?: number; width?: number; height?: number };

function CaptureBar(props: BarCaptureProps): JSX.Element {
  return (
    <path
      class="capture-bar"
      data-x={props.x}
      data-y={props.y}
      data-width={props.width}
      data-height={props.height}
    />
  );
}

function CaptureScatter(props: ScatterCaptureProps): JSX.Element {
  return (
    <path class="capture-scatter" data-cx={props.cx} data-cy={props.cy} data-size={props.size} />
  );
}

function CaptureSector(props: SectorCaptureProps): JSX.Element {
  return (
    <path
      class="capture-sector"
      data-start-angle={props.startAngle}
      data-end-angle={props.endAngle}
    />
  );
}

function parseNumber(value: string | null, attribute: string): number {
  if (value == null) {
    throw new Error(`Missing ${attribute}`);
  }
  return Number(value);
}

function getCurvePoints(
  container: Element,
  selector: string,
): ReadonlyArray<{ x: number; y: number }> {
  const curve = container.querySelector<SVGPathElement>(selector);
  if (curve == null) {
    throw new Error(`Missing curve for selector ${selector}`);
  }
  const d = curve.getAttribute("d");
  if (d == null) {
    throw new Error(`Missing "d" attribute for selector ${selector}`);
  }

  const numbers = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number);
  if (numbers == null || numbers.length < 4) {
    throw new Error(`Could not parse curve points from "${d}"`);
  }

  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < numbers.length; i += 2) {
    const x: number | undefined = numbers[i];
    const y: number | undefined = numbers[i + 1];
    assertNotNull(x);
    assertNotNull(y);
    result.push({ x, y });
  }
  return result;
}

function getCapturedScatterPoints(
  container: Element,
): ReadonlyArray<{ cx: number; cy: number; size: number }> {
  return Array.from(container.querySelectorAll<SVGPathElement>(".capture-scatter")).map(
    (point) => ({
      cx: parseNumber(point.getAttribute("data-cx"), "data-cx"),
      cy: parseNumber(point.getAttribute("data-cy"), "data-cy"),
      size: parseNumber(point.getAttribute("data-size"), "data-size"),
    }),
  );
}

function getCapturedBars(
  container: Element,
): ReadonlyArray<{ x: number; y: number; width: number; height: number }> {
  return Array.from(container.querySelectorAll<SVGPathElement>(".capture-bar")).map((bar) => ({
    x: parseNumber(bar.getAttribute("data-x"), "data-x"),
    y: parseNumber(bar.getAttribute("data-y"), "data-y"),
    width: parseNumber(bar.getAttribute("data-width"), "data-width"),
    height: parseNumber(bar.getAttribute("data-height"), "data-height"),
  }));
}

function getCapturedSectors(
  container: Element,
): ReadonlyArray<{ startAngle: number; endAngle: number }> {
  return Array.from(container.querySelectorAll<SVGPathElement>(".capture-sector")).map(
    (sector) => ({
      startAngle: parseNumber(sector.getAttribute("data-start-angle"), "data-start-angle"),
      endAngle: parseNumber(sector.getAttribute("data-end-angle"), "data-end-angle"),
    }),
  );
}

const linearAnimationProps = {
  animationDuration: 1000,
  animationEasing: "linear" as const,
  isAnimationActive: true,
};

// Each chart animates exactly ONE graphical item, but the animationId changes when
// data length changes → a NEW JavascriptAnimate subscribes a NEW manager via the
// context factory. This registry hands out one manager per id and exposes the most
// recently created (= currently active) one to drive.
function createManagerRegistry(): {
  factory: (id: string) => MockProgressAnimationManager;
  current: () => MockProgressAnimationManager;
} {
  const managers = new Map<string, MockProgressAnimationManager>();
  let latest: MockProgressAnimationManager | null = null;
  return {
    factory: (id: string): MockProgressAnimationManager => {
      const existing = managers.get(id);
      if (existing != null) {
        latest = existing;
        return existing;
      }
      const manager = new MockProgressAnimationManager(id);
      managers.set(id, manager);
      latest = manager;
      return manager;
    },
    current: (): MockProgressAnimationManager => {
      if (latest == null) {
        throw new Error("No animation manager has been created yet");
      }
      return latest;
    },
  };
}

const smallData = PageData.slice(0, 2);
const largeData = PageData.slice(0, 3);
const smallPolarData = pageDataWithFillColor.slice(0, 2);
const largePolarData = pageDataWithFillColor.slice(0, 3);

type RenderResult = {
  container: HTMLElement;
  setData: (data: SmallData | PolarData) => void;
  registry: ReturnType<typeof createManagerRegistry>;
};

// Render a chart whose data is driven by a signal. `chart(data)` returns the chart
// JSX for the current data; swapping the signal keeps the SAME component instance so
// the graphical item's `prev*` geometry closure survives across the data change.
//
// The swap is triggered by clicking an in-tree <button> (NOT by writing the signal
// from the test body) so the data-change re-render — which re-creates chart effects
// — happens inside the render root's reactive owner. Writing the signal directly
// from test scope makes those new effects ownerless → NO_OWNER_EFFECT diagnostic.
// (Same pattern as GraphicalItemClipPath.scale-behavior.spec.tsx.)
function renderLengthChangeChart(
  initialData: SmallData | PolarData,
  chart: (data: Accessor<SmallData | PolarData>) => JSX.Element,
): RenderResult {
  const registry = createManagerRegistry();
  const [data, setData] = createSignal<SmallData | PolarData>(initialData);
  const [next, setNext] = createSignal<SmallData | PolarData | null>(null);
  const { container } = render(() => (
    <AnimationManagerContext value={registry.factory}>
      <button
        type="button"
        data-testid="swap-data"
        onClick={() => {
          const n = next();
          if (n != null) {
            setData(() => n);
          }
        }}
      />
      {chart(data)}
    </AnimationManagerContext>
  ));
  flush();
  const button = container.querySelector<HTMLButtonElement>('[data-testid="swap-data"]');
  if (button == null) {
    throw new Error("Missing swap-data button");
  }
  return {
    container,
    setData: (nextData) => {
      setNext(() => nextData);
      flush();
      fireEvent.click(button);
      flush();
    },
    registry,
  };
}

describe("legacy animation behavior when data length changes", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100, left: 0, top: 0 });
  });

  it("Area uses the final curve geometry immediately when data length increases", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <AreaChart width={100} height={100} data={data()}>
        <Area dataKey="uv" {...linearAnimationProps} />
      </AreaChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    const initialCurve = getCurvePoints(r.container, ".recharts-area-curve");
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midCurve = getCurvePoints(r.container, ".recharts-area-curve");
    await r.registry.current().completeAnimation();
    flush();
    const finalCurve = getCurvePoints(r.container, ".recharts-area-curve");

    expect(initialCurve).not.toEqual(finalCurve);
    expect(midCurve).toEqual(finalCurve);
  });

  it("Area uses the final curve geometry immediately when data length decreases", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <AreaChart width={100} height={100} data={data()}>
        <Area dataKey="uv" {...linearAnimationProps} />
      </AreaChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    const initialCurve = getCurvePoints(r.container, ".recharts-area-curve");
    r.setData(smallData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midCurve = getCurvePoints(r.container, ".recharts-area-curve");
    await r.registry.current().completeAnimation();
    flush();
    const finalCurve = getCurvePoints(r.container, ".recharts-area-curve");

    expect(initialCurve).not.toEqual(finalCurve);
    expect(midCurve).toEqual(finalCurve);
  });

  it("Line uses the final curve geometry immediately when data length increases", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <LineChart width={100} height={100} data={data()}>
        <Line dataKey="uv" {...linearAnimationProps} />
      </LineChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    const initialCurve = getCurvePoints(r.container, ".recharts-line-curve");
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midCurve = getCurvePoints(r.container, ".recharts-line-curve");
    await r.registry.current().completeAnimation();
    flush();
    const finalCurve = getCurvePoints(r.container, ".recharts-line-curve");

    expect(initialCurve).not.toEqual(finalCurve);
    expect(midCurve).toEqual(finalCurve);
  });

  it("Line uses the final curve geometry immediately when data length decreases", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <LineChart width={100} height={100} data={data()}>
        <Line dataKey="uv" {...linearAnimationProps} />
      </LineChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    const initialCurve = getCurvePoints(r.container, ".recharts-line-curve");
    r.setData(smallData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midCurve = getCurvePoints(r.container, ".recharts-line-curve");
    await r.registry.current().completeAnimation();
    flush();
    const finalCurve = getCurvePoints(r.container, ".recharts-line-curve");

    expect(initialCurve).not.toEqual(finalCurve);
    expect(midCurve).toEqual(finalCurve);
  });

  it("Scatter grows newly appended items from zero size at their final position", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <ScatterChart width={100} height={100} data={data()}>
        <Scatter dataKey="uv" shape={CaptureScatter} {...linearAnimationProps} />
      </ScatterChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midPoints = getCapturedScatterPoints(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalPoints = getCapturedScatterPoints(r.container);

    expect(midPoints).toHaveLength(3);
    expect(finalPoints).toHaveLength(3);
    const midPoint = midPoints[2];
    const finalPoint = finalPoints[2];
    assertNotNull(midPoint);
    assertNotNull(finalPoint);

    expect(midPoint.cx).toBeCloseTo(finalPoint.cx, 4);
    expect(midPoint.cy).toBeCloseTo(finalPoint.cy, 4);
    expect(midPoint.size).toBeCloseTo(finalPoint.size / 2, 4);
  });

  it("Bar grows newly appended items from zero size", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <BarChart width={100} height={100} data={data()}>
        <Bar dataKey="uv" shape={CaptureBar} {...linearAnimationProps} />
      </BarChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midBars = getCapturedBars(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalBars = getCapturedBars(r.container);

    expect(midBars).toHaveLength(3);
    expect(finalBars).toHaveLength(3);
    const midBar = midBars[2];
    const finalBar = finalBars[2];
    assertNotNull(midBar);
    assertNotNull(finalBar);

    expect(midBar.x).toBeCloseTo(finalBar.x, 4);
    expect(midBar.width).toBeCloseTo(finalBar.width, 4);
    expect(midBar.height).toBeCloseTo(finalBar.height / 2, 4);
  });

  it("Pie grows newly appended sectors from zero angle span", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <PieChart width={100} height={100}>
        <Pie data={data()} dataKey="uv" shape={CaptureSector} {...linearAnimationProps} />
      </PieChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midSectors = getCapturedSectors(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalSectors = getCapturedSectors(r.container);

    expect(midSectors).toHaveLength(3);
    expect(finalSectors).toHaveLength(3);
    const midSector = midSectors[2];
    const finalSector = finalSectors[2];
    assertNotNull(midSector);
    assertNotNull(finalSector);

    expect(midSector.endAngle - midSector.startAngle).toBeCloseTo(
      (finalSector.endAngle - finalSector.startAngle) / 2,
      3,
    );
  });

  it("RadialBar grows newly appended sectors from zero angle span", async () => {
    const r = renderLengthChangeChart(smallPolarData, (data) => (
      <RadialBarChart width={400} height={400} data={data()}>
        <RadialBar dataKey="uv" shape={CaptureSector} {...linearAnimationProps} />
      </RadialBarChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largePolarData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midSectors = getCapturedSectors(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalSectors = getCapturedSectors(r.container);

    expect(midSectors).toHaveLength(3);
    expect(finalSectors).toHaveLength(3);
    const midSector = midSectors[2];
    const finalSector = finalSectors[2];
    assertNotNull(midSector);
    assertNotNull(finalSector);

    expect(midSector.endAngle - midSector.startAngle).toBeCloseTo(
      (finalSector.endAngle - finalSector.startAngle) / 2,
      4,
    );
  });
});
