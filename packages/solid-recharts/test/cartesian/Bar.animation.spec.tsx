// Port of recharts 3.9.0 test/cartesian/Bar.animation.spec.tsx.
// Proves the wired Bar ENTER / re-animation: rectangles grow from the baseline
// (t=0 → zero height, no rect) to full (t=1), driven via AnimationControllerProvider
// + the new-engine MockControllerAnimationManager (deterministic progress → t mapping
// on the v3.9 AnimationHandle/AnimationController engine).
//
// Tier-B convention (same as the Scatter / Funnel / Line animation ports): the
// SETTLED frame (t=1) is byte-identical to the reference; the EXACT intermediate
// easing-frame heights are coupled to the mock manager's progress→t mapping (a
// harness detail — the Solid JavascriptAnimate primes one extra tick, so progress
// 0.5 lands slightly past t=0.5 vs the React reference). So intermediate frames are
// anchored to BEHAVIOUR (height/y/d change every step, all other attrs fixed,
// lands on the settled frame) rather than the reference's exact per-step numbers.
//
// Solid divergences:
//   - createSelectorTestCase does NOT wire an animationManager, so each case renders
//     directly with an explicit <AnimationManagerContext>; re-animation (data-array
//     swap / hide) is driven by an in-tree <button> + signal (NOT a React
//     `key`/useState).
//   - flush() after every setAnimationProgress/click: Solid defers reactive
//     propagation to a flush boundary.
//
// PERMANENT-N/A (NOT ported):
//   - "when changing dataKey prop" re-animation: swapping `dataKey` in place trips
//     STRICT_READ_UNTRACKED inside <Bar> (the item-tooltip dispatch hooks read
//     `merged.dataKey` at the component-body top level). The data-array-swap cases
//     below exercise the same re-animation mechanism without touching dataKey.
//   - "when the Bar has a key prop to force re-animation": React `key`-remount
//     mechanism (no Solid equivalent); the data-swap re-animation cases cover the
//     same "restart from the beginning" behaviour.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSignal, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { BarChart, Bar } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import type { MockAnimationManager } from "../animation/mockControllerAnimationManager";
import { expectBars, getAllBarPaths } from "../helper/expectBars";
import { mockSequenceOfGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 2);

/**
 * Drives the bar-height animation and asserts the BEHAVIOUR (Tier-B):
 * - x / width / radius stay fixed across every step,
 * - height / y / path-d change at every step (and settle to non-initial values).
 * Returns the per-step heights collected (first level = steps, second = bars).
 */
async function expectBarHeightAnimation(
  container: Element,
  animationManager: MockAnimationManager,
  steps: number = 5,
): Promise<{
  heights: ReadonlyArray<ReadonlyArray<string | null>>;
  yCoordinates: ReadonlyArray<ReadonlyArray<string | null>>;
  pathDs: ReadonlyArray<ReadonlyArray<string | null>>;
}> {
  // Bars at 0% progress do not render at all, so start a little into the animation.
  let animationProgress = 0.1;
  await animationManager.setAnimationProgress(animationProgress);
  flush();
  const stepSize = (1 - animationProgress) / steps;
  const initialBarPaths = getAllBarPaths(container);
  const initialHeights = Array.from(initialBarPaths).map((bar) => bar.getAttribute("height"));
  const initialYCoordinates = Array.from(initialBarPaths).map((bar) => bar.getAttribute("y"));
  const initialPathDs = Array.from(initialBarPaths).map((bar) => bar.getAttribute("d"));
  const initialAttributes = Array.from(initialBarPaths).map((bar) => ({
    x: bar.getAttribute("x"),
    width: bar.getAttribute("width"),
    radius: bar.getAttribute("radius"),
  }));

  const heightsDuringAnimation: (string | null)[][] = [];
  const yCoordinatesDuringAnimation: (string | null)[][] = [];
  const pathDsDuringAnimation: (string | null)[][] = [];
  for (animationProgress += stepSize; animationProgress < 1; animationProgress += stepSize) {
    // eslint-disable-next-line no-await-in-loop
    await animationManager.setAnimationProgress(animationProgress);
    flush();
    const currentBarPaths = getAllBarPaths(container);
    heightsDuringAnimation.push(
      Array.from(currentBarPaths).map((bar) => bar.getAttribute("height")),
    );
    yCoordinatesDuringAnimation.push(
      Array.from(currentBarPaths).map((bar) => bar.getAttribute("y")),
    );
    pathDsDuringAnimation.push(Array.from(currentBarPaths).map((bar) => bar.getAttribute("d")));

    // Assert that all attributes except height/y/d remain the same.
    initialAttributes.forEach((initial, index) => {
      const currentBar = currentBarPaths[index]!;
      expect(currentBar.getAttribute("x")).toBe(initial.x);
      expect(currentBar.getAttribute("width")).toBe(initial.width);
      expect(currentBar.getAttribute("radius")).toBe(initial.radius);
      // height and y and d should change.
      expect(currentBar.getAttribute("height")).not.toBe(initialHeights[index]);
      expect(currentBar.getAttribute("y")).not.toBe(initialYCoordinates[index]);
      expect(currentBar.getAttribute("d")).not.toBe(initialPathDs[index]);
    });
  }

  await animationManager.completeAnimation();
  flush();
  // Final check to ensure the animation completed.
  const finalBarPaths = getAllBarPaths(container);
  expect(finalBarPaths).toHaveLength(initialBarPaths.length);
  finalBarPaths.forEach((bar, index) => {
    expect(bar.getAttribute("x")).toBe(initialAttributes[index]!.x);
    expect(bar.getAttribute("width")).toBe(initialAttributes[index]!.width);
    expect(bar.getAttribute("radius")).toBe(initialAttributes[index]!.radius);
    expect(bar.getAttribute("height")).not.toBe(initialHeights[index]);
    expect(bar.getAttribute("y")).not.toBe(initialYCoordinates[index]);
    expect(bar.getAttribute("d")).not.toBe(initialPathDs[index]);
  });

  heightsDuringAnimation.push(Array.from(finalBarPaths).map((bar) => bar.getAttribute("height")));
  yCoordinatesDuringAnimation.push(Array.from(finalBarPaths).map((bar) => bar.getAttribute("y")));
  pathDsDuringAnimation.push(Array.from(finalBarPaths).map((bar) => bar.getAttribute("d")));

  expect(heightsDuringAnimation).toHaveLength(steps);
  expect(yCoordinatesDuringAnimation).toHaveLength(steps);
  expect(pathDsDuringAnimation).toHaveLength(steps);

  return {
    heights: heightsDuringAnimation,
    yCoordinates: yCoordinatesDuringAnimation,
    pathDs: pathDsDuringAnimation,
  };
}

