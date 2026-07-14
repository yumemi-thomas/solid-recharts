// Port of recharts 3.8.1 test/cartesian/ReferenceDot.spec.tsx (commit 7a23854) — the
// behavioral subset the Solid ReferenceDot implements: dot+label rendering at a data
// coordinate, in/out-of-domain visibility, ifOverflow (hidden clip-path / extendDomain),
// function-form label, and the Redux settings report. Deferred (impl/event-model gaps):
// element-form `shape`/`label` (Solid elements aren't introspectable), the React-style
// `DotProps` event-arg snapshot (port emits kebab SVG props on a non-bubbling Layer), and
// the React-component `shape` prop-equality case.
import { describe, expect, it, test, vi } from "vitest";
import { createEffect, createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { Bar, BarChart, LineChart, ReferenceDot, XAxis, YAxis } from "../../src";
import { useAppSelector } from "../../src/state/hooks";
import { selectReferenceDotsByAxis } from "../../src/state/selectors/axisSelectors";
import { assertNotNull } from "../helper/assertNotNull";
import { Show } from "solid-js";

describe("<ReferenceDot />", () => {
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

  test("Render 1 dot and 1 label in ReferenceDot", () => {
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
        <ReferenceDot x="201106" y={3} stroke="#666" label="201106" />
      </BarChart>
    ));
    expect(
      container.querySelectorAll(".recharts-reference-dot .recharts-reference-dot-dot"),
    ).toHaveLength(1);
    const labels = container.querySelectorAll(".recharts-label");
    expect(labels).toHaveLength(1);
    const label = labels[0]!;
    expect(label.getAttribute("x")).toEqual("472.72727272727275");
    expect(label.getAttribute("y")).toEqual("86.66666666666667");
    expect(label.getAttribute("fill")).toEqual("#808080");
    expect(label.getAttribute("class")).toEqual("recharts-text recharts-label");
    expect(label.getAttribute("text-anchor")).toEqual("middle");
    expect(label.textContent).toEqual("201106");
  });

  test("Don't render any dot or label when reference dot is outside domain in ReferenceDot", () => {
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
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceDot x="201106" y={20} stroke="#666" label="201106" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Don't render any dot or label when x is not defined", () => {
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
        <ReferenceDot y={3} stroke="#666" label="201106" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Don't render any dot or label when y is not defined", () => {
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
        <ReferenceDot x="201104" stroke="#666" label="201106" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  it("should render dot and label even when yAxis is not present", () => {
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
        <Bar dataKey="uv" />
        <ReferenceDot x="201104" y={3} stroke="#666" label="201106" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  it('adds a clipPath attribute when ifOverflow is "hidden"', () => {
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
        <ReferenceDot x="201106" y={20} stroke="#666" label="201106" ifOverflow="hidden" />
      </BarChart>
    ));
    expect(
      container.querySelectorAll(".recharts-reference-dot-dot")[0]!.getAttribute("clip-path"),
    ).toMatch(/url\(#recharts(\d+)-clip\)/);
  });

  test("Render 1 line and 1 label when ifOverflow is `extendDomain` in ReferenceDot", () => {
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
        <ReferenceDot x="201106" y={20} stroke="#666" label="201106" ifOverflow="extendDomain" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  test("Render custom label when label is set to be a function", () => {
    const renderLabel = () => <text class="customized-label">Custom Text</text>;

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
        <ReferenceDot
          x="201106"
          y={20}
          stroke="#666"
          label={renderLabel}
          ifOverflow="extendDomain"
        />
      </BarChart>
    ));
    expect(container.querySelector(".customized-label")?.textContent).toEqual("Custom Text");
  });

  test("Don't render any label when label is a plain object", () => {
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
        <ReferenceDot x="201106" y={20} stroke="#666" ifOverflow="extendDomain" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Don't render any dot when x or y is not specified", () => {
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
        <ReferenceDot x="201106" stroke="#666" ifOverflow="extendDomain" />
        <ReferenceDot y={20} stroke="#666" ifOverflow="extendDomain" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-dot-dot")).toHaveLength(0);
  });

  describe("events", () => {
    // Handlers are called props-first — `(dotProps, event)` — exactly like recharts
    // (the reference's Dot wraps them via adaptEventHandlers; the port wraps in
    // ReferenceDot's renderDot). The first-arg snapshot asserts the geometry/style
    // fields of the dot props (the full React props-bag snapshot is N/A: the port
    // carries `class`, not `className`, and Solid handler values differ).
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
          <ReferenceDot
            x={1}
            y={1}
            r={3}
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
      const dot = container.querySelector(".recharts-reference-dot .recharts-dot");
      assertNotNull(dot);

      // The reference golden for this chart: cx=80, cy=5 (LineChart 100×100, one point).
      const expectedDotProps = expect.objectContaining({
        class: "recharts-reference-dot-dot",
        cx: 80,
        cy: 5,
        fill: "#fff",
        fillOpacity: 1,
        r: 3,
        stroke: "#ccc",
        strokeWidth: 1,
      });

      fireEvent.click(dot);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "click" }),
      );

      fireEvent.mouseEnter(dot);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      expect(onMouseEnter).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "mouseenter" }),
      );

      fireEvent.mouseOver(dot);
      expect(onMouseOver).toHaveBeenCalledTimes(1);
      expect(onMouseOver).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "mouseover" }),
      );

      fireEvent.mouseLeave(dot);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expect(onMouseLeave).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "mouseleave" }),
      );

      fireEvent.mouseOut(dot);
      expect(onMouseOut).toHaveBeenCalledTimes(1);
      expect(onMouseOut).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "mouseout" }),
      );

      fireEvent.mouseMove(dot);
      expect(onMouseMove).toHaveBeenCalledTimes(1);
      expect(onMouseMove).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "mousemove" }),
      );

      fireEvent.touchStart(dot);
      expect(onTouchStart).toHaveBeenCalledTimes(1);
      expect(onTouchStart).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "touchstart" }),
      );

      fireEvent.touchMove(dot);
      expect(onTouchMove).toHaveBeenCalledTimes(1);
      expect(onTouchMove).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "touchmove" }),
      );

      fireEvent.touchEnd(dot);
      expect(onTouchEnd).toHaveBeenCalledTimes(1);
      expect(onTouchEnd).toHaveBeenLastCalledWith(
        expectedDotProps,
        expect.objectContaining({ type: "touchend" }),
      );
    });

    it("should fire mousedown and mouseup handlers props-first", () => {
      const onMouseDown = vi.fn();
      const onMouseUp = vi.fn();
      const { container } = render(() => (
        <LineChart width={100} height={100} data={[{ x: 1, y: 1 }]}>
          <YAxis dataKey="y" />
          <XAxis dataKey="x" />
          <ReferenceDot x={1} y={1} r={3} onMouseDown={onMouseDown} onMouseUp={onMouseUp} />
        </LineChart>
      ));
      const dot = container.querySelector(".recharts-reference-dot .recharts-dot");
      assertNotNull(dot);

      fireEvent.mouseDown(dot);
      expect(onMouseDown).toHaveBeenCalledTimes(1);
      expect(onMouseDown).toHaveBeenLastCalledWith(
        expect.objectContaining({ cx: 80, cy: 5, r: 3 }),
        expect.objectContaining({ type: "mousedown" }),
      );

      fireEvent.mouseUp(dot);
      expect(onMouseUp).toHaveBeenCalledTimes(1);
      expect(onMouseUp).toHaveBeenLastCalledWith(
        expect.objectContaining({ cx: 80, cy: 5, r: 3 }),
        expect.objectContaining({ type: "mouseup" }),
      );
    });
  });

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it after removing from DOM", () => {
      const dotSpy = vi.fn();
      const [showDot, setShowDot] = createSignal(true);
      const Comp = (): null => {
        const dots = useAppSelector((state) => selectReferenceDotsByAxis(state, "yAxis", 0));
        createEffect(() => {
          const value = (() => dots())();
          ((v) => dotSpy(v))(value);
        });
        return null;
      };
      render(() => (
        <LineChart width={100} height={100}>
          <YAxis />
          <XAxis />
          <Show when={showDot()}>
            <ReferenceDot x={1} y="categorical data item" r={3} ifOverflow="extendDomain" />
          </Show>
          <Comp />
        </LineChart>
      ));
      expect(dotSpy).toHaveBeenLastCalledWith([
        {
          // `id` is a documented Solid deviation: recharts matches reference
          // elements by object identity, but Solid store proxies break that, so
          // the port mints a stable id for proxy-safe removal.
          id: expect.stringMatching(/^recharts-reference-dot-/) as unknown as string,
          x: 1,
          y: "categorical data item",
          r: 3,
          xAxisId: 0,
          yAxisId: 0,
          ifOverflow: "extendDomain",
        },
      ]);

      setShowDot(false);
      expect(dotSpy).toHaveBeenLastCalledWith([]);
    });
  });
});
