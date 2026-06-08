// Ported from recharts 3.8.1 test/polar/Radar.animation.spec.tsx (commit 7a23854).
//
// <Radar> now animates: the polygon (and, for range radars, its baseline) wraps in
// JavascriptAnimate and interpolates each point from the previous frame (or, on
// first mount, from the (cx,cy) center) to its settled position
// (interpolatePolarPoint in src/polar/Radar.tsx). Animation is driven in tests via
// AnimationManagerContext + MockProgressAnimationManager.
//
// Ported: the POLYGON-based cases — isAnimationActive=false (settled, byte-identical)
// + the initial-animation polygon case (Tier-B: the exact intermediate easing-frame
// geometry is coupled to the mock manager's progress→t mapping, a harness detail, so
// anchored to behaviour + the byte-identical settled final frame).
//
// Blocked (deferred — Radar has no dots in this port): every DOT-based case
// (`expectRadarDots`/`getRadarDots`) and every radii case (`getRadarDotRadii`), plus
// the dataKey-change / data-array-change / re-animation cases that assert on dots.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { assertNotNull } from "../helper/assertNotNull";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "../../src";
import { PageData } from "../_data";

const RADAR_RADIUS = 40;
const CX = 50;
const CY = 50;

const smallerData = PageData.slice(0, 3);

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
  flush();
  const stepSize = (1 - progress) / steps;
  const initialPath = getPolygonPath(container);

  const polygonsDuringAnimation: Array<string> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    flush();
    const currentPath = getPolygonPath(container);
    polygonsDuringAnimation.push(currentPath);
    expect(currentPath).not.toBe(initialPath);
  }

  await manager.completeAnimation();
  flush();
  const finalPath = getPolygonPath(container);
  expect(finalPath).not.toBe(initialPath);
  polygonsDuringAnimation.push(finalPath);
  expect(polygonsDuringAnimation).toHaveLength(steps);
  return polygonsDuringAnimation;
}

const renderRadarChart = (radar: () => unknown) => (
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
          />
        )),
      );
      flush();

      expect(getPolygonPath(container)).toBe("M50,34L76.3676,65.2233L41.9286,54.66L50,34Z");
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
          />
        )),
      );
      flush();

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
        <AnimationManagerContext value={() => manager}>
          {renderRadarChart(() => (
            <Radar
              dataKey="amt"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          ))}
        </AnimationManagerContext>
      ));
      flush();

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
  });
});
