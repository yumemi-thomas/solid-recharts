// Port of recharts 3.8.1 test/cartesian/Brush.stacked.spec.tsx (commit 7a23854).
// Both the "before moving" AND "after moving the brush traveller" cases (issue
// #6006) are ported: dragging the start traveller right narrows the data window,
// the brush chrome stays at its reserved position, the surviving stacked bars
// re-render, and selectStackGroups still returns both stacked Bars with all 6
// stacked elements (the full domain — the window is a render-time slice).
//
// Drag mechanism: fireEvent.mouseDown(traveller) then fireEvent.mouseMove(traveller,
// { clientX }) — jsdom maps clientX onto event.pageX (the prop the brush handler
// reads), and the move bubbles to the window capture listener attached on mousedown.
// (The earlier NO_OWNER_EFFECT-on-drag + bars=0 blockers are gone: the store write
// runs inside the render root's delegated-event owner, and Bar now renders every
// selector-output rectangle — see Bar.tsx, the removed width/height DOM gate.)
//
// Harness deltas: React render + @testing-library/react fireEvent →
// createSelectorTestCase; `import React` dropped. expectBrush is inlined.
// toBeRechartsStackedData is registered by the expectStackGroups side-effect import.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { fireEvent } from "../helper/render";
import { BarChart, Bar, Brush } from "../../src";
import { PageData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";
import { selectStackGroups } from "../../src/state/selectors/axisSelectors";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import "../helper/expectStackGroups"; // registers toBeRechartsStackedData (expect.extend)

type ExpectedBrush = {
  x: string;
  y: string;
  width: string;
  height: string;
};

function expectBrush(container: Element, expected: ExpectedBrush): void {
  assertNotNull(container);
  const brush = container.querySelector(".recharts-brush rect");
  assertNotNull(brush);
  const actual = {
    x: brush.getAttribute("x"),
    y: brush.getAttribute("y"),
    width: brush.getAttribute("width"),
    height: brush.getAttribute("height"),
  };
  expect(actual).toEqual(expected);
}

const barSettings = (dataKey: string) => ({
  id: expect.stringMatching("bar-"),
  barSize: undefined,
  data: undefined,
  dataKey,
  hasCustomShape: false,
  hide: false,
  isPanorama: false,
  maxBarSize: undefined,
  minPointSize: 0,
  stackId: "a",
  type: "bar",
  xAxisId: 0,
  yAxisId: 0,
  zAxisId: 0,
});

describe("Brush in a stacked chart", () => {
  const renderTestCase = createSelectorTestCase((props) => (
    <BarChart width={500} height={300} data={PageData}>
      <Bar dataKey="pv" stackId="a" />
      <Bar dataKey="uv" stackId="a" />
      <Brush dataKey="name" />
      {props.children}
    </BarChart>
  ));

  describe("before moving the brush traveller", () => {
    it("should render Brush", () => {
      const { container } = renderTestCase();
      expectBrush(container, {
        height: "40",
        width: "490",
        x: "5",
        y: "255",
      });
    });

    it("should select stack groups", () => {
      const { spy } = renderTestCase((state) => selectStackGroups(state, "xAxis", 0, false));
      expectLastCalledWith(spy, {
        a: {
          graphicalItems: [barSettings("pv"), barSettings("uv")],
          stackedData: expect.toBeRechartsStackedData([
            [
              // 6 elements for each stack, because PageData has 6 items
              [0, 2400],
              [0, 4567],
              [0, 1398],
              [0, 9800],
              [0, 3908],
              [0, 4800],
            ],
            [
              [2400, 2800],
              [4567, 4867],
              [1398, 1698],
              [9800, 10000],
              [3908, 4186],
              [4800, 4989],
            ],
          ]),
        },
      });
    });
  });

  describe("after moving the brush traveller", () => {
    function prime(container: Element): void {
      const traveller = container.querySelector(".recharts-brush-traveller");
      assertNotNull(traveller);
      fireEvent.mouseDown(traveller);
      flush();
      fireEvent.mouseMove(traveller, { clientX: 100, clientY: 0 });
      flush();
    }

    function primeToLastThree(container: Element): void {
      const traveller = container.querySelector(".recharts-brush-traveller");
      assertNotNull(traveller);
      fireEvent.mouseDown(traveller);
      flush();
      // Move far to the right to show only the last 3 pages (D, E, F).
      fireEvent.mouseMove(traveller, { clientX: 300, clientY: 0 });
      flush();
    }

    it("should display fewer bars after moving the brush traveller", () => {
      /* Reproduces https://github.com/recharts/recharts/issues/6006 */
      const { container } = renderTestCase();
      prime(container);
      expectBrush(container, {
        height: "40",
        width: "490",
        x: "5",
        y: "255",
      });
    });

    it("should select stack groups", () => {
      const { container, spy } = renderTestCase((state) =>
        selectStackGroups(state, "xAxis", 0, false),
      );
      prime(container);
      // The full domain (all 6 stacked elements) is unchanged by the window narrowing —
      // the data window is a render-time slice, not a stack-group recompute.
      expectLastCalledWith(spy, {
        a: {
          graphicalItems: [barSettings("pv"), barSettings("uv")],
          stackedData: expect.toBeRechartsStackedData([
            [
              [0, 2400],
              [0, 4567],
              [0, 1398],
              [0, 9800],
              [0, 3908],
              [0, 4800],
            ],
            [
              [2400, 2800],
              [4567, 4867],
              [1398, 1698],
              [9800, 10000],
              [3908, 4186],
              [4800, 4989],
            ],
          ]),
        },
      });
    });

    describe("when narrowed down to last 3 pages", () => {
      it("should display bars for the last 3 pages", () => {
        const { container } = renderTestCase();
        primeToLastThree(container);
        const bars = container.querySelectorAll(".recharts-bar-rectangle");
        expect(bars.length).toBeGreaterThan(0);
      });

      it("should select correct stack groups with proper data range", () => {
        const { container, spy } = renderTestCase((state) =>
          selectStackGroups(state, "xAxis", 0, false),
        );
        primeToLastThree(container);
        // When narrowed, stackedData still has all 6 elements (only the last 3 are
        // used for rendering, handled by dataStartIndex/dataEndIndex).
        expectLastCalledWith(spy, {
          a: {
            graphicalItems: [barSettings("pv"), barSettings("uv")],
            stackedData: expect.toBeRechartsStackedData([
              [
                [0, 2400],
                [0, 4567],
                [0, 1398],
                [0, 9800],
                [0, 3908],
                [0, 4800],
              ],
              [
                [2400, 2800],
                [4567, 4867],
                [1398, 1698],
                [9800, 10000],
                [3908, 4186],
                [4800, 4989],
              ],
            ]),
          },
        });
      });
    });
  });
});
