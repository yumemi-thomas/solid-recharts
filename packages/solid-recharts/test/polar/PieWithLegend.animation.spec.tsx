// Ported from recharts 3.9.0 test/polar/Pie/PieWithLegend.animation.spec.tsx
// (https://github.com/recharts/recharts/issues/7254): the Pie ENTER animation must
// run correctly with a <Legend /> sibling in the chart.
//
// Tier-B convention (as in Pie.animation.spec / Scatter.animation.spec): the SETTLED
// frame is anchored byte-identically against an isAnimationActive={false} render of
// the same chart (Legend layout may reserve plot space differently than recharts, so
// upstream's absolute path/angle matrices don't transfer); intermediate frames are
// anchored to behaviour (sectors present, sweeping monotonically toward settled).
//
// v3.9 GOTCHA: the new JavascriptAnimation state machine calls onAnimationStart
// SYNCHRONOUSLY in its constructor (on first render), not lazily on the first tick.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { PieChart, Pie, Legend } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { expectPieSectors, selectPieSectors, getPieSectorAngles } from "../helper/expectPieSectors";
import { trim } from "../helper/trim";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 3);

describe("initial animation when the chart has Legend in it (https://github.com/recharts/recharts/issues/7254)", () => {
  const onAnimationStart = vi.fn();
  const onAnimationEnd = vi.fn();

  beforeEach(() => {
    onAnimationStart.mockClear();
    onAnimationEnd.mockClear();
  });

  function renderTestCase() {
    const manager = new MockProgressAnimationManager("pie-legend-anim");
    const { container } = render(() => (
      <AnimationControllerProvider value={manager.factory}>
        <PieChart width={100} height={100}>
          <Pie
            data={smallerData}
            dataKey="amt"
            isAnimationActive
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
          />
          <Legend />
        </PieChart>
      </AnimationControllerProvider>
    ));
    flush();
    return { container, animationManager: manager };
  }

  /** The settled reference: the identical chart rendered without animation. */
  function renderSettledReference(): ReadonlyArray<string> {
    const { container } = render(() => (
      <PieChart width={100} height={100}>
        <Pie data={smallerData} dataKey="amt" isAnimationActive={false} />
        <Legend />
      </PieChart>
    ));
    flush();
    return selectPieSectors(container).map((s) => trim(s.getAttribute("d")) ?? "");
  }

  it("should first render nothing", () => {
    const { container } = renderTestCase();

    // Initially, no sectors should be rendered
    expectPieSectors(container, []);
  });

  it("should call onAnimationStart callback when the animation begins", async () => {
    const { animationManager } = renderTestCase();
    expect(onAnimationStart).toHaveBeenCalledTimes(1);

    await animationManager.setAnimationProgress(0.1);
    flush();
    expect(onAnimationStart).toHaveBeenCalledTimes(1);
    expect(onAnimationStart).toHaveBeenCalledWith();

    await animationManager.completeAnimation();
    flush();
    expect(onAnimationStart).toHaveBeenCalledTimes(1);
  });

  it("should call onAnimationEnd callback when the animation ends", async () => {
    const { animationManager } = renderTestCase();

    expect(onAnimationEnd).not.toHaveBeenCalled();
    await animationManager.setAnimationProgress(0.9);
    flush();
    expect(onAnimationEnd).not.toHaveBeenCalled();

    await animationManager.completeAnimation();
    flush();
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(onAnimationEnd).toHaveBeenCalledWith();
  });

  it("should render sectors with animation and land on the settled geometry", async () => {
    const settledPaths = renderSettledReference();
    expect(settledPaths).toHaveLength(smallerData.length);

    const { container, animationManager } = renderTestCase();

    // Mid-animation: all sectors render, but with in-flight (non-settled) geometry.
    await animationManager.setAnimationProgress(0.5);
    flush();
    const midPaths = selectPieSectors(container).map((s) => trim(s.getAttribute("d")) ?? "");
    expect(midPaths).toHaveLength(smallerData.length);
    expect(midPaths).not.toEqual(settledPaths);

    // t=1: byte-identical to the isAnimationActive={false} render.
    await animationManager.completeAnimation();
    flush();
    const finalPaths = selectPieSectors(container).map((s) => trim(s.getAttribute("d")) ?? "");
    expect(finalPaths).toEqual(settledPaths);
  });

  it("should render sectors with monotonically growing animated angles", async () => {
    const { container, animationManager } = renderTestCase();

    await animationManager.setAnimationProgress(0.3);
    flush();
    const anglesAt03 = getPieSectorAngles(selectPieSectors(container));
    expect(anglesAt03).toHaveLength(smallerData.length);

    await animationManager.setAnimationProgress(0.7);
    flush();
    const anglesAt07 = getPieSectorAngles(selectPieSectors(container));
    expect(anglesAt07).toHaveLength(smallerData.length);

    // The first sector's start stays pinned at 0° (recharts parity) while the
    // total swept angle (the last sector's end) grows toward the full circle.
    expect(anglesAt03[0]!.startAngle).toBeCloseTo(0);
    expect(anglesAt07[0]!.startAngle).toBeCloseTo(0);
    expect(anglesAt07[anglesAt07.length - 1]!.endAngle).toBeGreaterThan(
      anglesAt03[anglesAt03.length - 1]!.endAngle,
    );
  });
});
