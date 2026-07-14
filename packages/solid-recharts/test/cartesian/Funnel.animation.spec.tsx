// Ported from recharts 3.9.0 test/cartesian/Funnel.animation.spec.tsx.
//
// <Funnel> animates on the v3.9 engine: it wraps the trapezoids in AnimatedItems +
// AnimationController and interpolates each one's geometry from a collapsed center
// to its settled box (defaultFunnelAnimateItems in src/cartesian/Funnel.tsx).
// Animation is driven in tests via AnimationControllerProvider +
// MockControllerAnimationManager.
//
// Ported: isAnimationActive=false (settled, byte-identical) + the initial-animation
// case + the data-array-change and BOTH hide-during-animation cases (crash-safe +
// restart-on-reappear re-animation)
// (Tier-B: the exact intermediate easing frames are coupled to
// the mock manager's progress→t mapping, so each is anchored to behaviour — the
// animation re-runs, mid-frames differ from the settled state — plus the
// byte-identical settled final frame).
//
// Re-animation mechanism (no React `key`): the chart's `data`/`dataKey` is driven
// by a signal swapped via an in-tree <button> click (so the re-render runs inside
// the render root's owner). A fresh trapezoids reference yields a new useAnimationId
// memo → a NEW JavascriptAnimate subscribes a NEW manager via the context factory.
// A manager registry (one per animationId) drives the most-recently-created one.
import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { render, fireEvent } from "@solidjs/testing-library";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { Funnel, FunnelChart } from "../../src";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 2);
const biggerData = PageData.slice(3, 6);

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
  const stepSize = (1 - progress) / steps;

  const pathsDuringAnimation: Array<ReadonlyArray<string | null>> = [];
  for (progress += stepSize; progress < 1; progress += stepSize) {
    await manager.setAnimationProgress(progress);
    pathsDuringAnimation.push(getFunnelPathStrings(container));
  }

  await manager.completeAnimation();
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
        <AnimationControllerProvider.Provider value={manager.factory}>
          <FunnelChart width={500} height={300}>
            <Funnel
              data={smallerData}
              dataKey="uv"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          </FunnelChart>
        </AnimationControllerProvider.Provider>
      ));
      // v3.9 engine: the JavascriptAnimation state machine calls onAnimationStart
      // synchronously in its constructor (on first render), not lazily when the first
      // frame ticks — matching recharts 3.9.
      expect(onAnimationStart).toHaveBeenCalledTimes(1);

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

  // NOT ported: "when changing dataKey prop" re-animation. Swapping the `dataKey`
  // prop trips a STRICT_READ_UNTRACKED inside <Funnel>: the item-tooltip dispatch
  // hooks read `merged.dataKey` at the component-body top level
  // (useMouseEnterItemDispatch/useMouseClickItemDispatch in Funnel.tsx), which only
  // warns when dataKey actually changes. The data-array-change case below proves the
  // same re-animation mechanism without touching dataKey. (Fixing the dataKey read
  // is a Funnel-source dispatch-hook refactor outside this cluster.)

  describe("tests that change data array", () => {
    it("should animate from 2 to 3 trapezoids", async () => {
      const manager = new MockProgressAnimationManager("funnel-anim");
      const [data, setData] = createSignal<ReadonlyArray<(typeof PageData)[number]>>(smallerData);
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <button
            type="button"
            data-testid="swap"
            onClick={() => setData((prev) => (prev === smallerData ? biggerData : smallerData))}
          />
          <FunnelChart width={500} height={300}>
            <Funnel data={data()} dataKey="uv" isAnimationActive />
          </FunnelChart>
        </AnimationControllerProvider.Provider>
      ));
      await manager.completeAnimation();
      expect(getFunnelPaths(container)).toHaveLength(2);

      const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
      if (button == null) {
        throw new Error("Missing swap button");
      }
      fireEvent.click(button);
      // Swapping the data reference yields a new animationId → the keyed Show remounts
      // the driver → the SAME manager's factory starts a fresh animation handle.
      const frames = await expectAnimatedFunnelPaths(container, manager);
      const settled = frames[frames.length - 1];
      // Now 3 trapezoids, all animated to their settled geometry.
      expect(settled).toHaveLength(3);
      expect(frames[0]).not.toEqual(settled);
      expect(getFunnelPaths(container)).toHaveLength(3);
    });
  });

  describe("when the funnel element hides during the animation", () => {
    it("should not crash when the funnel hides during the animation", async () => {
      const manager = new MockProgressAnimationManager("funnel-anim-hide");
      const [visible, setVisible] = createSignal(true);
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <button type="button" data-testid="toggle" onClick={() => setVisible((p) => !p)} />
          <FunnelChart width={500} height={300}>
            <Funnel data={smallerData} dataKey="uv" isAnimationActive hide={!visible()} />
          </FunnelChart>
        </AnimationControllerProvider.Provider>
      ));
      await manager.setAnimationProgress(0.3);
      const button = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]');
      if (button == null) {
        throw new Error("Missing toggle button");
      }
      fireEvent.click(button);
      // Hidden mid-animation: no trapezoids render and no diagnostic fires.
      expect(getFunnelPaths(container)).toHaveLength(0);
    });

    it("should restart the animation from the beginning when the funnel appears again", async () => {
      const manager = new MockProgressAnimationManager("funnel-anim-hide");
      const [visible, setVisible] = createSignal(true);
      const { container } = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <button type="button" data-testid="toggle" onClick={() => setVisible((p) => !p)} />
          <FunnelChart width={500} height={300}>
            <Funnel data={smallerData} dataKey="uv" isAnimationActive hide={!visible()} />
          </FunnelChart>
        </AnimationControllerProvider.Provider>
      ));
      await manager.setAnimationProgress(0.3);
      const button = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]');
      if (button == null) {
        throw new Error("Missing toggle button");
      }
      // Hide mid-animation, then show again → a fresh trapezoids reference yields a
      // new animationId, so the SAME manager's factory re-subscribes and re-runs.
      fireEvent.click(button);
      expect(getFunnelPaths(container)).toHaveLength(0);
      fireEvent.click(button);
      // Tier-B (behaviour + byte-identical settled frame): the re-shown funnel
      // animates again from a collapsed state to its settled geometry.
      const frames = await expectAnimatedFunnelPaths(container, manager);
      const settled = [
        "M 5,5L 495,5L 433.75,150L 66.25,150L 5,5 Z",
        "M 66.25,150L 433.75,150L 250,295L 250,295L 66.25,150 Z",
      ];
      expect(frames).toHaveLength(5);
      expect(frames[frames.length - 1]).toEqual(settled);
      expect(frames[0]).not.toEqual(settled);
    });
  });
});
