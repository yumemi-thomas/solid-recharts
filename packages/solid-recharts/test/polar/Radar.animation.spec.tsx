// Ported from recharts 3.8.1 test/polar/Radar.animation.spec.tsx (commit 7a23854).
//
// <Radar> animates on the v3.9 engine: the polygon (and, for range radars, its
// baseline) is driven by <AnimatedItems> + the default `defaultRadarAnimateItems`
// interpolation (matched points tween prev→next x/y; added points grow from the
// (cx,cy) center; removed points drop). Animation is driven in tests via
// AnimationControllerProvider + the new-engine MockControllerAnimationManager.
//
// Ported: the POLYGON-based cases — isAnimationActive=false (settled, byte-identical)
// + the initial-animation polygon case (Tier-B: the exact intermediate easing-frame
// geometry is coupled to the mock manager's progress→t mapping, a harness detail, so
// anchored to behaviour + the byte-identical settled final frame).
//
// Ported re-animation: dataKey-change and data-array-change both re-run the
// polygon animation (see the describe blocks below; Tier-B — the exact mid frames
// are harness-coupled, so anchored to behaviour + the settled frame).
//
// DOT cases (`expectRadarDots`/`getRadarDots`) and radii cases (`getRadarDotRadii`)
// are ported: Radar dots render inside the animation frame from the interpolated
// stepData, so they animate with the polygon. Settled-frame assertions are Tier-A
// (byte-identical to the reference); mid-animation frames are Tier-B (the exact
// easing-frame geometry is coupled to the mock manager's progress→t mapping, so we
// assert every dot moves each step and the animation lands on the settled values).
// The reference's `key`-prop re-animation describe is driven here by REMOUNTING the
// chart via a keyed <Show> (Solid has no React `key` prop) — same semantics: all
// tween state resets and the entrance animation re-runs from the center.
import { describe, expect, it, vi } from "vitest";
import { createSignal, type JSX } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { assertNotNull } from "../helper/assertNotNull";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import type { AnimationController } from "../../src";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "../../src";
import { PageData } from "../_data";

const RADAR_RADIUS = 40;
const CX = 50;
const CY = 50;

const smallerData = PageData.slice(0, 3);
const biggerData = PageData.slice(3, 5);

// The new engine increments the animation id every cycle (useAnimationId), so each
// re-animation subscribes a fresh AnimationController via the context factory. We
// hand the context ONE MockControllerAnimationManager whose factory rebinds to the
// newest AnimationHandle on every subscribe, so `current()` always drives the most
// recently created animation — the same idiom Bar.animation.spec uses.
function createManagerRegistry(): {
  factory: AnimationController;
  current: () => MockProgressAnimationManager;
} {
  const manager = new MockProgressAnimationManager("radar-anim");
  return {
    factory: manager.factory,
    current: (): MockProgressAnimationManager => manager,
  };
}

function getRadarPolygons(container: Element): ReadonlyArray<SVGPathElement> {
  return Array.from(container.querySelectorAll(".recharts-radar-polygon path"));
}

function getPolygonPath(container: Element): string {
  const allPolygons = getRadarPolygons(container);
  if (allPolygons.length !== 1) {
    throw new Error(`Expected exactly one polygon, but found ${allPolygons.length}`);
  }
  const polygon = allPolygons[0];
  assertNotNull(polygon);
  const d = polygon.getAttribute("d");
  if (!d) {
    throw new Error('Polygon does not have a "d" attribute or it is empty');
  }
  return d;
}

// Steps the animation through `steps` progress points, asserting the polygon path
// changes each step and differs from the initial frame; returns the frames.
async function expectAnimatedRadarPolygons(
  container: Element,
  manager: MockProgressAnimationManager,
  steps = 5,
): Promise<ReadonlyArray<string>> {
  let progress = 0.1;
  await manager.setAnimationProgress(progress);
  const stepSize = (1 - progress) / steps;
  const initialPath = getPolygonPath(container);

  const polygonsDuringAnimation: Array<string> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    const currentPath = getPolygonPath(container);
    polygonsDuringAnimation.push(currentPath);
    expect(currentPath).not.toBe(initialPath);
  }

  await manager.completeAnimation();
  const finalPath = getPolygonPath(container);
  expect(finalPath).not.toBe(initialPath);
  polygonsDuringAnimation.push(finalPath);
  expect(polygonsDuringAnimation).toHaveLength(steps);
  return polygonsDuringAnimation;
}

// --- Radar dot helpers (ported from the reference's expectRadarPolygons helper) ---

type DotPos = { cx: string; cy: string };

function getRadarDots(container: Element): ReadonlyArray<SVGCircleElement> {
  return Array.from(container.querySelectorAll(".recharts-radar-dots circle.recharts-radar-dot"));
}

