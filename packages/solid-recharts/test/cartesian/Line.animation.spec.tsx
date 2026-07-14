// Port of recharts 3.8.1 test/cartesian/Line.animation.spec.tsx (commit 7a23854).
//
// Recoverable subset: the static (isAnimationActive={false}) facts and the simple
// "draw" animation (stroke-dasharray reveal with the path geometry unchanged), driven
// by the ported MockProgressAnimationManager via AnimationManagerContext.
// getTotalLength is mocked on SVGElement.prototype (jsdom lacks it) to 100.
//
// Solid deviations: `render(() => …)` + `flush()` (store writes are microtask-batched);
// the per-render `animationManager` is supplied through AnimationManagerContext rather
// than returned by the test-case helper (recharts wires it into its provider).
//
// PERMANENT-N/A (NOT ported, one-line reason each):
//   - "in ComposedChart with sparse best-fit line data" (×2): covered by the dedicated
//     Line.sparseAnimationPath.spec.tsx port.
//   - "with <Legend /> sibling" / "responsive charts" / "layout changes" / "YAxis
//     width=auto" path-not-move (×~6): late-resize + Legend-height re-layout coupling —
//     mockSequenceOfGetBoundingClientRect resize choreography, deferred as layout infra.
//   - "when changing dataKey prop" (×~8): same tween mechanics as the now-PORTED
//     "tests that change data array" / "add more elements" blocks below (data-change
//     morph via prevPoints + dash continuation); the dataKey variant only differs in
//     which prop swaps, so it is covered by those ports. Remaining unported bits of
//     those blocks are render-count assertions coupled to React's re-render scheduling.
//   - "key prop to force re-animation", "line hides during animation", "strokeWidth
//     changes during animation" (×~5): React key remount / mid-animation prop-change
//     scheduling — render-count coupled.
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { LineChart, Line } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager as MockProgressAnimationManager } from "../animation/mockControllerAnimationManager";
import { PageData } from "../_data";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectLabels, type ExpectedLabel } from "../helper/expectLabel";
import { assertNotNull } from "../helper/assertNotNull";

type WithTotalLength = { getTotalLength?: () => number };

function getLine(container: Element): SVGPathElement {
  const line = container.querySelector(".recharts-line-curve");
  assertNotNull(line);
  return line as SVGPathElement;
}

function expectDots(container: Element, expected: ReadonlyArray<{ cx: string; cy: string }>): void {
  const dots = Array.from(container.querySelectorAll(".recharts-line-dot")).map((d) => ({
    cx: d.getAttribute("cx"),
    cy: d.getAttribute("cy"),
  }));
  expect(dots).toEqual(expected);
}

const expectedUvLabels: ReadonlyArray<ExpectedLabel> = [
  { height: "0", offset: "5", textContent: "400", width: "0", x: "5", y: "5" },
  { height: "0", offset: "5", textContent: "300", width: "0", x: "23", y: "27.5" },
  { height: "0", offset: "5", textContent: "300", width: "0", x: "41", y: "27.5" },
  { height: "0", offset: "5", textContent: "200", width: "0", x: "59", y: "50" },
  { height: "0", offset: "5", textContent: "278", width: "0", x: "77", y: "32.45" },
  { height: "0", offset: "5", textContent: "189", width: "0", x: "95", y: "52.475" },
];

const expectedDots = [
  { cx: "5", cy: "5" },
  { cx: "23", cy: "27.5" },
  { cx: "41", cy: "27.5" },
  { cx: "59", cy: "50" },
  { cx: "77", cy: "32.45" },
  { cx: "95", cy: "52.475" },
];

