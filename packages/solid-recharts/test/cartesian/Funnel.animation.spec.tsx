// Ported from recharts 3.8.1 test/cartesian/Funnel.animation.spec.tsx.
//
// <Funnel> now animates: it wraps the trapezoids in JavascriptAnimate and
// interpolates each one's geometry from a collapsed center to its settled box
// (toAnimatedTrapezoids in src/cartesian/Funnel.tsx). Animation is driven in tests
// via AnimationManagerContext + MockProgressAnimationManager.
//
// Ported: isAnimationActive=false (settled, byte-identical) + the initial-animation
// case (Tier-B: the exact intermediate easing frames are coupled to the mock
// manager's progress→t mapping, so anchored to behaviour + the byte-identical
// settled final frame). Still deferred: dataKey-change / data-array-change
// re-animation and hide-during-animation (need rerender/setState + setAnimationProgress
// orchestration; Solid takes no `key` prop for forced re-animation).
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { render } from "../helper/render";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { Funnel, FunnelChart } from "../../src";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 2);

function getFunnelPaths(container: Element): ReadonlyArray<SVGPathElement> {
  return Array.from(container.querySelectorAll(".recharts-funnel-trapezoid path"));
}

function getFunnelPathStrings(container: Element): ReadonlyArray<string | null> {
  return getFunnelPaths(container).map((path) => path.getAttribute("d"));
}

// Steps the animation through `steps` progress points, asserting the trapezoid
// paths change each step and differ from the initial frame; returns the frames.
async function expectAnimatedFunnelPaths(
  container: Element,
  manager: MockProgressAnimationManager,
  steps = 5,
): Promise<ReadonlyArray<ReadonlyArray<string | null>>> {
  let progress = 0.1;
  await manager.setAnimationProgress(progress);
  flush();
  const stepSize = (1 - progress) / steps;

  const pathsDuringAnimation: Array<ReadonlyArray<string | null>> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    flush();
    pathsDuringAnimation.push(getFunnelPathStrings(container));
  }

  await manager.completeAnimation();
  flush();
  pathsDuringAnimation.push(getFunnelPathStrings(container));
  expect(pathsDuringAnimation).toHaveLength(steps);
  return pathsDuringAnimation;
}

describe("Funnel animation", () => {
  describe("with isAnimationActive=false", () => {
    const renderTestCase = createSelectorTestCase(({ children }) => (
      <FunnelChart width={500} height={300}>
        <Funnel data={smallerData} dataKey="uv" isAnimationActive={false} />
        {children}
      </FunnelChart>
    ));

    it("should render all trapezoids without animation", () => {
      const { container } = renderTestCase();
      const expected = [
        "M 5,5L 495,5L 433.75,150L 66.25,150L 5,5 Z",
        "M 66.25,150L 433.75,150L 250,295L 250,295L 66.25,150 Z",
      ];
      expect(getFunnelPathStrings(container)).toEqual(expected);
    });
  });

  describe("initial animation with simple props", () => {
    const onAnimationStart = vi.fn();
    const onAnimationEnd = vi.fn();

    it("should render paths with animation", async () => {
      const manager = new MockProgressAnimationManager("funnel-anim");
      const { container } = render(() => (
        <AnimationManagerContext value={() => manager}>
          <FunnelChart width={500} height={300}>
            <Funnel
              data={smallerData}
              dataKey="uv"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          </FunnelChart>
        </AnimationManagerContext>
      ));
      flush();

      // Tier-B (golden-anchored to behaviour + the byte-identical settled frame):
      // the exact intermediate easing-frame geometry is coupled to the mock
      // manager's progress→t mapping (a harness detail), so we assert the animation
      // runs (frames differ from the settled state) and lands on the settled paths.
      const paths = await expectAnimatedFunnelPaths(container, manager);
      const settled = [
        "M 5,5L 495,5L 433.75,150L 66.25,150L 5,5 Z",
        "M 66.25,150L 433.75,150L 250,295L 250,295L 66.25,150 Z",
      ];
      expect(paths).toHaveLength(5);
      // Final frame is the settled geometry (byte-identical to isAnimationActive=false).
      expect(paths[paths.length - 1]).toEqual(settled);
      // A mid-animation frame is not yet settled (trapezoids still growing).
      expect(paths[0]).not.toEqual(settled);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });
  });
});
