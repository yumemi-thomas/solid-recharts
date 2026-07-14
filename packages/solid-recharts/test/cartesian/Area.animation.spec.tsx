// Port of recharts 3.9.0 test/cartesian/Area.animation.spec.tsx.
// Proves the wired Area animation on the NEW v3.9 engine (AnimatedItems +
// AnimationController):
//   - ENTRANCE: a clip-rect (from AreaRevealShape) grows to reveal the area; the
//     path `d` is unchanged during the reveal (regression-safe).
//   - DATA-CHANGE morph: the top-line curve and dots interpolate from the previous
//     frame's geometry toward the new target, with NO entrance reveal clip.
//
// Migrated from the old-engine spec (mechanical, mirroring Bar.animation.spec):
//   - AnimationManagerContext (legacy) → AnimationControllerProvider (v3.9).
//   - MockProgressAnimationManager (legacy) → MockControllerAnimationManager.
//   - <AnimationManagerContext.Provider value={() => manager}> → <AnimationControllerProvider.Provider
//     value={manager.factory}>.
//   - GOTCHA: the v3.9 JavascriptAnimation state machine calls onAnimationStart
//     SYNCHRONOUSLY in its constructor (on render), so `not.toHaveBeenCalled()`
//     right after render becomes `toHaveBeenCalledTimes(1)` — matching upstream.
//
// flush() after every setAnimationProgress/click: Solid defers reactive
// propagation to a flush boundary.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { AreaChart, Area } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { PageData } from "../_data";