function getDotPosition(dot: SVGCircleElement): DotPos {
  return { cx: dot.getAttribute("cx") ?? "", cy: dot.getAttribute("cy") ?? "" };
}

function expectRadarDots(container: Element, expected: ReadonlyArray<DotPos>): void {
  expect(getRadarDots(container).map(getDotPosition)).toEqual(expected);
}

function getDotRadius(dot: SVGCircleElement): number {
  const cx = parseFloat(dot.getAttribute("cx") ?? "0");
  const cy = parseFloat(dot.getAttribute("cy") ?? "0");
  return Math.sqrt((cx - CX) ** 2 + (cy - CY) ** 2);
}

function getRadarDotRadii(container: Element): ReadonlyArray<number> {
  return getRadarDots(container).map(getDotRadius);
}

// Steps the animation through `steps` progress points, asserting every dot moves
// (at least one of cx/cy changes — a dot exactly at a multiple of 90° keeps one
// coordinate constant) each step and after the final frame; returns the frames.
// Tier-B: the exact intermediate geometry is coupled to the mock manager's
// progress→t mapping, so callers assert movement + the byte-identical settled frame.
async function expectAnimatedRadarDots(
  container: Element,
  manager: MockProgressAnimationManager,
  steps = 5,
): Promise<ReadonlyArray<ReadonlyArray<DotPos>>> {
  let progress = 0.1;
  await manager.setAnimationProgress(progress);
  const stepSize = (1 - progress) / steps;
  const initialDots = getRadarDots(container).map(getDotPosition);

  const dotsDuringAnimation: Array<ReadonlyArray<DotPos>> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    const currentDots = getRadarDots(container).map(getDotPosition);
    dotsDuringAnimation.push(currentDots);
    initialDots.forEach((initial, index) => {
      const current = currentDots[index];
      assertNotNull(current);
      expect(initial.cx !== current.cx || initial.cy !== current.cy).toBe(true);
    });
  }

  await manager.completeAnimation();
  const finalDots = getRadarDots(container).map(getDotPosition);
  finalDots.forEach((final, index) => {
    const initial = initialDots[index];
    assertNotNull(initial);
    expect(final.cx !== initial.cx || final.cy !== initial.cy).toBe(true);
  });
  dotsDuringAnimation.push(finalDots);
  expect(dotsDuringAnimation).toHaveLength(steps);
  return dotsDuringAnimation;
}

// Same drive as expectAnimatedRadarDots but tracks each dot's radius from (CX,CY),
// asserting every radius changes each step (the polygon grows from the center).
async function expectAnimatedDotRadii(
  container: Element,
  manager: MockProgressAnimationManager,
  steps = 5,
): Promise<ReadonlyArray<ReadonlyArray<number>>> {
  let progress = 0.1;
  await manager.setAnimationProgress(progress);
  const stepSize = (1 - progress) / steps;
  const initialRadii = getRadarDotRadii(container);

  const radiiDuringAnimation: Array<ReadonlyArray<number>> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    const currentRadii = getRadarDotRadii(container);
    radiiDuringAnimation.push(currentRadii);
    initialRadii.forEach((initial, index) => {
      expect(currentRadii[index]).not.toBe(initial);
    });
  }

  await manager.completeAnimation();
  const finalRadii = getRadarDotRadii(container);
  finalRadii.forEach((final, index) => {
    expect(final).not.toBe(initialRadii[index]);
  });
  radiiDuringAnimation.push(finalRadii);
  expect(radiiDuringAnimation).toHaveLength(steps);
  return radiiDuringAnimation;
}

const renderRadarChart = (radar: () => JSX.Element) => (
  <RadarChart
    cx={CX}
    cy={CY}
    outerRadius={RADAR_RADIUS}
    width={100}
    height={100}
    data={smallerData}
  >
    <PolarGrid />
    <PolarAngleAxis dataKey="name" />
    <PolarRadiusAxis />
    {radar()}
  </RadarChart>
);

