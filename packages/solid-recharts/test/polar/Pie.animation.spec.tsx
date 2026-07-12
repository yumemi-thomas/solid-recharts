// Subset port of recharts 3.9.0 test/polar/Pie/Pie.animation.spec.tsx. Proves the
// wired Pie ENTER animation on the NEW v3.9 engine (AnimatedItems +
// AnimationController): sectors grow from a collapsed (zero-sweep) state at t=0 to
// their byte-identical final geometry at t=1, driven deterministically by the
// MockControllerAnimationManager (injected via AnimationControllerProvider). Pie's
// default isAnimationActive is "auto" (≈ active).
//
// v3.9 GOTCHA: the new JavascriptAnimation state machine calls onAnimationStart
// SYNCHRONOUSLY in its constructor (on first render), not lazily when the first
// frame ticks — so `onAnimationStart` is already called once right after render
// (matching recharts 3.9 Pie.animation.spec).
import { describe, expect, it, vi } from "vitest";
import { createSignal, flush, Show } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { PieChart, Pie } from "../../src";
import { expectPieSectors } from "../helper/expectPieSectors";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { expectAnimatedPieAngles } from "../helper/expectAnimatedPieAngles";
import { expectAnimatedPiePaths } from "../helper/expectAnimatedPiePaths";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 3);

const SECTOR_SELECTOR = ".recharts-pie-sector path.recharts-sector";

// Same golden as PieChart.spec (cx 255 = props 250 + margin-left 5).
const pageDataSectorPaths = [
  "M 455,255 A 200,200,0, 0,0, 267.6184,55.3985 L 255,255 Z",
  "M 267.6184,55.3985 A 200,200,0, 0,0, 79.7896,158.5566 L 255,255 Z",
  "M 79.7896,158.5566 A 200,200,0, 0,0, 93.1078,372.4347 L 255,255 Z",
  "M 93.1078,372.4347 A 200,200,0, 0,0, 217.3458,451.4234 L 255,255 Z",
  "M 217.3458,451.4234 A 200,200,0, 0,0, 406.3627,385.7261 L 255,255 Z",
  "M 406.3627,385.7261 A 200,200,0, 0,0, 455,255.0003 L 255,255 Z",
];