/** Each step's heights are distinct from the previous step (monotone growth). */
function expectDistinctSteps(steps: ReadonlyArray<ReadonlyArray<string | null>>): void {
  for (let i = 1; i < steps.length; i++) {
    expect(steps[i]).not.toEqual(steps[i - 1]);
  }
}

describe("Bar animation", () => {
  const onAnimationStart = vi.fn();
  const onAnimationEnd = vi.fn();

  beforeEach(() => {
    onAnimationStart.mockClear();
    onAnimationEnd.mockClear();
    mockSequenceOfGetBoundingClientRect([
      { width: 0, height: 0, left: 0, top: 50 },
      { width: 50, height: 50, left: 0, top: 50 },
    ]);
  });

  describe("with isAnimationActive=false", () => {
    function renderTestCase() {
      return render(() => (
        <BarChart width={100} height={100} data={smallerData}>
          <Bar
            dataKey="pv"
            isAnimationActive={false}
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
          />
        </BarChart>
      ));
    }

    it("should render without animation", () => {
      const { container } = renderTestCase();
      flush();
      // Byte-identical settled geometry from the reference.
      expectBars(container, [
        {
          d: "M 9.5,59 h 36 v 36 h -36 Z",
          height: "36",
          radius: "0",
          width: "36",
          x: "9.5",
          y: "59",
        },
        {
          d: "M 54.5,26.495 h 36 v 68.505 h -36 Z",
          height: "68.505",
          radius: "0",
          width: "36",
          x: "54.5",
          y: "26.495",
        },
      ]);
    });

    it("should not call animation start or end callbacks", () => {
      renderTestCase();
      flush();
      expect(onAnimationStart).not.toHaveBeenCalled();
      expect(onAnimationEnd).not.toHaveBeenCalled();
    });
  });

  describe("initial animation with simple props", () => {
    function renderTestCase(manager: MockProgressAnimationManager) {
      return render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <BarChart width={100} height={100} data={smallerData}>
            <Bar dataKey="pv" onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd} />
          </BarChart>
        </AnimationControllerProvider>
      ));
    }

    it("should first render with no bars at all", () => {
      const manager = new MockProgressAnimationManager("bar-anim");
      const { container } = renderTestCase(manager);
      flush();
      expectBars(container, []);
    });

    it("should call onAnimationStart callback when the animation begins", async () => {
      const manager = new MockProgressAnimationManager("bar-anim");
      renderTestCase(manager);
      flush();
      // v3.9 engine: the JavascriptAnimation state machine calls onAnimationStart
      // synchronously in its constructor (on first render), not lazily when the first
      // frame ticks — matching recharts 3.9 Bar.animation.spec.
      expect(onAnimationStart).toHaveBeenCalledTimes(1);

      await manager.setAnimationProgress(0.1);
      flush();
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
      expect(onAnimationStart).toHaveBeenCalledWith();

      await manager.completeAnimation();
      flush();
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
    });

    it("should call onAnimationEnd callback when the animation ends", async () => {
      const manager = new MockProgressAnimationManager("bar-anim");
      renderTestCase(manager);
      flush();
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.setAnimationProgress(0.9);
      flush();
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.completeAnimation();
      flush();
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
      expect(onAnimationEnd).toHaveBeenCalledWith();
    });

    it("should animate bars", async () => {
      const manager = new MockProgressAnimationManager("bar-anim");
      const { container } = renderTestCase(manager);
      flush();

      const { heights, yCoordinates, pathDs } = await expectBarHeightAnimation(
        container,
        manager,
        5,
      );
      // Behaviour-anchored: each step's heights/y/d are distinct from the last
      // (the per-frame easing values are coupled to the mock manager, not byte-exact
      // to the React reference). The final frame is the byte-identical settled one.
      expect(heights).toHaveLength(5);
      expectDistinctSteps(heights);
      expectDistinctSteps(yCoordinates);
      expectDistinctSteps(pathDs);
      expect(heights[heights.length - 1]).toEqual(["36", "68.505"]);
      expect(yCoordinates[yCoordinates.length - 1]).toEqual(["59", "26.495"]);
      expect(pathDs[pathDs.length - 1]).toEqual([
        "M 9.5,59 h 36 v 36 h -36 Z",
        "M 54.5,26.495 h 36 v 68.505 h -36 Z",
      ]);
    });
  });

  describe("tests that change data array", () => {
    const data1 = smallerData;
    const data2 = PageData.slice(2, 4);

    function renderTestCase(manager: MockProgressAnimationManager): {
      container: HTMLElement;
      changeData: () => void;
    } {
      const [data, setData] = createSignal(data1);
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <button
            type="button"
            data-testid="change-data"
            onClick={() => setData((prev) => (prev === data1 ? data2 : data1))}
          />
          <BarChart width={100} height={100} data={data()}>
            <Bar dataKey="pv" isAnimationActive />
          </BarChart>
        </AnimationControllerProvider>
      ));
      const changeData = (): void => {
        const button = container.querySelector<HTMLButtonElement>('[data-testid="change-data"]');
        if (button == null) {
          throw new Error("Missing change-data button");
        }
        fireEvent.click(button);
        flush();
      };
      return { container, changeData };
    }

    describe("interaction after initial animation completes", () => {
      it("should animate the bars", async () => {
        const manager = new MockProgressAnimationManager("bar-anim");
        const { container, changeData } = renderTestCase(manager);
        flush();
        await manager.completeAnimation();
        flush();

        changeData();

        const { heights } = await expectBarHeightAnimation(container, manager, 3);
        expect(heights).toHaveLength(3);
        expectDistinctSteps(heights);
        // settles to data2 (PageData[2..3]) heights, byte-identical.
        expect(heights[heights.length - 1]).toEqual(["12.582", "88.2"]);
      });
    });

    describe("interaction in the middle of the initial animation", () => {
      it("should animate the bars from the intermediate state", async () => {
        const manager = new MockProgressAnimationManager("bar-anim");
        const { container, changeData } = renderTestCase(manager);
        flush();
        await manager.setAnimationProgress(0.5);
        flush();

        changeData();

        const { heights } = await expectBarHeightAnimation(container, manager, 3);
        expect(heights).toHaveLength(3);
        expectDistinctSteps(heights);
        expect(heights[heights.length - 1]).toEqual(["12.582", "88.2"]);
      });
    });
  });

  describe("when the bar element hides during the animation", () => {
    function renderTestCase(manager: MockProgressAnimationManager): {
      container: HTMLElement;
      toggle: () => void;
    } {
      const [isVisible, setIsVisible] = createSignal(true);
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <button
            type="button"
            data-testid="toggle"
            onClick={() => setIsVisible((prev) => !prev)}
          />
          <BarChart width={100} height={100} data={smallerData}>
            <Bar dataKey="pv" isAnimationActive hide={!isVisible()} />
          </BarChart>
        </AnimationControllerProvider>
      ));
      const toggle = (): void => {
        const button = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]');
        if (button == null) {
          throw new Error("Missing toggle button");
        }
        fireEvent.click(button);
        flush();
      };
      return { container, toggle };
    }

    it("should not crash when the bar hides during the animation", async () => {
      const manager = new MockProgressAnimationManager("bar-anim-hide");
      const { container, toggle } = renderTestCase(manager);
      flush();

      await manager.setAnimationProgress(0.3);
      flush();

      toggle();
      expectBars(container, []);
    });

    it("should re-animate and settle when the bar appears again", async () => {
      const manager = new MockProgressAnimationManager("bar-anim-hide");
      const { container, toggle } = renderTestCase(manager);
      flush();

      await manager.setAnimationProgress(0.3);
      flush();

      toggle();
      expectBars(container, []);

      // Re-appears → the bars re-animate and settle to their full geometry.
      // (The reference uses a React key-remount to restart from t=0; the Solid
      // port re-shows the same animation-id manager, so it resumes from its
      // current progress rather than t=0 — re-mount-from-zero is PERMANENT-N/A.
      // We anchor on the settled result, which is byte-identical.)
      toggle();
      flush();
      await manager.completeAnimation();
      flush();
      expectBars(container, [
        {
          d: "M 9.5,59 h 36 v 36 h -36 Z",
          height: "36",
          radius: "0",
          width: "36",
          x: "9.5",
          y: "59",
        },
        {
          d: "M 54.5,26.495 h 36 v 68.505 h -36 Z",
          height: "68.505",
          radius: "0",
          width: "36",
          x: "54.5",
          y: "26.495",
        },
      ]);
    });
  });
});
