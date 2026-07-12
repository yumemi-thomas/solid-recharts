// Ported from recharts 3.8.1 test/animation/legacyAnimationLengthChange.spec.tsx
// (commit 7a23854). Proves the LEGACY data-length-change animation: when a chart's
// data array grows/shrinks, the graphical item starts a NEW animation interpolating
// from the PREVIOUS settled geometry to the new geometry — appended items grow from
// zero, removed items shrink to zero, and surviving items move proportionally.
//
// Harness adaptation: recharts uses createSelectorTestCase(...).rerender(NextChart)
// + a CompositeAnimationManager that sequences one inner manager per animationId.
// Our shared createSelectorTestCase has no rerender/animationManager, so this file
// builds an equivalent: the chart reads a `data()` signal behind a keyed <Show>, so
// swapping data REMOUNTS the whole chart — matching the reference, whose
// rerender(NextChart) passes a freshly-created component TYPE and React unmounts +
// remounts everything (all `previousPointsRef` tween state resets; "legacy" = a
// clean entrance animation over the new data). A manager registry hands out one
// MockProgressAnimationManager per animationId and drives the most-recently-created
// (currently active) one. Tier-A geometry assertions are byte-identical to the
// reference. The same-instance data swap — where prev geometry survives and the
// shapes MORPH — is covered by the Line/Area .animation.spec data-change blocks.
//
// GROWS and SHRINKS are both ported for Bar / Funnel / Scatter / Pie / RadialBar:
// under remount semantics every item re-enters from zero, so the appended-item and
// surviving-item assertions hold exactly as in the reference.
//
// Radar (2 cases) is ported: Radar dots now render inside the animation frame, so the
// legacy `dot` positions can be captured (the reference's element-form `dot={<CaptureDot/>}`
// is expressed here as the portable function form `dot={props => <CaptureDot {...props} />}`).
// Under remount semantics every point re-enters from the (cx,cy) center, so the mid-frame
// dot sits at the midpoint between the center-start and its settled position — matching the
// reference's proportional-matching assertions.
import { beforeEach, describe, expect, it } from "vitest";
import { createSignal, flush, Show, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
} from "../../src";
import { render, fireEvent } from "../helper/render";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import type { AnimationController } from "../../src";
import {
  MockControllerAnimationManager,
  type MockAnimationManager,
} from "./mockControllerAnimationManager";
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
type DotCaptureProps = { cx?: number; cy?: number };
type BarCaptureProps = { x?: number; y?: number; width?: number; height?: number };
type FunnelCaptureProps = {
  x?: number;
  y?: number;
  upperWidth?: number;
  lowerWidth?: number;
  height?: number;
};

function CaptureFunnel(props: FunnelCaptureProps): JSX.Element {
  return (
    <path
      class="capture-funnel"
      data-x={props.x}
      data-y={props.y}
      data-upper-width={props.upperWidth}
      data-lower-width={props.lowerWidth}
      data-height={props.height}
    />
  );
}

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

function CaptureDot(props: DotCaptureProps): JSX.Element {
  return <circle class="capture-dot" data-cx={props.cx} data-cy={props.cy} />;
}

function parseNumber(value: string | null, attribute: string): number {
  if (value == null) {
    throw new Error(`Missing ${attribute}`);
  }
  return Number(value);
}

function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}

