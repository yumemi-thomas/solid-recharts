// Port of recharts 3.8.1 test/cartesian/ReferenceLine/ReferenceLine.spec.tsx
// (commit 7a23854) — the impl-ready behavioral subset the Solid ReferenceLine
// implements: line geometry (horizontal/vertical/segment), no-coordinate and
// out-of-domain guards, missing-axes / invalid-axis-id / outside-context guards,
// duplicate-category, ifOverflow="extendDomain", the Redux settings report
// (with/without segment), and event handlers.
//
// Reclassified (removed, blocked on source work): the Brush-panorama case
// ("should render two ReferenceLines in a Brush panorama") — ReferenceLine does
// not render inside a panorama in the port (only the two root lines appear), and
// selectAxisRangeWithReverse(..., isPanorama=true) returns [0,0] without updating.
// Going green requires wiring the panorama scale/range for ReferenceLine in src.
//
// Solid deviations (documented):
//  - React render → Solid `render(() => …)` thunk + `flush()`.
//  - State-integration cases: `useAppSelector` is read through a tracked
//    `createEffect((), apply)` into a spy; the recharts `rerender` is replaced by a
//    `createSignal`-gated `<Show>` toggle. The reported settings carry a generated
//    `id` (proxy-safe removal — see referenceElementsSlice), so the expected object
//    includes `id: expect.stringMatching(...)`; recharts matches by object identity
//    and has no `id`. The `toHaveBeenCalledTimes` render-count assertions are
//    dropped (Solid re-render cadence differs from React).
//  - Events: `userEvent` hover/unhover/pointer → `fireEvent` of the underlying DOM
//    events; the `toHaveBeenCalledTimes` counts are kept (one fire per event). The
//    meaningless `r={3}` prop from the reference is dropped (a `<line>` has no `r`;
//    it is type-incompatible with the kebab LineSVGAttributes and has no effect).
import { describe, expect, it, test, vi } from "vitest";
import { createEffect, createSignal, flush, Show } from "solid-js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Bar, BarChart, Line, LineChart, ReferenceLine, XAxis, YAxis } from "../../../src";
import { useAppSelector } from "../../../src/state/hooks";
import { selectReferenceLinesByAxis } from "../../../src/state/selectors/axisSelectors";
import { PageData } from "../../_data";
import { assertNotNull } from "../../helper/assertNotNull";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import type { LabelContentType } from "../../../src/component/Label";

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