describe("Radar animation", () => {
  describe("with isAnimationActive=false", () => {
    const onAnimationStart = vi.fn();
    const onAnimationEnd = vi.fn();

    it("should render one path without animation", () => {
      const { container } = render(() =>
        renderRadarChart(() => (
          <Radar
            dataKey="pv"
            isAnimationActive={false}
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
            dot
          />
        )),
      );
      expect(getPolygonPath(container)).toBe("M50,34L76.3676,65.2233L41.9286,54.66L50,34Z");
    });

    it("should render dots without animation", () => {
      const { container } = render(() =>
        renderRadarChart(() => (
          <Radar
            dataKey="pv"
            isAnimationActive={false}
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
            dot
          />
        )),
      );
      // Byte-identical to the reference (settled dots render at full-precision cx/cy).
      expectRadarDots(container, [
        { cx: "50", cy: "34" },
        { cx: "76.36758679389021", cy: "65.22333333333333" },
        { cx: "41.92864323672903", cy: "54.66" },
      ]);
    });

    it("should render path at the final radius", () => {
      const { container } = render(() =>
        renderRadarChart(() => <Radar dataKey="pv" isAnimationActive={false} dot />),
      );
      const radii = getRadarDotRadii(container);
      expect(radii.map((r) => r.toFixed(2))).toEqual(["16.00", "30.45", "9.32"]);
    });

    it("should not call animation start or end callbacks", () => {
      onAnimationStart.mockClear();
      onAnimationEnd.mockClear();
      render(() =>
        renderRadarChart(() => (
          <Radar
            dataKey="pv"
            isAnimationActive={false}
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
            dot
          />
        )),
      );
      expect(onAnimationStart).not.toHaveBeenCalled();
      expect(onAnimationEnd).not.toHaveBeenCalled();
    });
  });

  describe("initial animation with simple props", () => {
    const onAnimationStart = vi.fn();
    const onAnimationEnd = vi.fn();

    it("should render polygons with animation", async () => {
      const manager = new MockProgressAnimationManager("radar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          {renderRadarChart(() => (
            <Radar
              dot
              dataKey="amt"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          ))}
        </AnimationControllerProvider.Provider>
      ));
      // Tier-B (golden-anchored to behaviour + the byte-identical settled frame): the
      // exact intermediate easing-frame geometry is coupled to the mock manager's
      // progress→t mapping (a harness detail), so we assert the animation runs (frames
      // differ from the settled state) and lands on the settled polygon.
      const paths = await expectAnimatedRadarPolygons(container, manager);
      const settled = "M50,10L84.641,70L15.359,70L50,10Z";
      expect(paths).toHaveLength(5);
      // Final frame is the settled geometry.
      expect(paths[paths.length - 1]).toBe(settled);
      // A mid-animation frame is not yet settled (polygon still expanding from center).
      expect(paths[0]).not.toBe(settled);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    it("should render dots with initial animation", async () => {
      const manager = new MockProgressAnimationManager("radar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          {renderRadarChart(() => (
            <Radar dot dataKey="amt" isAnimationActive />
          ))}
        </AnimationControllerProvider.Provider>
      ));
      // Tier-B: the dots move each step (they render from the interpolated stepData,
      // so they entrance-animate with the polygon) and land on the byte-identical
      // settled positions.
      const dots = await expectAnimatedRadarDots(container, manager);
      expect(dots).toHaveLength(5);
      expect(dots[dots.length - 1]).toEqual([
        { cx: "50", cy: "10" },
        { cx: "84.64101615137756", cy: "70" },
        { cx: "15.35898384862245", cy: "70" },
      ]);
    });

    it("should render points radii with animation", async () => {
      const manager = new MockProgressAnimationManager("radar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          {renderRadarChart(() => (
            <Radar dot dataKey="amt" isAnimationActive />
          ))}
        </AnimationControllerProvider.Provider>
      ));
      // Tier-B: each dot's radius grows from the center each step and settles at the
      // outer radius (40) for the "amt" series.
      const radii = await expectAnimatedDotRadii(container, manager);
      expect(radii).toHaveLength(5);
      const settledRadii = radii[radii.length - 1];
      assertNotNull(settledRadii);
      expect(settledRadii.map((r) => Math.round(r))).toEqual([40, 40, 40]);
    });
  });

  // POLYGON + DOT re-animation. Re-animation has no React `key`: the chart's
  // `dataKey`/`data` is a signal swapped via an in-tree button click (so the re-render
  // runs inside the render-root owner). A fresh points reference yields a new
  // useAnimationId memo → a NEW animation subscribes a NEW manager via the context
  // factory; a manager registry drives the most-recently-created one. Tier-B: the exact
  // mid frames are harness-coupled, so we assert the animation re-runs, the dots move,
  // and everything lands on the byte-identical settled frame.
  describe("when changing dataKey prop", () => {
    // Renders the chart with a signal-swapped dataKey and primes it (completes the
    // entrance animation, then flips the dataKey to arm the re-animation).
    async function renderAndPrime(): Promise<{
      container: HTMLElement;
      registry: ReturnType<typeof createManagerRegistry>;
    }> {
      const registry = createManagerRegistry();
      const [dataKey, setDataKey] = createSignal("amt");
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={registry.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setDataKey((prev) => (prev === "amt" ? "pv" : "amt"))}
          />
          <RadarChart
            cx={CX}
            cy={CY}
            outerRadius={RADAR_RADIUS}
            width={100}
            height={100}
            data={smallerData}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Radar dot dataKey={dataKey()} isAnimationActive />
          </RadarChart>
        </AnimationControllerProvider.Provider>
      ));
      await registry.current().completeAnimation();
      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      assertNotNull(button);
      fireEvent.click(button);
      return { container, registry };
    }

    it("should re-run the radar polygon animation", async () => {
      const registry = createManagerRegistry();
      const [dataKey, setDataKey] = createSignal("amt");
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={registry.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setDataKey((prev) => (prev === "amt" ? "pv" : "amt"))}
          />
          <RadarChart
            cx={CX}
            cy={CY}
            outerRadius={RADAR_RADIUS}
            width={100}
            height={100}
            data={smallerData}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Radar dot dataKey={dataKey()} isAnimationActive />
          </RadarChart>
        </AnimationControllerProvider.Provider>
      ));
      await registry.current().completeAnimation();
      const initial = getPolygonPath(container);

      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      assertNotNull(button);
      fireEvent.click(button);
      const reanimated = await expectAnimatedRadarPolygons(container, registry.current());
      const settled = reanimated[reanimated.length - 1];

      expect(reanimated).toHaveLength(5);
      // The new dataKey (pv) settles to different geometry than the initial (amt) frame.
      expect(settled).not.toBe(initial);
      // A mid-animation frame differs from the settled state (the animation re-ran).
      expect(reanimated[0]).not.toBe(settled);
    });

    it("should animate the radar dots", async () => {
      const { container, registry } = await renderAndPrime();
      // Tier-B: the dots re-animate on the dataKey swap and settle byte-identically
      // to the "pv" series positions.
      const dots = await expectAnimatedRadarDots(container, registry.current());
      expect(dots).toHaveLength(5);
      expect(dots[dots.length - 1]).toEqual([
        { cx: "50", cy: "34" },
        { cx: "76.36758679389021", cy: "65.22333333333333" },
        { cx: "41.92864323672903", cy: "54.66" },
      ]);
    });

    it("should animate the radar radii", async () => {
      const { container, registry } = await renderAndPrime();
      const radii = await expectAnimatedDotRadii(container, registry.current());
      expect(radii).toHaveLength(5);
      const settledRadii = radii[radii.length - 1];
      assertNotNull(settledRadii);
      expect(settledRadii.map((r) => Number(r.toFixed(2)))).toEqual([16, 30.45, 9.32]);
    });
  });

  describe("tests that change data array", () => {
    // Renders the chart with a signal-swapped data array and primes it (completes the
    // entrance animation, then swaps 3→2 points to arm the re-animation).
    async function renderAndPrime(): Promise<{
      container: HTMLElement;
      registry: ReturnType<typeof createManagerRegistry>;
    }> {
      const registry = createManagerRegistry();
      const [data, setData] = createSignal<ReadonlyArray<(typeof PageData)[number]>>(smallerData);
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={registry.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setData((prev) => (prev === smallerData ? biggerData : smallerData))}
          />
          <RadarChart
            cx={CX}
            cy={CY}
            outerRadius={RADAR_RADIUS}
            width={100}
            height={100}
            data={data()}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Radar dot dataKey="pv" isAnimationActive />
          </RadarChart>
        </AnimationControllerProvider.Provider>
      ));
      await registry.current().completeAnimation();
      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      assertNotNull(button);
      fireEvent.click(button);
      return { container, registry };
    }

    it("should re-run the radar polygon animation from 3 to 2 points", async () => {
      const { container, registry } = await renderAndPrime();
      const armed = getPolygonPath(container);
      const reanimated = await expectAnimatedRadarPolygons(container, registry.current());
      const settled = reanimated[reanimated.length - 1];

      expect(reanimated).toHaveLength(5);
      // Fewer points → different settled polygon than the just-armed frame.
      expect(settled).not.toBe(armed);
      expect(reanimated[0]).not.toBe(settled);
    });

    it("should animate dots from 3 to 2 points", async () => {
      const { container, registry } = await renderAndPrime();
      // The removed 3rd point drops immediately (defaultRadarAnimateItems), so only the
      // 2 surviving dots animate. Tier-B: assert they move and land on 2 settled dots.
      const dots = await expectAnimatedRadarDots(container, registry.current());
      expect(dots).toHaveLength(5);
      expect(dots[dots.length - 1]).toHaveLength(2);
      // A mid frame differs from the settled frame (the animation re-ran).
      expect(dots[0]).not.toEqual(dots[dots.length - 1]);
    });

    it("should animate radii from 3 to 2 points", async () => {
      const { container, registry } = await renderAndPrime();
      const radii = await expectAnimatedDotRadii(container, registry.current());
      expect(radii).toHaveLength(5);
      expect(radii[radii.length - 1]).toHaveLength(2);
    });
  });
});