describe("Area animation", () => {
  const onAnimationStart = vi.fn();
  const onAnimationEnd = vi.fn();

  beforeEach(() => {
    onAnimationStart.mockClear();
    onAnimationEnd.mockClear();
  });

  describe("with isAnimationActive={false}", () => {
    it("should render the area without animation", () => {
      const { container } = render(() => (
        <AreaChart data={PageData} width={100} height={100}>
          <Area dataKey="uv" isAnimationActive={false} />
        </AreaChart>
      ));
      const curve = container.querySelector(".recharts-area-curve");
      expect(curve?.getAttribute("d")).toBe("M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475");
    });
  });

  describe("initial animation with simple props", () => {
    function renderTestCase(manager: MockProgressAnimationManager) {
      return render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <AreaChart data={PageData} width={100} height={100}>
            <Area
              dataKey="uv"
              animationEasing="linear"
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          </AreaChart>
        </AnimationControllerProvider.Provider>
      ));
    }

    it("should call onAnimationStart synchronously on render (v3.9 engine)", async () => {
      const manager = new MockProgressAnimationManager("area-anim");
      renderTestCase(manager);
      // v3.9 engine: the JavascriptAnimation state machine calls onAnimationStart
      // in its constructor (on first render), not lazily — matching recharts 3.9.
      expect(onAnimationStart).toHaveBeenCalledTimes(1);

      await manager.setAnimationProgress(0.5);
      expect(onAnimationStart).toHaveBeenCalledTimes(1);

      await manager.completeAnimation();
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
    });

    it("should call onAnimationEnd when the animation ends", async () => {
      const manager = new MockProgressAnimationManager("area-anim");
      renderTestCase(manager);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.setAnimationProgress(0.9);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.completeAnimation();
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    it("should start the area with a fully generated path and not change it during the reveal", async () => {
      const manager = new MockProgressAnimationManager("area-anim");
      const { container } = renderTestCase(manager);
      const areaPath = container.querySelector(".recharts-area-area");
      expect(areaPath).not.toBeNull();
      const dInitial = areaPath?.getAttribute("d");
      expect(dInitial).toBeTruthy();

      await manager.setAnimationProgress(0.5);
      expect(container.querySelector(".recharts-area-area")?.getAttribute("d")).toBe(dInitial);

      await manager.completeAnimation();
      expect(container.querySelector(".recharts-area-area")?.getAttribute("d")).toBe(dInitial);
    });

    it("should reveal the area via a growing clip-path rect", async () => {
      const manager = new MockProgressAnimationManager("area-anim");
      const { container } = renderTestCase(manager);
      // t=0: the clip-rect has zero width (area fully hidden).
      const clipRect = container.querySelector(".recharts-area clipPath rect");
      expect(clipRect).not.toBeNull();
      expect(Number(clipRect?.getAttribute("width"))).toBe(0);

      // Mid-animation: the clip-rect has grown but x / y / height stay fixed.
      const x = clipRect?.getAttribute("x");
      const y = clipRect?.getAttribute("y");
      const height = clipRect?.getAttribute("height");

      await manager.setAnimationProgress(0.5);
      const midRect = container.querySelector(".recharts-area clipPath rect");
      expect(midRect?.getAttribute("x")).toBe(x);
      expect(midRect?.getAttribute("y")).toBe(y);
      expect(midRect?.getAttribute("height")).toBe(height);
      const midWidth = Number(midRect?.getAttribute("width"));
      expect(midWidth).toBeGreaterThan(0);

      // t=1: the reveal clip is REMOVED (recharts' settled DOM has no reveal clip).
      await manager.completeAnimation();
      expect(container.querySelector(".recharts-area clipPath rect")).toBeNull();
    });
  });

  // Data-change tween: on a new dataKey the top-line curve and the dots MORPH from
  // the previous frame's geometry to the new one, with NO entrance reveal clip.
  // Byte-identical to the recharts reference ("when changing dataKey prop").
  describe("when changing dataKey after the initial animation completed", () => {
    const renderDataKeySwitch = () => {
      const manager = new MockProgressAnimationManager("area-datakey-change");
      const [dataKey, setDataKey] = createSignal("uv");
      const result = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <AreaChart data={PageData} width={100} height={100}>
            <Area dataKey={dataKey()} animationEasing="linear" dot label />
          </AreaChart>
        </AnimationControllerProvider.Provider>
      ));
      const changeDataKey = (): void => {
        setDataKey((prev) => (prev === "uv" ? "pv" : "uv"));
      };
      return { ...result, animationManager: manager, changeDataKey };
    };

    const prime = async (
      animationManager: MockProgressAnimationManager,
      changeDataKey: () => void,
    ): Promise<void> => {
      await animationManager.completeAnimation();
      changeDataKey();
    };

    const getAreaCurveD = (container: Element): string | null =>
      container.querySelector(".recharts-area-curve")?.getAttribute("d") ?? null;

    const expectDots = (
      container: Element,
      expected: ReadonlyArray<{ cx: string | null; cy: string | null }>,
    ): void => {
      const dots = Array.from(container.querySelectorAll(".recharts-area-dot")).map((d) => ({
        cx: d.getAttribute("cx"),
        cy: d.getAttribute("cy"),
      }));
      expect(dots).toEqual(expected);
    };

    it("should not render the entrance reveal clip during the data-change morph", async () => {
      const { container, animationManager, changeDataKey } = renderDataKeySwitch();
      await prime(animationManager, changeDataKey);

      expect(container.querySelector(".recharts-area clipPath")).toBeNull();

      await animationManager.setAnimationProgress(0.5);
      expect(container.querySelector(".recharts-area clipPath")).toBeNull();

      await animationManager.completeAnimation();
      expect(container.querySelector(".recharts-area clipPath")).toBeNull();
    });

    it("should animate the area path", async () => {
      const { container, animationManager, changeDataKey } = renderDataKeySwitch();
      await prime(animationManager, changeDataKey);

      // Right after the swap the path still shows the OLD (uv) geometry.
      expect(getAreaCurveD(container)).toBe("M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475");

      await animationManager.setAnimationProgress(0.1);
      expect(getAreaCurveD(container)).toBe(
        "M5,11.84L23,30.14L41,32.992L59,45.68L77,35.188L95,52.408",
      );

      await animationManager.setAnimationProgress(0.9);
      expect(getAreaCurveD(container)).toBe(
        "M5,66.56L23,51.257L41,76.926L59,11.12L77,57.09L95,51.868",
      );

      await animationManager.setAnimationProgress(1);
      expect(getAreaCurveD(container)).toBe("M5,73.4L23,53.897L41,82.418L59,6.8L77,59.828L95,51.8");

      await animationManager.completeAnimation();
      expect(getAreaCurveD(container)).toBe("M5,73.4L23,53.897L41,82.418L59,6.8L77,59.828L95,51.8");
    });

    it("should animate the dots", async () => {
      const { container, animationManager, changeDataKey } = renderDataKeySwitch();
      await prime(animationManager, changeDataKey);

      expectDots(container, [
        { cx: "5", cy: "5" },
        { cx: "23", cy: "27.5" },
        { cx: "41", cy: "27.5" },
        { cx: "59", cy: "50" },
        { cx: "77", cy: "32.45" },
        { cx: "95", cy: "52.475" },
      ]);

      await animationManager.setAnimationProgress(0.1);
      expectDots(container, [
        { cx: "5", cy: "11.84" },
        { cx: "23", cy: "30.1397" },
        { cx: "41", cy: "32.9918" },
        { cx: "59", cy: "45.68" },
        { cx: "77", cy: "35.1878" },
        { cx: "95", cy: "52.4075" },
      ]);

      await animationManager.setAnimationProgress(0.9);
      expectDots(container, [
        { cx: "5", cy: "66.56" },
        { cx: "23", cy: "51.2573" },
        { cx: "41", cy: "76.9262" },
        { cx: "59", cy: "11.12" },
        { cx: "77", cy: "57.0902" },
        { cx: "95", cy: "51.8675" },
      ]);

      await animationManager.setAnimationProgress(1);
      const finalDotPositions = [
        { cx: "5", cy: "73.4" },
        { cx: "23", cy: "53.897000000000006" },
        { cx: "41", cy: "82.41799999999999" },
        { cx: "59", cy: "6.8000000000000025" },
        { cx: "77", cy: "59.827999999999996" },
        { cx: "95", cy: "51.8" },
      ];
      expectDots(container, finalDotPositions);

      await animationManager.completeAnimation();
      expectDots(container, finalDotPositions);
    });
  });

  describe("custom shape prop", () => {
    function CustomShape(props: {
      animationElapsedTime?: number;
      isAnimating?: boolean;
      isEntrance?: boolean;
    }) {
      return (
        <path
          class="custom-area-shape"
          data-t={props.animationElapsedTime}
          data-is-animating={String(props.isAnimating)}
          data-is-entrance={String(props.isEntrance)}
        />
      );
    }

    function renderShapeTestCase(manager: MockProgressAnimationManager) {
      return render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <AreaChart width={100} height={100} data={PageData}>
            <Area dataKey="uv" animationEasing="linear" shape={CustomShape} />
          </AreaChart>
        </AnimationControllerProvider.Provider>
      ));
    }

    it("should render the custom shape instead of the default Curve", async () => {
      const manager = new MockProgressAnimationManager("area-shape");
      const { container } = renderShapeTestCase(manager);
      await manager.completeAnimation();
      const customShapes = container.querySelectorAll(".custom-area-shape");
      expect(customShapes.length).toBeGreaterThan(0);
    });

    it("should skip the clipPath entrance animation when a custom shape is provided", async () => {
      const manager = new MockProgressAnimationManager("area-shape");
      const { container } = renderShapeTestCase(manager);
      await manager.setAnimationProgress(0.5);
      expect(container.querySelector(".recharts-area clipPath")).toBeNull();

      await manager.completeAnimation();
      expect(container.querySelector(".recharts-area clipPath")).toBeNull();
    });

    it("should pass animationElapsedTime / isAnimating / isEntrance to the custom shape", async () => {
      const manager = new MockProgressAnimationManager("area-shape");
      const { container } = renderShapeTestCase(manager);
      await manager.setAnimationProgress(0.5);
      const during = container.querySelector(".custom-area-shape");
      expect(during).not.toBeNull();
      expect(during?.getAttribute("data-t")).toBe("0.5");
      expect(during?.getAttribute("data-is-animating")).toBe("true");
      expect(during?.getAttribute("data-is-entrance")).toBe("true");

      // After the animation completes: isEntrance becomes false (previous items stored).
      await manager.completeAnimation();
      const after = container.querySelector(".custom-area-shape");
      expect(after).not.toBeNull();
      expect(after?.getAttribute("data-t")).toBe("1");
      expect(after?.getAttribute("data-is-animating")).toBe("false");
      expect(after?.getAttribute("data-is-entrance")).toBe("false");
    });
  });
});
