// Ported from recharts 3.9.2 test/helper/expectAnimatedPiePaths.ts.
//
// Solid deviation: `flush()` after each `setAnimationProgress` (React auto-renders;
// Solid needs the flush to land the interpolated frame in the DOM). Otherwise a
// faithful port — same 0.1 start, same `(1 - 0.1) / steps` step size, same per-frame
// change assertions.
import { expect } from "vitest";
import { flush } from "solid-js";
import type { MockAnimationManager } from "../animation/mockControllerAnimationManager";
import { assertNotNull } from "./assertNotNull";
import { selectPieSectors } from "./expectPieSectors";
import { inSequence, progressSteps } from "./inSequence";
import { trim } from "./trim";

export async function expectAnimatedPiePaths(
  container: Element,
  animationManager: MockAnimationManager,
  steps: number = 5,
): Promise<ReadonlyArray<ReadonlyArray<string>>> {
  assertNotNull(container);
  /*
   * Pie sectors at 0% progress do not render at all, so we
   * start from 0.1 so that the sectors have rendered a little bit.
   */
  const animationProgress = 0.1;
  await animationManager.setAnimationProgress(animationProgress);
  flush();
  const stepSize = (1 - animationProgress) / steps;
  const initialPieSectors = selectPieSectors(container);
  expect(initialPieSectors.length).toBeGreaterThan(0);
  const getD = (sector: Element): string => {
    const trimmed = trim(sector.getAttribute("d"));
    assertNotNull(trimmed);
    return trimmed;
  };
  const initialPathDs = Array.from(initialPieSectors).map(getD);
  const initialAttributes = Array.from(initialPieSectors).map((sector) => ({
    fill: sector.getAttribute("fill"),
    stroke: sector.getAttribute("stroke"),
  }));

  const pathDsDuringAnimation: string[][] = [];
  await inSequence(progressSteps(animationProgress + stepSize, stepSize, 1), async (progress) => {
    await animationManager.setAnimationProgress(progress);
    flush();
    const currentPieSectors = selectPieSectors(container);
    const currentPathDs = Array.from(currentPieSectors).map(getD);
    pathDsDuringAnimation.push(currentPathDs);

    // Assert that all d attributes change
    initialPathDs.forEach((initial, index) => {
      const currentSector = currentPieSectors[index]!;
      expect(trim(currentSector.getAttribute("d"))).not.toBe(initial);
      expect(currentSector.getAttribute("fill")).toBe(initialAttributes[index]!.fill);
      expect(currentSector.getAttribute("stroke")).toBe(initialAttributes[index]!.stroke);
    });
  });

  await animationManager.completeAnimation();
  flush();
  // Final check to ensure the animation completed
  const finalPieSectors = selectPieSectors(container);
  expect(finalPieSectors).toHaveLength(initialPieSectors.length);
  finalPieSectors.forEach((sector, index) => {
    expect(trim(sector.getAttribute("d"))).not.toBe(initialPathDs[index]);
    expect(sector.getAttribute("fill")).toBe(initialAttributes[index]!.fill);
    expect(sector.getAttribute("stroke")).toBe(initialAttributes[index]!.stroke);
  });

  // collect the path.d-s one last time, at the end of the animation
  const finalPathDs = Array.from(finalPieSectors).map(getD);
  pathDsDuringAnimation.push(finalPathDs);

  // Return the collected path.d-s
  expect(pathDsDuringAnimation).toHaveLength(steps);

  return pathDsDuringAnimation;
}