describe("Line animation", () => {
  let original: (() => number) | undefined;
  beforeAll(() => {
    const proto = SVGElement.prototype as WithTotalLength;
    original = proto.getTotalLength;
    proto.getTotalLength = (): number => 100;
  });
  afterAll(() => {
    (SVGElement.prototype as WithTotalLength).getTotalLength = original;
  });
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  it("draws the curve via stroke-dasharray (d unchanged) to fully revealed at t=1", async () => {
    const manager = new MockProgressAnimationManager("line-anim");
    const { container } = render(() => (
      <AnimationControllerProvider.Provider value={manager.factory}>
        <LineChart width={400} height={400} data={PageData}>
          <Line dataKey="uv" />
        </LineChart>
      </AnimationControllerProvider.Provider>
    ));
    const curve = container.querySelector(".recharts-line-curve");
    expect(curve).not.toBeNull();
    const dInitial = curve?.getAttribute("d");
    expect(dInitial).toBeTruthy();
    expect(curve?.getAttribute("stroke-dasharray") ?? "").toMatch(/^0px/);

    await manager.completeAnimation();
    // v3.9: a fully-revealed line removes its entrance stroke-dasharray entirely.
    expect(
      container.querySelector(".recharts-line-curve")?.getAttribute("stroke-dasharray"),
    ).toBeNull();
    expect(container.querySelector(".recharts-line-curve")?.getAttribute("d")).toBe(dInitial);
  });

  describe("with isAnimationActive={false}", () => {
    const renderStatic = () =>
      render(() => (
        <LineChart data={PageData} width={100} height={100}>
          <Line dataKey="uv" isAnimationActive={false} label />
        </LineChart>
      ));

    it("should render the line without stroke-dasharray", () => {
      const { container } = renderStatic();
      const line = getLine(container);
      expect(line).toBeInTheDocument();
      expect(line).toHaveAttribute("d", "M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475");
      expect(line).not.toHaveAttribute("stroke-dasharray");
    });

    it("should render all the dots without animation", () => {
      const { container } = renderStatic();
      expectDots(container, expectedDots);
    });

    it("should render all labels without animation", () => {
      const { container } = renderStatic();
      expectLabels(container, expectedUvLabels);
    });
  });

  describe("with simple props", () => {
    const renderAnimated = () => {
      const manager = new MockProgressAnimationManager("line-simple");
      const result = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <LineChart data={PageData} width={100} height={100}>
            <Line dataKey="uv" animationEasing="linear" label />
          </LineChart>
        </AnimationControllerProvider.Provider>
      ));
      return { ...result, animationManager: manager };
    };

    it("should start the line with fully generated path and a 0-length visible dash", () => {
      const { container } = renderAnimated();
      const line = getLine(container);
      expect(line).toBeInTheDocument();
      expect(line).toHaveAttribute("d", "M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475");
      // recharts asserts "0px 0px" here, but only because its initial render has not
      // yet measured the path (totalLength=0). Solid's pathRef measures eagerly during
      // the flush, so the gap is the real totalLength (100). The visible length is 0
      // either way — the line is invisible at t=0, which is the property under test.
      expect(line.getAttribute("stroke-dasharray")).toMatch(/^0px /);
    });

    it("should animate line left-to-right by continually extending the stroke-dasharray", async () => {
      const { container, animationManager } = renderAnimated();
      await animationManager.setAnimationProgress(0.1);
      expect(getLine(container)).toHaveAttribute("stroke-dasharray", "10px 100px");

      await animationManager.setAnimationProgress(0.2);
      expect(getLine(container)).toHaveAttribute("stroke-dasharray", "20px 100px");

      // v3.9: once the line is fully revealed, useAnimatedLineLength returns null
      // and LineDrawShape removes the entrance stroke-dasharray (nothing to mask).
      await animationManager.setAnimationProgress(1);
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

      await animationManager.completeAnimation();
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");
    });

    it("should remove the stroke-dasharray when the animation is completed", async () => {
      const { container, animationManager } = renderAnimated();
      await animationManager.setAnimationProgress(1);
      // v3.9: fully-revealed line carries no entrance stroke-dasharray.
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");
    });

    it("should render all the dots without animation", () => {
      const { container } = renderAnimated();
      expectDots(container, expectedDots);
    });

    it("should hide all labels until the animation is completed", async () => {
      const { container, animationManager } = renderAnimated();
      // v3.9: onAnimationStart fires synchronously when the animation is created, so
      // labels are hidden from the very first render (matches recharts 3.9).
      expectLabels(container, []);

      await animationManager.setAnimationProgress(0.1);
      expectLabels(container, []);

      await animationManager.setAnimationProgress(0.9);
      expectLabels(container, []);

      await animationManager.completeAnimation();
      expectLabels(container, expectedUvLabels);
    });

    it("should not move the path itself during the animation", async () => {
      const { container, animationManager } = renderAnimated();
      const line = getLine(container);
      const initialPath = line.getAttribute("d");
      expect(initialPath).toBe("M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475");

      await animationManager.setAnimationProgress(0.1);
      expect(getLine(container).getAttribute("d")).toBe(initialPath);

      await animationManager.setAnimationProgress(0.9);
      expect(getLine(container).getAttribute("d")).toBe(initialPath);

      await animationManager.completeAnimation();
      expect(getLine(container).getAttribute("d")).toBe(initialPath);
    });
  });

  // Data-change tween (recharts CurveWithAnimation prevPoints branch): on a new
  // data array the path MORPHS from the previous frame's geometry to the new one
  // and the dasharray continues from the furthest length already drawn. All
  // expected values are byte-identical to the recharts reference.
  describe("tests that change data array", () => {
    type DataType = Array<{ name: string; val: number }>;
    const uvData: DataType = PageData.map((d) => ({ name: d.name, val: d.uv }));
    const pvData: DataType = PageData.map((d) => ({ name: d.name, val: d.pv }));

    const expectedPvLabels: ReadonlyArray<ExpectedLabel> = [
      { height: "0", offset: "5", textContent: "2400", width: "0", x: "5", y: "73.4" },
      {
        height: "0",
        offset: "5",
        textContent: "4567",
        width: "0",
        x: "23",
        y: "53.897000000000006",
      },
      {
        height: "0",
        offset: "5",
        textContent: "1398",
        width: "0",
        x: "41",
        y: "82.41799999999999",
      },
      {
        height: "0",
        offset: "5",
        textContent: "9800",
        width: "0",
        x: "59",
        y: "6.8000000000000025",
      },
      {
        height: "0",
        offset: "5",
        textContent: "3908",
        width: "0",
        x: "77",
        y: "59.827999999999996",
      },
      { height: "0", offset: "5", textContent: "4800", width: "0", x: "95", y: "51.8" },
    ];

    const renderDataSwitch = () => {
      const manager = new MockProgressAnimationManager("line-data-change");
      const [data, setData] = createSignal<DataType>(uvData);
      const result = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <LineChart data={data()} width={100} height={100}>
            <Line dataKey="val" animationEasing="linear" label />
          </LineChart>
        </AnimationControllerProvider.Provider>
      ));
      // The reference's button click: swap uv <-> pv data, then flush the
      // deferred propagation so the keyed remount starts the new animation.
      const changeData = (): void => {
        setData((prev) => (prev === uvData ? pvData : uvData));
      };
      return { ...result, animationManager: manager, changeData };
    };

    describe("interrupting the initial animation", () => {
      it("should continue growing the line where it left off", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await animationManager.setAnimationProgress(0.3);
        expect(getLine(container)).toHaveAttribute("stroke-dasharray", "30px 100px");

        changeData();
        // The new animation has not ticked yet: the dash stays at the furthest
        // length already drawn (startingPoint = longestAnimatedLength = 30).
        expect(getLine(container)).toHaveAttribute("stroke-dasharray", "30px 100px");

        await animationManager.setAnimationProgress(0.1);
        expect(getLine(container)).toHaveAttribute("stroke-dasharray", "40px 100px");

        await animationManager.setAnimationProgress(0.2);
        expect(getLine(container)).toHaveAttribute("stroke-dasharray", "50px 100px");

        await animationManager.setAnimationProgress(0.3);
        expect(getLine(container)).toHaveAttribute("stroke-dasharray", "60px 100px");

        // Because the animation had a head start, it arrives at full length
        // quicker than the initial animation would. v3.9: once fully revealed the
        // entrance stroke-dasharray is removed entirely.
        await animationManager.setAnimationProgress(0.7);
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

        await animationManager.completeAnimation();
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");
      });

      it("should hide labels during the animation", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await animationManager.setAnimationProgress(0.3);
        changeData();

        // v3.9: the swap immediately starts the new animation (sync onAnimationStart),
        // so labels are hidden right away (no brief reappearance).
        expectLabels(container, []);

        await animationManager.setAnimationProgress(0.2);
        expectLabels(container, []);

        await animationManager.setAnimationProgress(0.5);
        expectLabels(container, []);

        await animationManager.completeAnimation();
        expectLabels(container, expectedPvLabels);
      });
    });

    describe("interaction after initial animation completes", () => {
      const prime = async (
        container: Element,
        animationManager: MockProgressAnimationManager,
        changeData: () => void,
      ): Promise<void> => {
        await animationManager.completeAnimation();
        changeData();
      };

      it("should keep the whole line visible during the animation", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await prime(container, animationManager, changeData);

        // v3.9: the entrance reached full visibility on the first animation, so
        // useAnimatedLineLength returns null forever after. The data-change animation
        // works by morphing the path (not the dash), and the line carries NO entrance
        // stroke-dasharray throughout — i.e. it stays fully visible.
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

        await animationManager.setAnimationProgress(0.1);
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

        await animationManager.setAnimationProgress(0.5);
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

        await animationManager.completeAnimation();
        expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");
      });

      it("should hide labels during the animation", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await prime(container, animationManager, changeData);

        // Right after the data swap the new animation has already started (sync
        // onAnimationStart) so labels are hidden immediately (v3.9).
        expectLabels(container, []);

        await animationManager.setAnimationProgress(0.2);
        expectLabels(container, []);

        await animationManager.setAnimationProgress(0.5);
        expectLabels(container, []);

        await animationManager.completeAnimation();
        expectLabels(container, expectedPvLabels);
      });

      it("should animate the line path", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await prime(container, animationManager, changeData);

        const initialPath = "M5,5L23,27.5L41,27.5L59,50L77,32.45L95,52.475";
        // Immediately after the swap the line has new data but the path still
        // shows the OLD geometry, then morphs to the new one.
        expect(getLine(container).getAttribute("d")).toBe(initialPath);

        await animationManager.setAnimationProgress(0.2);
        expect(getLine(container).getAttribute("d")).toBe(
          "M5,18.68L23,32.779L41,38.484L59,41.36L77,37.926L95,52.34",
        );

        await animationManager.setAnimationProgress(0.5);
        expect(getLine(container).getAttribute("d")).toBe(
          "M5,39.2L23,40.699L41,54.959L59,28.4L77,46.139L95,52.138",
        );

        await animationManager.setAnimationProgress(1);
        expect(getLine(container).getAttribute("d")).toBe(
          "M5,73.4L23,53.897L41,82.418L59,6.8L77,59.828L95,51.8",
        );

        await animationManager.completeAnimation();
        expect(getLine(container).getAttribute("d")).toBe(
          "M5,73.4L23,53.897L41,82.418L59,6.8L77,59.828L95,51.8",
        );
      });

      it("should animate the dots", async () => {
        const { container, animationManager, changeData } = renderDataSwitch();
        await prime(container, animationManager, changeData);

        // Dots are still at the UV positions right after the swap.
        expectDots(container, expectedDots);

        await animationManager.setAnimationProgress(0.2);
        expectDots(container, [
          { cx: "5", cy: "18.68" },
          { cx: "23", cy: "32.7794" },
          { cx: "41", cy: "38.4836" },
          { cx: "59", cy: "41.36" },
          { cx: "77", cy: "37.9256" },
          { cx: "95", cy: "52.34" },
        ]);

        await animationManager.setAnimationProgress(0.5);
        expectDots(container, [
          { cx: "5", cy: "39.2" },
          { cx: "23", cy: "40.6985" },
          { cx: "41", cy: "54.959" },
          { cx: "59", cy: "28.4" },
          { cx: "77", cy: "46.139" },
          { cx: "95", cy: "52.1375" },
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
  });

  // Exercises the prevPointsDiffFactor index scaling: 2 -> 4 points means each
  // new point starts at the previous point at the scaled-down index (the two
  // inserted points begin on top of their nearest predecessor). All expected
  // values are byte-identical to the recharts reference (clean decimals).
  describe("tests that add more elements to the data array", () => {
    const data1 = PageData.slice(0, 2);
    const data2 = PageData.slice(0, 4);

    const renderAddData = () => {
      const manager = new MockProgressAnimationManager("line-add-data");
      const [data, setData] = createSignal(data1);
      const result = render(() => (
        <AnimationControllerProvider.Provider value={manager.factory}>
          <LineChart data={data()} width={100} height={100}>
            <Line dataKey="uv" animationEasing="linear" label />
          </LineChart>
        </AnimationControllerProvider.Provider>
      ));
      const addMoreData = (): void => {
        setData((prev) => (prev === data1 ? data2 : data1));
      };
      return { ...result, animationManager: manager, addMoreData };
    };

    const prime = async (
      animationManager: MockProgressAnimationManager,
      addMoreData: () => void,
    ): Promise<void> => {
      await animationManager.completeAnimation();
      addMoreData();
    };

    it("should keep the whole line visible during the animation", async () => {
      const { container, animationManager, addMoreData } = renderAddData();
      await prime(animationManager, addMoreData);

      // v3.9: the entrance reached full on the first animation, so the add-more
      // animation morphs the path with NO entrance stroke-dasharray (fully visible).
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

      await animationManager.setAnimationProgress(0.5);
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");

      await animationManager.completeAnimation();
      expect(getLine(container)).not.toHaveAttribute("stroke-dasharray");
    });

    it("should animate the line path", async () => {
      const { container, animationManager, addMoreData } = renderAddData();
      await prime(animationManager, addMoreData);

      const initialPath = "M5,5L5,5L95,27.5L95,27.5";
      expect(getLine(container).getAttribute("d")).toBe(initialPath);

      await animationManager.setAnimationProgress(0.2);
      expect(getLine(container).getAttribute("d")).toBe("M5,5L11,9.5L89,27.5L95,32");

      await animationManager.setAnimationProgress(0.5);
      expect(getLine(container).getAttribute("d")).toBe("M5,5L20,16.25L80,27.5L95,38.75");

      await animationManager.setAnimationProgress(1);
      expect(getLine(container).getAttribute("d")).toBe("M5,5L35,27.5L65,27.5L95,50");

      await animationManager.completeAnimation();
      expect(getLine(container).getAttribute("d")).toBe("M5,5L35,27.5L65,27.5L95,50");
    });

    it("should add more dots and animate them", async () => {
      const { container, animationManager, addMoreData } = renderAddData();
      // Only 2 dots initially: the source data has 2 elements.
      expectDots(container, [
        { cx: "5", cy: "5" },
        { cx: "95", cy: "27.5" },
      ]);

      await animationManager.completeAnimation();
      addMoreData();

      // Two new dots appear, starting on top of their nearest predecessor.
      expectDots(container, [
        { cx: "5", cy: "5" },
        { cx: "5", cy: "5" },
        { cx: "95", cy: "27.5" },
        { cx: "95", cy: "27.5" },
      ]);

      await animationManager.setAnimationProgress(0.2);
      expectDots(container, [
        { cx: "5", cy: "5" },
        { cx: "11", cy: "9.5" },
        { cx: "89", cy: "27.5" },
        { cx: "95", cy: "32" },
      ]);

      await animationManager.setAnimationProgress(0.5);
      expectDots(container, [
        { cx: "5", cy: "5" },
        { cx: "20", cy: "16.25" },
        { cx: "80", cy: "27.5" },
        { cx: "95", cy: "38.75" },
      ]);

      await animationManager.setAnimationProgress(1);
      const finalDotPositions = [
        { cx: "5", cy: "5" },
        { cx: "35", cy: "27.5" },
        { cx: "65", cy: "27.5" },
        { cx: "95", cy: "50" },
      ];
      expectDots(container, finalDotPositions);

      await animationManager.completeAnimation();
      expectDots(container, finalDotPositions);
    });
  });
});
