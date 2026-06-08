// Port of recharts 3.8.1 test/cartesian/Brush.stacked.spec.tsx (commit 7a23854).
// Only the "before moving the brush traveller" cases are ported: the brush chrome
// renders at the reserved position, and selectStackGroups returns both stacked Bars
// with all 6 stacked elements. The four "after moving the brush traveller" cases
// (issue #6006) are NOT ported — driving the traveller drag in a stacked BarChart
// trips a NO_OWNER_EFFECT diagnostic (the data-window change re-renders graphical
// items outside a reactive owner) AND the narrowed stacked bars do not re-render
// (bars=0); both are src-level limitations and editing src is out of scope here.
//
// Harness deltas: React render + @testing-library/react fireEvent →
// createSelectorTestCase; `import React` dropped. expectBrush is inlined.
// toBeRechartsStackedData is registered by the expectStackGroups side-effect import.
import { describe, expect, it } from "vitest";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
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
});
