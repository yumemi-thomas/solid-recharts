// Ported from recharts 3.9.0 test/polar/RadialBar/RadialBar.animation.spec.tsx
// (migrated to the v3.9 animation engine). <RadialBar> animates its ring sectors on
// the new engine: each sector is driven by <AnimatedItems> + the default
// `defaultRadialBarAnimateItems` interpolation (matched sectors tween start/end angle
// prev→next; added sectors sweep endAngle from startAngle to final; removed sectors
// drop). Animation is driven in tests via AnimationControllerProvider + the new-engine
// MockControllerAnimationManager (deterministic progress → t mapping).
//
// Tier split: settled (t=1) frames are Tier-A — byte-identical to the reference (and
// to the isAnimationActive=false static render). Mid-animation frames are Tier-B: the
// exact intermediate easing-frame geometry is coupled to the mock manager's progress→t
// mapping (a harness detail), so those cases assert the animation runs (frames differ
// from the settled state) and lands on the byte-identical settled frame.
//
// PERMANENT-N/A: the reference `key`-prop re-animation describe uses React's `key`
// to force a remount (Solid has none); its re-animation-from-zero semantics are the
// same engine path exercised by the dataKey-change re-animation case ported below.
//
// GOTCHA (v3.9 engine): the JavascriptAnimation state machine calls onAnimationStart
// SYNCHRONOUSLY in its constructor (on first render), not lazily when the first frame
// ticks — matching recharts 3.9. So right after render onAnimationStart is already
// called once (toHaveBeenCalledTimes(1)), not not.toHaveBeenCalled().
import { describe, expect, it, vi } from "vitest";
import type { JSX } from "@solidjs/web";
import { createSignal, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { assertNotNull } from "../helper/assertNotNull";
import { trim } from "../helper/trim";
import { RadialBarChart, RadialBar } from "../../src";
import type { AnimationController } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { PageData, pageDataWithFillColor } from "../_data";

const SECTOR = ".recharts-radial-bar-sectors path.recharts-sector.recharts-radial-bar-sector";

const smallerData = pageDataWithFillColor.slice(0, 2);

function getRadialBarPathStrings(container: Element): ReadonlyArray<string> {
  return Array.from(container.querySelectorAll(SECTOR)).map(
    (bar) => trim(bar.getAttribute("d")) ?? "",
  );
}

// The new engine increments the animation id every cycle (useAnimationId), so each
// re-animation subscribes a fresh AnimationController via the context factory. We hand
// the context ONE MockControllerAnimationManager whose factory rebinds to the newest
// AnimationHandle on every subscribe, so `current()` always drives the most recently
// created animation — the same idiom Radar/Bar.animation.spec use.
function createManagerRegistry(): {
  factory: AnimationController;
  current: () => MockProgressAnimationManager;
} {
  const manager = new MockProgressAnimationManager("radialbar-anim");
  return { factory: manager.factory, current: (): MockProgressAnimationManager => manager };
}

// Steps the animation through `steps` progress points, asserting each sector path
// changes from its initial (t=0.1) frame each step and after the final frame; returns
// the frames. Tier-B: the exact intermediate geometry is harness-coupled, so callers
// assert movement + the byte-identical settled frame.
async function expectAnimatedRadialBarPaths(
  container: Element,
  manager: MockProgressAnimationManager,
  steps = 5,
): Promise<ReadonlyArray<ReadonlyArray<string>>> {
  let progress = 0.1;
  await manager.setAnimationProgress(progress);
  flush();
  const stepSize = (1 - progress) / steps;
  const initialPaths = getRadialBarPathStrings(container);

  const pathsDuringAnimation: Array<ReadonlyArray<string>> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    flush();
    const currentPaths = getRadialBarPathStrings(container);
    pathsDuringAnimation.push(currentPaths);
    initialPaths.forEach((initial, index) => {
      expect(currentPaths[index]).not.toBe(initial);
    });
  }

  await manager.completeAnimation();
  flush();
  const finalPaths = getRadialBarPathStrings(container);
  finalPaths.forEach((final, index) => {
    expect(final).not.toBe(initialPaths[index]);
  });
  pathsDuringAnimation.push(finalPaths);
  expect(pathsDuringAnimation).toHaveLength(steps);
  return pathsDuringAnimation;
}