function trim(s: string | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

describe("Pie animation", () => {
  it("grows the sectors from collapsed (t=0) to the final geometry (t=1)", async () => {
    const manager = new MockProgressAnimationManager("pie-anim");
    const { container } = render(() => (
      <AnimationControllerProvider value={manager.factory}>
        <PieChart width={500} height={500}>
          <Pie cx={250} cy={250} innerRadius={0} outerRadius={200} data={PageData} dataKey="uv" />
        </PieChart>
      </AnimationControllerProvider>
    ));
    flush();

    // t=0: every sector has zero sweep (start === end) → no sector path renders.
    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);

    // Drive to completion → t=1 → full, byte-identical sectors.
    await manager.completeAnimation();
    flush();

    const sectors = container.querySelectorAll(SECTOR_SELECTOR);
    expect(sectors).toHaveLength(PageData.length);
    expect([...sectors].map((s) => trim(s.getAttribute("d")))).toEqual(pageDataSectorPaths);
  });

  it("renders the final frame immediately when isAnimationActive is false", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
        />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(PageData.length);
  });

  describe("with isAnimationActive=false", () => {
    it("should render sectors without animation and not call the animation callbacks", () => {
      const onAnimationStart = vi.fn();
      const onAnimationEnd = vi.fn();
      const { container } = render(() => (
        <PieChart width={100} height={100}>
          <Pie
            data={smallerData}
            dataKey="amt"
            isAnimationActive={false}
            onAnimationStart={onAnimationStart}
            onAnimationEnd={onAnimationEnd}
          />
        </PieChart>
      ));
      flush();

      expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(smallerData.length);
      expect(onAnimationStart).not.toHaveBeenCalled();
      expect(onAnimationEnd).not.toHaveBeenCalled();
    });
  });

  describe("initial animation callbacks", () => {
    it("should call onAnimationStart when the animation begins and onAnimationEnd when it ends", async () => {
      const onAnimationStart = vi.fn();
      const onAnimationEnd = vi.fn();
      const manager = new MockProgressAnimationManager("pie-cb");
      render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <PieChart width={100} height={100}>
            <Pie
              data={smallerData}
              dataKey="amt"
              isAnimationActive
              onAnimationStart={onAnimationStart}
              onAnimationEnd={onAnimationEnd}
            />
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();

      // v3.9 engine: JavascriptAnimation calls onAnimationStart synchronously in its
      // constructor (on render), so it has already fired once here.
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.setAnimationProgress(0.1);
      flush();
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      await manager.completeAnimation();
      flush();
      expect(onAnimationStart).toHaveBeenCalledTimes(1);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("initial animation with simple props", () => {
    function renderTestCase(): {
      container: Element;
      animationManager: MockProgressAnimationManager;
    } {
      const manager = new MockProgressAnimationManager("pie-angles");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <PieChart width={100} height={100}>
            <Pie data={smallerData} dataKey="amt" isAnimationActive />
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();
      return { container, animationManager: manager };
    }

    it("should render sectors with animation", async () => {
      const { container, animationManager } = renderTestCase();

      const pathDs = await expectAnimatedPiePaths(container, animationManager, 5);
      expect(pathDs).toEqual([
        [
          "M 86,50 A 36,36,0, 0,0, 69.7423,19.8961 L 50,50 Z",
          "M 69.7423,19.8961 A 36,36,0, 0,0, 35.6532,16.9823 L 50,50 Z",
          "M 35.6532,16.9823 A 36,36,0, 0,0, 14.5223,43.8902 L 50,50 Z",
        ],
        [
          "M 86,50 A 36,36,0, 0,0, 49.2784,14.0072 L 50,50 Z",
          "M 49.2784,14.0072 A 36,36,0, 0,0, 14.0289,51.443 L 50,50 Z",
          "M 14.0289,51.443 A 36,36,0, 0,0, 52.1638,85.9349 L 50,50 Z",
        ],
        [
          "M 86,50 A 36,36,0, 0,0, 38.1402,16.0096 L 50,50 Z",
          "M 38.1402,16.0096 A 36,36,0, 0,0, 21.8141,72.3955 L 50,50 Z",
          "M 21.8141,72.3955 A 36,36,0, 0,0, 80.4308,69.2345 L 50,50 Z",
        ],
        [
          "M 86,50 A 36,36,0, 0,0, 33.2853,18.1156 L 50,50 Z",
          "M 33.2853,18.1156 A 36,36,0, 0,0, 29.5212,79.6078 L 50,50 Z",
          "M 29.5212,79.6078 A 36,36,0, 0,0, 85.7312,54.3908 L 50,50 Z",
        ],
        [
          "M 86,50 A 36,36,0, 0,0, 32,18.8231 L 50,50 Z",
          "M 32,18.8231 A 36,36,0, 0,0, 32,81.1769 L 50,50 Z",
          "M 32,81.1769 A 36,36,0, 0,0, 86,50 L 50,50 Z",
        ],
      ]);
    });

    it("should render sectors with animated angles", async () => {
      const { container, animationManager } = renderTestCase();

      const angles = await expectAnimatedPieAngles(container, animationManager, 4);
      expect(angles).toEqual([
        [
          { endAngle: 67.2973, startAngle: 0 },
          { endAngle: 134.5946, startAngle: 67.2973 },
          { endAngle: 201.8918, startAngle: 134.5946 },
        ],
        [
          { endAngle: 101.7302, startAngle: 0 },
          { endAngle: 203.4603, startAngle: 101.7302 },
          { endAngle: 305.1906, startAngle: 203.4603 },
        ],
        [
          { endAngle: 116.2289, startAngle: 0 },
          { endAngle: 232.4579, startAngle: 116.2289 },
          { endAngle: 348.6866, startAngle: 232.4579 },
        ],
        [
          { endAngle: 120, startAngle: 0 },
          { endAngle: 240, startAngle: 120 },
          { endAngle: 0, startAngle: 240 },
        ],
      ]);
    });
  });

  describe("when changing dataKey prop", () => {
    function renderTestCase(): {
      container: Element;
      animationManager: MockProgressAnimationManager;
      changeDataKey: () => void;
    } {
      const manager = new MockProgressAnimationManager("pie-datakey");
      const [dataKey, setDataKey] = createSignal("amt");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <PieChart width={100} height={100}>
            <Pie data={smallerData} dataKey={dataKey()} isAnimationActive />
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();
      const changeDataKey = (): void => {
        setDataKey((prev) => (prev === "amt" ? "pv" : "amt"));
        flush();
      };
      return { container, animationManager: manager, changeDataKey };
    }

    describe("interaction after initial animation completes", () => {
      it("should animate the pie sector angles", async () => {
        const { container, animationManager, changeDataKey } = renderTestCase();
        // Run the initial ('amt') animation to completion, then switch dataKey.
        await animationManager.completeAnimation();
        flush();
        changeDataKey();

        const angles = await expectAnimatedPieAngles(container, animationManager, 3);
        expect(angles).toEqual([
          [
            { endAngle: 108.593, startAngle: 0 },
            { endAngle: 280.8398, startAngle: 108.593 },
            { endAngle: 0, startAngle: 280.8398 },
          ],
          [
            { endAngle: 104.2775, startAngle: 0 },
            { endAngle: 296.2907, startAngle: 104.2775 },
            { endAngle: 0, startAngle: 296.2907 },
          ],
          [
            { endAngle: 103.2874, startAngle: 0 },
            { endAngle: 299.835, startAngle: 103.2874 },
            { endAngle: 0, startAngle: 299.835 },
          ],
        ]);
      });
    });

    describe("interaction in the middle of the initial animation", () => {
      it("should animate the pie sector angles from the intermediate state", async () => {
        const { container, animationManager, changeDataKey } = renderTestCase();
        // Let the initial animation run half way, then switch dataKey.
        await animationManager.setAnimationProgress(0.5);
        flush();
        changeDataKey();

        const angles = await expectAnimatedPieAngles(container, animationManager, 3);
        expect(angles).toEqual([
          // The Pie is 337/360 rendered when the dataKey changes, and it continues from there
          [
            { endAngle: 101.0656, startAngle: 0 },
            { endAngle: 265.785, startAngle: 101.0656 },
            { endAngle: 337.4176, startAngle: 265.785 },
          ],
          [
            { endAngle: 102.8729, startAngle: 0 },
            { endAngle: 293.4815, startAngle: 102.8729 },
            { endAngle: 355.7862, startAngle: 293.4815 },
          ],
          [
            { endAngle: 103.2874, startAngle: 0 },
            { endAngle: 299.835, startAngle: 103.2874 },
            { endAngle: 0, startAngle: 299.835 },
          ],
        ]);
      });
    });
  });

  describe("when the Pie has a key prop to force re-animation", () => {
    // Solid has no `key` prop; a keyed <Show> remounts the <Pie> when the dataKey
    // changes, the port equivalent of upstream's `key={dataKey}` remount.
    function renderTestCase(): {
      container: Element;
      animationManager: MockProgressAnimationManager;
      changeDataKey: () => void;
    } {
      const manager = new MockProgressAnimationManager("pie-key");
      const [dataKey, setDataKey] = createSignal("amt");
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <PieChart width={100} height={100}>
            <Show when={dataKey()} keyed>
              {(key) => <Pie data={smallerData} dataKey={key} isAnimationActive />}
            </Show>
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();
      const changeDataKey = (): void => {
        setDataKey((prev) => (prev === "amt" ? "pv" : "amt"));
        flush();
      };
      return { container, animationManager: manager, changeDataKey };
    }

    it("should re-run the initial animation from the beginning", async () => {
      const { container, animationManager, changeDataKey } = renderTestCase();
      await animationManager.completeAnimation();
      flush();
      changeDataKey();

      // A remount re-runs the ENTER animation, so it starts collapsed (no sectors).
      expectPieSectors(container, []);

      const angles = await expectAnimatedPieAngles(container, animationManager, 3);
      expect(angles).toEqual([
        [
          { endAngle: 70.4979, startAngle: 0 },
          { endAngle: 204.6496, startAngle: 70.4979 },
          { endAngle: 245.7145, startAngle: 204.6496 },
        ],
        [
          { endAngle: 97.1692, startAngle: 0 },
          { endAngle: 282.0742, startAngle: 97.1692 },
          { endAngle: 338.6753, startAngle: 282.0742 },
        ],
        [
          { endAngle: 103.2874, startAngle: 0 },
          { endAngle: 299.835, startAngle: 103.2874 },
          { endAngle: 0, startAngle: 299.835 },
        ],
      ]);
    });
  });

  describe("tests that change data array", () => {
    const data1 = smallerData.slice(0, 2);
    const data2 = smallerData;

    function renderTestCase(): {
      container: Element;
      animationManager: MockProgressAnimationManager;
      changeData: () => void;
    } {
      const manager = new MockProgressAnimationManager("pie-data");
      const [data, setData] = createSignal(data1);
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <PieChart width={100} height={100}>
            <Pie data={data()} dataKey="amt" isAnimationActive />
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();
      const changeData = (): void => {
        setData((prev) => (prev === data1 ? data2 : data1));
        flush();
      };
      return { container, animationManager: manager, changeData };
    }

    describe("interaction after initial animation completes", () => {
      it("should animate from 2 to 3 sectors", async () => {
        const { container, animationManager, changeData } = renderTestCase();
        await animationManager.completeAnimation();
        flush();
        changeData();

        const angles = await expectAnimatedPieAngles(container, animationManager, 3);
        expect(angles).toEqual([
          [
            { endAngle: 139.0477, startAngle: 0 },
            { endAngle: 278.0953, startAngle: 139.0477 },
            { endAngle: 0.0002, startAngle: 278.0953 },
          ],
          [
            { endAngle: 123.5542, startAngle: 0 },
            { endAngle: 247.1082, startAngle: 123.5542 },
            { endAngle: 0, startAngle: 247.1082 },
          ],
          [
            { endAngle: 120, startAngle: 0 },
            { endAngle: 240, startAngle: 120 },
            { endAngle: 0, startAngle: 240 },
          ],
        ]);
      });
    });

    describe("interaction in the middle of the initial animation", () => {
      it("should animate from 2 to 3 sectors from the intermediate state", async () => {
        const { container, animationManager, changeData } = renderTestCase();
        await animationManager.setAnimationProgress(0.5);
        flush();
        changeData();

        const angles = await expectAnimatedPieAngles(container, animationManager, 3);
        expect(angles).toEqual([
          [
            { endAngle: 127.7564, startAngle: 0 },
            { endAngle: 255.5128, startAngle: 127.7564 },
            { endAngle: 337.4176, startAngle: 255.5128 },
          ],
          [
            { endAngle: 121.4473, startAngle: 0 },
            { endAngle: 242.8946, startAngle: 121.4473 },
            { endAngle: 355.7864, startAngle: 242.8946 },
          ],
          [
            { endAngle: 120, startAngle: 0 },
            { endAngle: 240, startAngle: 120 },
            { endAngle: 0, startAngle: 240 },
          ],
        ]);
      });
    });
  });

  describe("when the pie element hides during the animation", () => {
    // Upstream drives visibility through an in-tree <button> (createSelectorTestCase +
    // button.click). We mirror that exactly: the toggle MUST come from a click inside
    // the render root's reactive owner, not a bare setSignal from test scope — the
    // re-appearing Pie REMOUNTS <AnimatedItems>, which creates fresh effects, and those
    // would be ownerless (NO_OWNER_EFFECT) if the write came from the test body.
    function renderTestCase(): {
      container: Element;
      animationManager: MockProgressAnimationManager;
      toggleVisibility: () => void;
    } {
      const manager = new MockProgressAnimationManager("pie-hide");
      const [isVisible, setIsVisible] = createSignal(true);
      const { container } = render(() => (
        <AnimationControllerProvider value={manager.factory}>
          <button
            type="button"
            data-testid="toggle"
            onClick={() => setIsVisible((prev) => !prev)}
          />
          <PieChart width={100} height={100}>
            <Pie data={smallerData} dataKey="amt" isAnimationActive hide={!isVisible()} />
          </PieChart>
        </AnimationControllerProvider>
      ));
      flush();
      const button = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]');
      if (button == null) {
        throw new Error("Missing toggle button");
      }
      const toggleVisibility = (): void => {
        fireEvent.click(button);
        flush();
      };
      return { container, animationManager: manager, toggleVisibility };
    }

    it("should not crash when the pie hides during the animation", async () => {
      const { container, animationManager, toggleVisibility } = renderTestCase();

      await animationManager.setAnimationProgress(0.3);
      flush();
      toggleVisibility();

      expectPieSectors(container, []);
    });

    it("should restart the animation from the beginning when the pie appears again", async () => {
      const { container, animationManager, toggleVisibility } = renderTestCase();

      await animationManager.setAnimationProgress(0.3);
      flush();
      toggleVisibility();

      expectPieSectors(container, []);

      toggleVisibility();

      // On re-appear the ENTER animation restarts from a collapsed state (empty
      // sectors at t=0), NOT resuming the mid-progress frame it was at when hidden.
      // recharts parity: PieImpl drops previousSectorsRef.current while hidden.
      expectPieSectors(container, []);

      const angles = await expectAnimatedPieAngles(container, animationManager, 3);
      expect(angles).toEqual([
        [
          { endAngle: 81.9049, startAngle: 0 },
          { endAngle: 163.8098, startAngle: 81.9049 },
          { endAngle: 245.7147, startAngle: 163.8098 },
        ],
        [
          { endAngle: 112.8918, startAngle: 0 },
          { endAngle: 225.7836, startAngle: 112.8918 },
          { endAngle: 338.6755, startAngle: 225.7836 },
        ],
        [
          { endAngle: 120, startAngle: 0 },
          { endAngle: 240, startAngle: 120 },
          { endAngle: 0, startAngle: 240 },
        ],
      ]);
    });
  });
});