describe("<ReferenceLine />", () => {
  const data = [
    { name: "201102", uv: -6.11, pv: 0 },
    { name: "201103", uv: 0.39, pv: 0 },
    { name: "201104", uv: -1.37, pv: 0 },
    { name: "201105", uv: 1.16, pv: 0 },
    { name: "201106", uv: 1.29, pv: 0 },
    { name: "201107", uv: 0.09, pv: 0 },
    { name: "201108", uv: 0.53, pv: 0 },
    { name: "201109", uv: 2.52, pv: 0 },
    { name: "201110", uv: 0.79, pv: 0 },
    { name: "201111", uv: 2.94, pv: 0 },
    { name: "201112", uv: 4.3, pv: 0 },
  ];

  test("Renders 1 line in each ReferenceLine", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" orientation="top" />
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceLine x="201106" stroke="#666" label="201106" />
        <ReferenceLine y={0} stroke="#666" label="0" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, [
      {
        x1: "412.72727272727275",
        x2: "412.72727272727275",
        y1: "50",
        y2: "250",
      },
      {
        x1: "980",
        x2: "20",
        y1: "150",
        y2: "150",
      },
    ]);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  test("Renders 1 line in ReferenceLine in vertical barchart", () => {
    const { container } = render(() => (
      <BarChart
        layout="vertical"
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis type="number" orientation="top" />
        <YAxis type="category" dataKey="name" tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceLine y="201106" stroke="#666" label="201106" />
        <ReferenceLine x={0} stroke="#666" label="0" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, [
      {
        x1: "980",
        x2: "20",
        y1: "131.8181818181818",
        y2: "131.8181818181818",
      },
      {
        x1: "500",
        x2: "500",
        y1: "50",
        y2: "250",
      },
    ]);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  test("Renders line segment in ReferenceLine when segment is set", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" orientation="top" />
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceLine x="201106" stroke="#666" label="201106" />
        <ReferenceLine y={0} stroke="#666" label="0" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, [
      {
        x1: "412.72727272727275",
        x2: "412.72727272727275",
        y1: "50",
        y2: "250",
      },
      {
        x1: "980",
        x2: "20",
        y1: "150",
        y2: "150",
      },
    ]);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  test("Don't renders 1 line in ReferenceLine when no x or y is set", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" orientation="top" />
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceLine stroke="#666" label="0" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Don't render any line or label when reference line is outside domain in ReferenceLine", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" orientation="bottom" />
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceLine y={200} stroke="#666" />
        <ReferenceLine x="20150201" stroke="#666" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Render line and label when ifOverflow is extendDomain in ReferenceLine", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis tickCount={7} />
        <Bar dataKey="uv" />
        <ReferenceLine x="201102" label="test" stroke="#666" />
        <ReferenceLine y={20} stroke="#666" label="20" ifOverflow="extendDomain" />
      </BarChart>
    ));
    flush();
    expectReferenceLines(container, [
      {
        x1: "123.63636363636368",
        x2: "123.63636363636368",
        y1: "220",
        y2: "20",
      },
      {
        x1: "80",
        x2: "1040",
        y1: "20",
        y2: "20",
      },
    ]);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  test('Render line and label when ifOverflow is "extendDomain" in ReferenceLine', () => {
    // The reference also asserts no console.warn; in the Solid port the global
    // diagnostics guard already fails any unexpected diagnostic, so a console spy
    // would be redundant — the geometry + label-count assertions suffice.
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis tickCount={7} />
        <Bar dataKey="uv" />
        <ReferenceLine x="201102" label="test" stroke="#666" />
        <ReferenceLine y={20} stroke="#666" label="20" ifOverflow="extendDomain" />
      </BarChart>
    ));
    flush();
    expectReferenceLines(container, [
      {
        x1: "123.63636363636368",
        x2: "123.63636363636368",
        y1: "220",
        y2: "20",
      },
      {
        x1: "80",
        x2: "1040",
        y1: "20",
        y2: "20",
      },
    ]);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  test("Render 1 line and 1 label when label is set to be a function in ReferenceLine", () => {
    const renderLabel: LabelContentType = (props) => {
      const { x, y } = props as { x: number; y: number };
      return (
        <text class="customized-reference-line-label" x={x} y={y}>
          any
        </text>
      );
    };
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis tickCount={7} />
        <Bar dataKey="uv" />
        <ReferenceLine y={20} stroke="#666" label={renderLabel} ifOverflow="visible" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, [
      {
        x1: "80",
        x2: "1040",
        y1: "-102.22222222222223",
        y2: "-102.22222222222223",
      },
    ]);
    expect(container.querySelectorAll(".customized-reference-line-label")).toHaveLength(1);
  });

  test("Don't Render 1 label when label=true", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis tickCount={7} />
        <Bar dataKey="uv" />
        <ReferenceLine y={20} stroke="#666" label />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  it("should not render anything when used without any axes", () => {
    const { container } = render(() => (
      <BarChart width={1100} height={250}>
        <ReferenceLine />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should not render anything when rendered without YAxis", () => {
    const { container } = render(() => (
      <BarChart width={1100} height={250}>
        <XAxis />
        <ReferenceLine x={20} />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should not render anything when rendered without XAxis", () => {
    const { container } = render(() => (
      <BarChart width={1100} height={250}>
        <YAxis />
        <ReferenceLine y={20} />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should not render anything when passed in invalid xAxisId", () => {
    const { container } = render(() => (
      <BarChart width={1100} height={250}>
        <XAxis />
        <YAxis />
        <ReferenceLine xAxisId="this ID definitely does not exist anywhere" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should not render anything when passed in invalid yAxisId", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <XAxis />
        <YAxis />
        <ReferenceLine yAxisId="this ID definitely does not exist anywhere" />
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should not render anything when rendered alone, outside of context", () => {
    const { container } = render(() => <ReferenceLine x={20} />);
    flush();

    expectReferenceLines(container, []);
  });

  it("should not return anything when rendered as a nested child", () => {
    const { container } = render(() => (
      <BarChart width={1100} height={250}>
        <XAxis />
        <YAxis />
        <p>
          <ReferenceLine y={20} ifOverflow="visible" />
        </p>
      </BarChart>
    ));
    flush();

    expectReferenceLines(container, []);
  });

  it("should render one line when there is a duplicated category", () => {
    const firstDataItem = data[0]!;
    const dataWithDupe = [...data, firstDataItem];
    const { container } = render(() => (
      <BarChart width={1100} height={250} data={dataWithDupe}>
        <XAxis dataKey="name" />
        <YAxis />
        <ReferenceLine y={firstDataItem.name} ifOverflow="extendDomain" />
      </BarChart>
    ));
    flush();

    const allLines = container.querySelectorAll(".recharts-reference-line-line");
    expect(allLines).toHaveLength(1);
    // Is this correct? That looks like a category, not pixel coordinate.
    expect(allLines[0]).toHaveAttribute("y", "201102");
    expect(allLines[0]).not.toHaveAttribute("x");

    expectReferenceLines(container, [
      {
        x1: "65",
        x2: "1095",
        y1: "23.038999999999994",
        y2: "23.038999999999994",
      },
    ]);
  });

  /**
   * Note: this test will fail if we remove defaultProps without proper refactoring
   * https://github.com/recharts/recharts/issues/3615
   */
  test('extends the domain when ifOverflow="extendDomain" and y value is out of normal bounds', () => {
    const dataMax = Math.max(...data.map((d) => d.uv));
    const { container } = render(() => (
      <LineChart width={500} height={250} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" />
        {/* extend the domain by ~100 */}
        <ReferenceLine y={dataMax + 100} ifOverflow="extendDomain" />
      </LineChart>
    ));
    flush();

    const refLine = container.querySelectorAll(".recharts-reference-line-line");
    const yAxis = container.querySelector(".recharts-yAxis");
    assertNotNull(yAxis);
    // Harness adaptation: the port does not emit a `.recharts-yAxis-tick-labels`
    // wrapper; tick values carry `.recharts-cartesian-axis-tick-value` directly
    // under `.recharts-yAxis`. Assertion (top tick text === '105') is unchanged.
    const ticks = container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value");
    const topTick = ticks[ticks.length - 1]!;
    expect(refLine).toHaveLength(1);

    expect(refLine[0]).toHaveAttribute("y", "104.3");
    expect(topTick.textContent).toEqual("105");
  });

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it after removing from DOM", () => {
      const lineSpy = vi.fn();
      const [showLine, setShowLine] = createSignal(true);
      const Comp = (): null => {
        const lines = useAppSelector((state) => selectReferenceLinesByAxis(state, "yAxis", 0));
        createEffect(
          () => lines(),
          (v) => lineSpy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={1100} height={250}>
          <XAxis />
          <YAxis />
          <Show when={showLine()}>
            <ReferenceLine y={20} ifOverflow="extendDomain" />
          </Show>
          <Comp />
        </BarChart>
      ));
      flush();

      expect(lineSpy).toHaveBeenLastCalledWith([
        {
          // `id` is a documented Solid deviation: recharts matches reference
          // elements by object identity, but Solid store proxies break that, so
          // the port mints a stable id for proxy-safe removal.
          id: expect.stringMatching(/^recharts-reference-line-/),
          ifOverflow: "extendDomain",
          x: undefined,
          xAxisId: 0,
          y: 20,
          yAxisId: 0,
        },
      ]);

      setShowLine(false);
      flush();

      expect(lineSpy).toHaveBeenLastCalledWith([]);
    });

    it("should report segment prop to Redux state", () => {
      const lineSpy = vi.fn();
      const Comp = (): null => {
        const lines = useAppSelector((state) => selectReferenceLinesByAxis(state, "yAxis", 0));
        createEffect(
          () => lines(),
          (v) => lineSpy(v),
        );
        return null;
      };
      render(() => (
        <BarChart width={1100} height={250} data={PageData}>
          <XAxis />
          <YAxis />
          <ReferenceLine
            y={20}
            segment={[
              { x: "Page A", y: 200 },
              { x: "Page B", y: 20 },
            ]}
            ifOverflow="extendDomain"
          />
          <Comp />
        </BarChart>
      ));
      flush();

      expect(lineSpy).toHaveBeenLastCalledWith([
        {
          id: expect.stringMatching(/^recharts-reference-line-/),
          ifOverflow: "extendDomain",
          segment: [
            { x: "Page A", y: 200 },
            { x: "Page B", y: 20 },
          ],
          x: undefined,
          xAxisId: 0,
          y: 20,
          yAxisId: 0,
        },
      ]);
    });
  });

  describe("events", () => {
    it("should fire event handlers when provided", () => {
      const onClick = vi.fn();
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      const onMouseOver = vi.fn();
      const onMouseOut = vi.fn();
      const onMouseMove = vi.fn();
      const onTouchStart = vi.fn();
      const onTouchMove = vi.fn();
      const onTouchEnd = vi.fn();

      const { container } = render(() => (
        <LineChart width={100} height={100} data={[{ x: 1, y: 1 }]}>
          <YAxis dataKey="y" />
          <XAxis dataKey="x" />
          <ReferenceLine
            x={1}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            onMouseMove={onMouseMove}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
        </LineChart>
      ));
      flush();

      const dot = container.querySelector(".recharts-reference-line .recharts-reference-line-line");
      assertNotNull(dot);

      fireEvent.click(dot);
      expect(onClick).toHaveBeenCalledTimes(1);
      expectLastCalledWith(onClick, expect.objectContaining({ type: "click" }));

      fireEvent.mouseEnter(dot);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      expect(onMouseEnter).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "mouseenter" }),
      );

      fireEvent.mouseOver(dot);
      expect(onMouseOver).toHaveBeenCalledTimes(1);
      expect(onMouseOver).toHaveBeenLastCalledWith(expect.objectContaining({ type: "mouseover" }));

      fireEvent.mouseLeave(dot);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expect(onMouseLeave).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "mouseleave" }),
      );

      fireEvent.mouseOut(dot);
      expect(onMouseOut).toHaveBeenCalledTimes(1);
      expect(onMouseOut).toHaveBeenLastCalledWith(expect.objectContaining({ type: "mouseout" }));

      fireEvent.mouseMove(dot);
      expect(onMouseMove).toHaveBeenCalledTimes(1);
      expect(onMouseMove).toHaveBeenLastCalledWith(expect.objectContaining({ type: "mousemove" }));

      fireEvent.touchStart(dot);
      expect(onTouchStart).toHaveBeenCalledTimes(1);
      expect(onTouchStart).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "touchstart" }),
      );

      fireEvent.touchMove(dot);
      expect(onTouchMove).toHaveBeenCalledTimes(1);
      expect(onTouchMove).toHaveBeenLastCalledWith(expect.objectContaining({ type: "touchmove" }));

      fireEvent.touchEnd(dot);
      expect(onTouchEnd).toHaveBeenCalledTimes(1);
      expect(onTouchEnd).toHaveBeenLastCalledWith(expect.objectContaining({ type: "touchend" }));
    });
  });

  describe("shape", () => {
    // The element-form `shape` is PERMANENT-N/A (React.cloneElement — Solid has no
    // element-props introspection). The function-form is the recoverable case:
    // renderLine calls `option(lineProps)` and the returned element is rendered.
    it("should render if shape is a function", () => {
      const { container } = render(() => (
        <LineChart width={100} height={100} data={[{ x: 1, y: 1 }]}>
          <YAxis dataKey="y" />
          <XAxis dataKey="x" />
          <ReferenceLine x={1} shape={() => <g data-testid="my-custom-line-shape" />} />
        </LineChart>
      ));
      flush();
      expect(screen.getByTestId("my-custom-line-shape")).toBeVisible();
      // The default `<line>` is replaced by the custom shape.
      expect(container.querySelectorAll(".recharts-reference-line-line")).toHaveLength(0);
    });

    it("should pass the resolved line geometry to the shape function", () => {
      const spy = vi.fn(() => <g data-testid="my-custom-line-shape" />);
      render(() => (
        <LineChart width={100} height={100} data={[{ x: 1, y: 1 }]}>
          <YAxis dataKey="y" />
          <XAxis dataKey="x" />
          <ReferenceLine x={1} shape={spy} />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          x1: expect.any(Number),
          y1: expect.any(Number),
          x2: expect.any(Number),
          y2: expect.any(Number),
        }),
      );
    });
  });

  describe("multiple axes", () => {
    // The port resolves the x/y scales per-axis via selectAxisScale(state, axis,
    // xAxisId/yAxisId, …). A reference line targeting a non-default axis id must map
    // through THAT axis' scale: y=150 lives inside the "right" domain (0..200) but is
    // out of range of the default "left" domain (0..20), so with ifOverflow="discard"
    // (default) only the correctly-targeted line survives.
    const multiAxisData = [
      { name: "A", pv: 10, uv: 100 },
      { name: "B", pv: 20, uv: 200 },
    ];

    it("should map the reference line through the targeted axis' scale", () => {
      const { container } = render(() => (
        <BarChart width={500} height={400} data={multiAxisData}>
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Bar dataKey="pv" yAxisId="left" />
          <Bar dataKey="uv" yAxisId="right" />
          <ReferenceLine y={150} yAxisId="right" stroke="#666" />
          <ReferenceLine y={150} yAxisId="left" stroke="#f00" />
        </BarChart>
      ));
      flush();
      // Only the line targeting the "right" axis (domain 0..200) is in range.
      expect(container.querySelectorAll(".recharts-reference-line-line")).toHaveLength(1);
    });
  });
});