describe("RadialBar animation", () => {
  const onAnimationStart = vi.fn();
  const onAnimationEnd = vi.fn();

  // Byte-identical settled ring geometry for smallerData (dataKey="uv", 400x400).
  const settledPaths = [
    "M 269.8,200 A 69.8,69.8,0, 1,0, 269.8,200.0012 L 207.8,200.0001 A 7.8,7.8,0, 1,1, 207.8,200 Z",
    "M 347.8,200 A 147.8,147.8,0, 1,0, 285.4481,320.5963 L 249.6038,270.0079 A 85.8,85.8,0, 1,1, 285.8,200 Z",
  ];

  describe("with isAnimationActive=false", () => {
    it("should render all bars without animation", () => {
      const { container } = render(() => (
        <RadialBarChart width={400} height={400} data={smallerData}>
          <RadialBar dataKey="uv" isAnimationActive={false} />
        </RadialBarChart>
      ));
      flush();
      expect(getRadialBarPathStrings(container)).toEqual(settledPaths);
    });

    it("does not call the animation callbacks when isAnimationActive=false", () => {
      const start = vi.fn();
      const end = vi.fn();
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar
            dataKey="uv"
            isAnimationActive={false}
            onAnimationStart={start}
            onAnimationEnd={end}
          />
        </RadialBarChart>
      ));
      flush();
      expect(container.querySelectorAll(SECTOR)).toHaveLength(PageData.length);
      expect(start).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
    });
  });

  describe("initial animation with simple props", () => {
    it("grows the rings from zero-sweep (t=0) to full (t=1)", async () => {
      const manager = new MockProgressAnimationManager("radialbar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <RadialBarChart width={500} height={500} data={PageData}>
            <RadialBar dataKey="uv" fill="#8884d8" />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();

      // t=0: every ring has zero sweep (endAngle === startAngle) → no sector path.
      expect(container.querySelectorAll(SECTOR)).toHaveLength(0);

      await manager.completeAnimation();
      flush();
      expect(container.querySelectorAll(SECTOR)).toHaveLength(PageData.length);
    });

    it("should render paths with animation, landing on the settled frame", async () => {
      onAnimationStart.mockClear();
      onAnimationEnd.mockClear();
      const manager = new MockProgressAnimationManager("radialbar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <RadialBarChart width={400} height={400} data={smallerData}>
            <RadialBar
              dataKey="uv"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();

      // Tier-B: the exact intermediate easing frames are harness-coupled, so we assert
      // the animation runs (frames differ from the settled state) and lands on the
      // byte-identical settled rings.
      const paths = await expectAnimatedRadialBarPaths(container, manager);
      expect(paths).toHaveLength(5);
      expect(paths[paths.length - 1]).toEqual(settledPaths);
      // A mid frame is not yet settled (rings still sweeping open).
      expect(paths[0]).not.toEqual(settledPaths);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    it("calls onAnimationStart when the animation begins and onAnimationEnd when it ends", async () => {
      const start = vi.fn();
      const end = vi.fn();
      const manager = new MockProgressAnimationManager("radialbar-anim-cb");
      render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <RadialBarChart width={500} height={500} data={PageData}>
            <RadialBar
              dataKey="uv"
              isAnimationActive
              onAnimationStart={start}
              onAnimationEnd={end}
            />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();

      // v3.9 engine: onAnimationStart fires synchronously in the JavascriptAnimation
      // constructor on first render (matching recharts 3.9).
      expect(start).toHaveBeenCalledTimes(1);
      expect(end).not.toHaveBeenCalled();

      await manager.setAnimationProgress(0.1);
      flush();
      expect(start).toHaveBeenCalledTimes(1);
      expect(end).not.toHaveBeenCalled();

      await manager.completeAnimation();
      flush();
      expect(start).toHaveBeenCalledTimes(1);
      expect(end).toHaveBeenCalledTimes(1);
    });
  });

  describe("shape prop", () => {
    function CustomShape(props: {
      animationElapsedTime?: number;
      isAnimating?: boolean;
      isEntrance?: boolean;
    }): JSX.Element {
      return (
        <path
          class="custom-radial-bar-shape"
          data-t={props.animationElapsedTime}
          data-is-animating={String(props.isAnimating)}
          data-is-entrance={String(props.isEntrance)}
        />
      );
    }

    it("should pass animationElapsedTime, isAnimating, isEntrance props to the custom shape", async () => {
      const manager = new MockProgressAnimationManager("radialbar-anim");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <RadialBarChart width={400} height={400} data={smallerData}>
            <RadialBar
              dataKey="uv"
              isAnimationActive
              animationEasing="linear"
              shape={CustomShape}
            />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();

      await manager.setAnimationProgress(0.5);
      flush();
      const shapeDuringAnimation = container.querySelector(".custom-radial-bar-shape");
      assertNotNull(shapeDuringAnimation);
      expect(shapeDuringAnimation.getAttribute("data-t")).toBe("0.5");
      expect(shapeDuringAnimation.getAttribute("data-is-animating")).toBe("true");
      expect(shapeDuringAnimation.getAttribute("data-is-entrance")).toBe("true");

      await manager.completeAnimation();
      flush();
      const shapeAfterAnimation = container.querySelector(".custom-radial-bar-shape");
      assertNotNull(shapeAfterAnimation);
      expect(shapeAfterAnimation.getAttribute("data-t")).toBe("1");
      expect(shapeAfterAnimation.getAttribute("data-is-animating")).toBe("false");
      expect(shapeAfterAnimation.getAttribute("data-is-entrance")).toBe("false");
    });
  });

  // Re-animation has no React `key`: the chart's `dataKey` is a signal swapped via an
  // in-tree button click (so the re-render runs inside the render-root owner). A fresh
  // sectors reference yields a new useAnimationId memo → a NEW animation subscribes a
  // NEW manager via the context factory; the registry drives the most-recently-created
  // one. Tier-B: assert the animation re-runs and lands on the settled frame.
  describe("when changing dataKey prop", () => {
    it("should animate the bar paths", async () => {
      const registry = createManagerRegistry();
      const [dataKey, setDataKey] = createSignal("uv");
      const { container } = render(() => (
        <AnimationControllerProvider value={registry.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setDataKey((prev) => (prev === "uv" ? "pv" : "uv"))}
          />
          <RadialBarChart width={400} height={400} data={smallerData}>
            <RadialBar dataKey={dataKey()} isAnimationActive />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();
      await registry.current().completeAnimation();
      flush();
      const initial = getRadialBarPathStrings(container);

      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      assertNotNull(button);
      fireEvent.click(button);
      flush();

      const paths = await expectAnimatedRadialBarPaths(container, registry.current());
      const settled = paths[paths.length - 1];
      expect(paths).toHaveLength(5);
      // The new dataKey (pv) settles to different geometry than the initial (uv) frame.
      expect(settled).not.toEqual(initial);
      // A mid frame differs from the settled state (the animation re-ran).
      expect(paths[0]).not.toEqual(settled);
    });
  });

  describe("tests that change data array", () => {
    const data1 = smallerData;
    const data2 = pageDataWithFillColor.slice(3, 6);

    it("should animate from 2 to 3 bars", async () => {
      const registry = createManagerRegistry();
      const [data, setData] =
        createSignal<ReadonlyArray<(typeof pageDataWithFillColor)[number]>>(data1);
      const { container } = render(() => (
        <AnimationControllerProvider value={registry.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setData((prev) => (prev === data1 ? data2 : data1))}
          />
          <RadialBarChart width={400} height={400} data={data()}>
            <RadialBar dataKey="uv" isAnimationActive />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();
      await registry.current().completeAnimation();
      flush();
      expect(getRadialBarPathStrings(container)).toHaveLength(2);

      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      assertNotNull(button);
      fireEvent.click(button);
      flush();

      const paths = await expectAnimatedRadialBarPaths(container, registry.current());
      expect(paths).toHaveLength(5);
      // 3 bars after the swap; a mid frame differs from the settled frame.
      expect(paths[paths.length - 1]).toHaveLength(3);
      expect(paths[0]).not.toEqual(paths[paths.length - 1]);
    });
  });

  describe("when the radial bar element hides during the animation", () => {
    it("should not crash when the bar hides during the animation", async () => {
      const manager = new MockProgressAnimationManager("radialbar-anim");
      const [isVisible, setIsVisible] = createSignal(true);
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <button type="button" data-testid="toggle" onClick={() => setIsVisible((p) => !p)} />
          <RadialBarChart width={400} height={400} data={smallerData}>
            <RadialBar dataKey="uv" isAnimationActive hide={!isVisible()} />
          </RadialBarChart>
        </AnimationControllerProvider>
      ));
      flush();

      // Advance mid-animation, then hide the bar: the sectors unmount without crashing.
      await manager.setAnimationProgress(0.3);
      flush();
      expect(getRadialBarPathStrings(container).length).toBeGreaterThan(0);

      const button = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]');
      assertNotNull(button);
      fireEvent.click(button);
      flush();
      expect(getRadialBarPathStrings(container)).toHaveLength(0);
    });
  });
});