function getCapturedDots(container: Element): ReadonlyArray<{ cx: number; cy: number }> {
  return Array.from(container.querySelectorAll<SVGCircleElement>(".capture-dot")).map((dot) => ({
    cx: parseNumber(dot.getAttribute("data-cx"), "data-cx"),
    cy: parseNumber(dot.getAttribute("data-cy"), "data-cy"),
  }));
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

function getCapturedFunnels(
  container: Element,
): ReadonlyArray<{ x: number; y: number; upperWidth: number; lowerWidth: number; height: number }> {
  return Array.from(container.querySelectorAll<SVGPathElement>(".capture-funnel")).map(
    (funnel) => ({
      x: parseNumber(funnel.getAttribute("data-x"), "data-x"),
      y: parseNumber(funnel.getAttribute("data-y"), "data-y"),
      upperWidth: parseNumber(funnel.getAttribute("data-upper-width"), "data-upper-width"),
      lowerWidth: parseNumber(funnel.getAttribute("data-lower-width"), "data-lower-width"),
      height: parseNumber(funnel.getAttribute("data-height"), "data-height"),
    }),
  );
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
// data length changes → a NEW animation subscribes a NEW manager. The injected v3.9
// `controller` routes per-id via `handle.getAnimationId()` so a remount's stop() on the
// old id never clobbers the new id's manager, and `current()` returns the most recently
// activated one (= currently animating).
function createManagerRegistry(): {
  controller: AnimationController;
  current: () => MockAnimationManager;
} {
  const managers = new Map<string, MockControllerAnimationManager>();
  let latest: MockAnimationManager | null = null;
  return {
    controller: (timeoutController, animationHandle, listener) => {
      const id = animationHandle.getAnimationId();
      let manager = managers.get(id);
      if (manager == null) {
        manager = new MockControllerAnimationManager(id);
        managers.set(id, manager);
      }
      latest = manager;
      manager.start(animationHandle, listener);
      return () => manager.stop();
    },
    current: (): MockAnimationManager => {
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

// Render a chart whose data is driven by a signal, REMOUNTING the whole chart when
// the data swaps (keyed <Show> on the array identity). This mirrors the reference
// harness exactly: its `rerender(NextComponent)` passes a freshly-created component
// TYPE, so React unmounts and remounts the entire chart — every `previousPointsRef`
// (prev-frame tween geometry) resets and the "legacy" behavior under test is a clean
// ENTRANCE animation over the new data, not a data-change morph. (The same-instance
// data swap — prev geometry surviving — is the tween path, covered by the
// Line/Area/... .animation.spec data-change blocks instead.)
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
    <AnimationControllerProvider value={registry.controller}>
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
      <Show when={data()} keyed>
        {(d) => chart(() => d)}
      </Show>
    </AnimationControllerProvider>
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

  const renderRadar = (data: Accessor<SmallData | PolarData>): JSX.Element => (
    <RadarChart cx={50} cy={50} outerRadius={40} width={100} height={100} data={data()}>
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis />
      <Radar dataKey="uv" dot={(props) => <CaptureDot {...props} />} {...linearAnimationProps} />
    </RadarChart>
  );

  it("Radar keeps proportional point matching", async () => {
    const r = renderLengthChangeChart(smallData, renderRadar);
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largeData);
    const initialDots = getCapturedDots(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midDots = getCapturedDots(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalDots = getCapturedDots(r.container);

    expect(initialDots).toHaveLength(3);
    expect(midDots).toHaveLength(3);
    expect(finalDots).toHaveLength(3);
    const mid1 = midDots[1];
    const init0 = initialDots[0];
    const final1 = finalDots[1];
    assertNotNull(mid1);
    assertNotNull(init0);
    assertNotNull(final1);
    expect(mid1.cx).toBeCloseTo(midpoint(init0.cx, final1.cx), 4);
    expect(mid1.cy).toBeCloseTo(midpoint(init0.cy, final1.cy), 4);
  });

  it("Radar keeps proportional point matching when data length decreases", async () => {
    const r = renderLengthChangeChart(largeData, renderRadar);
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallData);
    const initialDots = getCapturedDots(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midDots = getCapturedDots(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalDots = getCapturedDots(r.container);

    expect(initialDots).toHaveLength(2);
    expect(midDots).toHaveLength(2);
    expect(finalDots).toHaveLength(2);
    const mid1 = midDots[1];
    const init1 = initialDots[1];
    const final1 = finalDots[1];
    assertNotNull(mid1);
    assertNotNull(init1);
    assertNotNull(final1);
    expect(mid1.cx).toBeCloseTo(midpoint(init1.cx, final1.cx), 4);
    expect(mid1.cy).toBeCloseTo(midpoint(init1.cy, final1.cy), 4);
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

  it("Funnel grows newly appended items from zero size", async () => {
    const r = renderLengthChangeChart(smallData, (data) => (
      <FunnelChart width={100} height={100}>
        <Funnel data={data()} dataKey="uv" shape={CaptureFunnel} {...linearAnimationProps} />
      </FunnelChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(largeData);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midFunnels = getCapturedFunnels(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalFunnels = getCapturedFunnels(r.container);

    expect(midFunnels).toHaveLength(3);
    expect(finalFunnels).toHaveLength(3);
    const midFunnel = midFunnels[2];
    const finalFunnel = finalFunnels[2];
    assertNotNull(midFunnel);
    assertNotNull(finalFunnel);

    // The newly-appended (3rd) trapezoid has no previous frame → grows from zero, so
    // at t=0.5 its geometry is half the settled size.
    expect(midFunnel.upperWidth).toBeCloseTo(finalFunnel.upperWidth / 2, 4);
    expect(midFunnel.lowerWidth).toBeCloseTo(finalFunnel.lowerWidth / 2, 4);
    expect(midFunnel.height).toBeCloseTo(finalFunnel.height / 2, 4);
  });

  // SHRINKS cases: a data-length DECREASE remounts the chart (keyed harness), so the
  // surviving items re-run a clean entrance — zero size at the first frame, half the
  // settled geometry at t=0.5. Assertions byte-identical to the reference.

  it("Bar shrinks removed trailing items to zero size", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <BarChart width={100} height={100} data={data()}>
        <Bar dataKey="uv" shape={CaptureBar} {...linearAnimationProps} />
      </BarChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallData);
    const initialBars = getCapturedBars(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midBars = getCapturedBars(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalBars = getCapturedBars(r.container);

    expect(initialBars).toHaveLength(2);
    expect(midBars).toHaveLength(2);
    expect(finalBars).toHaveLength(2);
    const initialBar = initialBars[1];
    const midBar = midBars[1];
    const finalBar = finalBars[1];
    assertNotNull(initialBar);
    assertNotNull(midBar);
    assertNotNull(finalBar);

    expect(initialBar.x).toBeCloseTo(finalBar.x, 4);
    expect(initialBar.width).toBeCloseTo(finalBar.width, 4);
    expect(initialBar.height).toBeCloseTo(0, 4);
    expect(midBar.x).toBeCloseTo(finalBar.x, 4);
    expect(midBar.width).toBeCloseTo(finalBar.width, 4);
    expect(midBar.height).toBeCloseTo(finalBar.height / 2, 4);
  });

  it("Funnel shrinks removed trailing items to zero size", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <FunnelChart width={100} height={100}>
        <Funnel data={data()} dataKey="uv" shape={CaptureFunnel} {...linearAnimationProps} />
      </FunnelChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallData);
    const initialFunnels = getCapturedFunnels(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midFunnels = getCapturedFunnels(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalFunnels = getCapturedFunnels(r.container);

    expect(initialFunnels).toHaveLength(2);
    expect(midFunnels).toHaveLength(2);
    expect(finalFunnels).toHaveLength(2);
    const initialFunnel = initialFunnels[1];
    const midFunnel = midFunnels[1];
    const finalFunnel = finalFunnels[1];
    assertNotNull(initialFunnel);
    assertNotNull(midFunnel);
    assertNotNull(finalFunnel);

    expect(initialFunnel.upperWidth).toBeCloseTo(0, 4);
    expect(initialFunnel.lowerWidth).toBeCloseTo(0, 4);
    expect(initialFunnel.height).toBeCloseTo(0, 4);
    expect(midFunnel.upperWidth).toBeCloseTo(finalFunnel.upperWidth / 2, 4);
    expect(midFunnel.lowerWidth).toBeCloseTo(finalFunnel.lowerWidth / 2, 4);
    expect(midFunnel.height).toBeCloseTo(finalFunnel.height / 2, 4);
  });

  it("Scatter shrinks removed trailing items to zero size at their current position", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <ScatterChart width={100} height={100} data={data()}>
        <Scatter dataKey="uv" shape={CaptureScatter} {...linearAnimationProps} />
      </ScatterChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallData);
    const initialPoints = getCapturedScatterPoints(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midPoints = getCapturedScatterPoints(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalPoints = getCapturedScatterPoints(r.container);

    expect(initialPoints).toHaveLength(2);
    expect(midPoints).toHaveLength(2);
    expect(finalPoints).toHaveLength(2);
    const initialPoint = initialPoints[1];
    const midPoint = midPoints[1];
    const finalPoint = finalPoints[1];
    assertNotNull(initialPoint);
    assertNotNull(midPoint);
    assertNotNull(finalPoint);

    expect(initialPoint.cx).toBeCloseTo(finalPoint.cx, 4);
    expect(initialPoint.cy).toBeCloseTo(finalPoint.cy, 4);
    expect(initialPoint.size).toBeCloseTo(0, 4);
    expect(midPoint.cx).toBeCloseTo(finalPoint.cx, 4);
    expect(midPoint.cy).toBeCloseTo(finalPoint.cy, 4);
    expect(midPoint.size).toBeCloseTo(finalPoint.size / 2, 4);
  });

  it("Pie shrinks removed trailing sectors to zero angle span", async () => {
    const r = renderLengthChangeChart(largeData, (data) => (
      <PieChart width={100} height={100}>
        <Pie data={data()} dataKey="uv" shape={CaptureSector} {...linearAnimationProps} />
      </PieChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallData);
    const initialSectors = getCapturedSectors(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midSectors = getCapturedSectors(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalSectors = getCapturedSectors(r.container);

    expect(initialSectors).toHaveLength(0);
    expect(midSectors).toHaveLength(2);
    expect(finalSectors).toHaveLength(2);
    const midSector = midSectors[1];
    const finalSector = finalSectors[1];
    assertNotNull(midSector);
    assertNotNull(finalSector);

    expect(midSector.endAngle - midSector.startAngle).toBeCloseTo(
      (finalSector.endAngle - finalSector.startAngle) / 2,
      3,
    );
  });

  it("RadialBar shrinks removed trailing sectors to zero angle span", async () => {
    const r = renderLengthChangeChart(largePolarData, (data) => (
      <RadialBarChart width={400} height={400} data={data()}>
        <RadialBar dataKey="uv" shape={CaptureSector} {...linearAnimationProps} />
      </RadialBarChart>
    ));
    await r.registry.current().completeAnimation();
    flush();
    r.setData(smallPolarData);
    const initialSectors = getCapturedSectors(r.container);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    const midSectors = getCapturedSectors(r.container);
    await r.registry.current().completeAnimation();
    flush();
    const finalSectors = getCapturedSectors(r.container);

    expect(initialSectors).toHaveLength(2);
    expect(midSectors).toHaveLength(2);
    expect(finalSectors).toHaveLength(2);
    const initialSector = initialSectors[1];
    const midSector = midSectors[1];
    const finalSector = finalSectors[1];
    assertNotNull(initialSector);
    assertNotNull(midSector);
    assertNotNull(finalSector);

    expect(initialSector.startAngle).toBeCloseTo(initialSector.endAngle, 4);
    expect(midSector.endAngle - midSector.startAngle).toBeCloseTo(
      (finalSector.endAngle - finalSector.startAngle) / 2,
      4,
    );
  });
});
