// Port of the recharts 3.8.1 test/cartesian/ReferenceLine/ReferenceLine.spec.tsx
// `describe('panorama')` block — kept in a SEPARATE file (the main
// ReferenceLine.spec.tsx is owned by another agent and its header still lists this
// case as "blocked on source work"; that note predates the panorama-transparent
// chart-root and is now stale — the case passes unchanged).
//
// Why it works now: a nested `<LineChart>` inside `<Brush>` renders inside a
// PanoramaContext, so CartesianChart short-circuits to its children (no own store).
// The nested `<ReferenceLine>`/`<Line>` therefore register into the OUTER store and
// draw into the brush's panorama surface, reading the isPanorama=true axis range —
// recharts' cloneElement(width/height/data/compact) semantics without cloneElement.
//
// Solid deviations (documented):
//  - React render → `render(() => …)` thunk + `flush()`.
//  - `useAppSelector` is an accessor; the RootComp/PanoramaComp probes read it
//    through a tracked `createEffect((), apply)` into a spy (same pattern as the
//    state-integration block in ReferenceLine.spec.tsx), rather than calling the
//    hook directly in a render body.
import { describe, expect, it, vi } from "vitest";
import { createEffect } from "solid-js";
import { render } from "@solidjs/testing-library";
import { Brush, ComposedChart, Line, LineChart, ReferenceLine, XAxis, YAxis } from "../../../src";
import { useAppSelector } from "../../../src/state/hooks";
import { selectAxisRangeWithReverse } from "../../../src/state/selectors/axisSelectors";
import {
  selectBrushDimensions,
  selectBrushSettings,
} from "../../../src/state/selectors/brushSelectors";
import { pageData } from "../../_data";
import { assertNotNull } from "../../helper/assertNotNull";

type ExpectedReferenceLine = {
  x1: string | null;
  x2: string | null;
  y1: string | null;
  y2: string | null;
};

function expectReferenceLines(
  container: Element,
  expectedLines: ReadonlyArray<ExpectedReferenceLine>,
): void {
  assertNotNull(container);
  const referenceLines = container.querySelectorAll(".recharts-reference-line-line");
  assertNotNull(referenceLines);
  const referenceLinesContexts = Array.from(referenceLines).map((line) => ({
    x1: line.getAttribute("x1"),
    x2: line.getAttribute("x2"),
    y1: line.getAttribute("y1"),
    y2: line.getAttribute("y2"),
  }));
  expect(referenceLinesContexts).toEqual(expectedLines);
}

describe("<ReferenceLine /> panorama", () => {
  it("should render two ReferenceLines in a Brush panorama", () => {
    const brushDimensionsSpy = vi.fn();
    const brushPaddingSpy = vi.fn();
    const rootYAxisRangeSpy = vi.fn();
    const panoramaYAxisRangeSpy = vi.fn();
    const rootXAxisRangeSpy = vi.fn();
    const panoramaXAxisRangeSpy = vi.fn();

    const RootComp = (): null => {
      const dims = useAppSelector(selectBrushDimensions);
      const padding = useAppSelector((state) => selectBrushSettings(state)?.padding);
      const rootYRange = useAppSelector((state) =>
        selectAxisRangeWithReverse(state, "yAxis", 0, false),
      );
      const rootXRange = useAppSelector((state) =>
        selectAxisRangeWithReverse(state, "xAxis", 0, false),
      );
      createEffect(() => {
        const value = (() => dims())();
        ((v) => brushDimensionsSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => padding())();
        ((v) => brushPaddingSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => rootYRange())();
        ((v) => rootYAxisRangeSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => rootXRange())();
        ((v) => rootXAxisRangeSpy(v))(value);
      });
      return null;
    };

    const PanoramaComp = (): null => {
      const panoYRange = useAppSelector((state) =>
        selectAxisRangeWithReverse(state, "yAxis", 0, true),
      );
      const panoXRange = useAppSelector((state) =>
        selectAxisRangeWithReverse(state, "xAxis", 0, true),
      );
      createEffect(() => {
        const value = (() => panoYRange())();
        ((v) => panoramaYAxisRangeSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => panoXRange())();
        ((v) => panoramaXAxisRangeSpy(v))(value);
      });
      return null;
    };

    const { container } = render(() => (
      <ComposedChart
        width={600}
        height={300}
        data={pageData}
        margin={{ top: 11, right: 13, left: 17, bottom: 19 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <ReferenceLine y={1000} />
        <ReferenceLine x="Page C" />
        <Line dataKey="pv" />
        <Line dataKey="uv" />
        <Brush dataKey="name" padding={{ bottom: 1, left: 3, right: 5, top: 9 }}>
          <LineChart>
            <ReferenceLine y={1000} />
            <ReferenceLine x="Page C" />
            <Line dataKey="pv" />
            <Line dataKey="uv" />
            <PanoramaComp />
          </LineChart>
        </Brush>
        <RootComp />
      </ComposedChart>
    ));
    expect(rootYAxisRangeSpy).toHaveBeenLastCalledWith([211, 11]);
    expect(panoramaYAxisRangeSpy).toHaveBeenLastCalledWith([39, 9]);

    expect(rootXAxisRangeSpy).toHaveBeenLastCalledWith([77, 587]);
    expect(panoramaXAxisRangeSpy).toHaveBeenLastCalledWith([3, 505]);

    expect(brushDimensionsSpy).toHaveBeenLastCalledWith({
      height: 40,
      width: 510,
      x: 77,
      y: 241,
    });

    expect(brushPaddingSpy).toHaveBeenLastCalledWith({
      bottom: 1,
      left: 3,
      right: 5,
      top: 9,
    });

    expectReferenceLines(container, [
      {
        x1: "3",
        x2: "505",
        y1: "20.25",
        y2: "20.25",
      },
      {
        x1: "170.33333333333334",
        x2: "170.33333333333334",
        y1: "39",
        y2: "9",
      },
      {
        x1: "77",
        x2: "587",
        y1: "86",
        y2: "86",
      },
      {
        x1: "247",
        x2: "247",
        y1: "211",
        y2: "11",
      },
    ]);
  });
});
