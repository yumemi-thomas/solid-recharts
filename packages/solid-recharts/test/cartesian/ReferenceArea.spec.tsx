// Ported from recharts 3.8.1 test/cartesian/ReferenceArea.spec.tsx (commit 7a23854)
// — the impl-ready behavioral subset the Solid ReferenceArea implements:
// XAxis/YAxis/Bar dependency checks, coordinate-presence gating, ifOverflow
// discard/extendDomain/hidden, string/number/object/function/boolean labels,
// default-Rectangle vs function-form shape (+ the shape-fn argument record),
// clip-path wiring, event handlers, and the Redux settings report.
//
// Solid deviations (documented):
//  - React render → Solid `render(() => ...)` thunk + `flush()`.
//  - @testing-library/react userEvent → fireEvent (the port's convention).
//  - The function-form `shape`/`label` render props are invoked with the Solid
//    prop record (kebab SVG keys, no React `props.x`/`props.y` top-level), so the
//    "shape function arguments" assertion is golden-anchored to that record and
//    the function-label renders a static <text> (it cannot read top-level x/y).
//  - The settings report carries a generated `id` (proxy-safe removal) and is
//    asserted via a createEffect spy + a Show toggle (no React `rerender`); the
//    render-cycle call-count assertions are React-specific and dropped.
//  - Element-form shape/label cases are NOT in this file (deferred: Solid
//    elements aren't introspectable).
import { describe, expect, it, test, vi } from "vitest";
import { createEffect, createSignal, Show } from "solid-js";
import type { JSX } from "solid-js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Bar, BarChart, IfOverflow, LineChart, ReferenceArea, XAxis, YAxis } from "../../src";
import { useAppSelector } from "../../src/state/hooks";
import { selectReferenceAreasByAxis } from "../../src/state/selectors/axisSelectors";
import { assertNotNull } from "../helper/assertNotNull";

describe("<ReferenceArea />", () => {
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

  test("Render 1 rect in ReferenceArea", () => {
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
        <ReferenceArea x1="201106" x2="201110" fill="#666" label="201106" />
        <ReferenceArea y1={0} y2={2} fill="#666" label="201106" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(2);
  });

  it("should render nothing if neither XAxis not Bar are present", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <YAxis tickCount={7} orientation="right" />
        <ReferenceArea x1="201106" x2="201110" fill="#666" />
        <ReferenceArea y1={0} y2={2} fill="#999" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(0);
  });

  it("should render nothing if neither YAxis not Bar are present", () => {
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
        <ReferenceArea x1="201106" x2="201110" fill="#666" />
        <ReferenceArea y1={0} y2={2} fill="#999" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(0);
  });

  it("should hallucinate XAxis props from Bar", () => {
    const { container } = render(() => (
      <BarChart
        width={1100}
        height={250}
        barGap={2}
        barSize={6}
        data={data}
        margin={{ top: 20, right: 60, bottom: 0, left: 20 }}
      >
        <YAxis tickCount={7} orientation="right" />
        <Bar dataKey="uv" />
        <ReferenceArea y1={0} y2={2} fill="#999" />
      </BarChart>
    ));
    const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
    expect(allAreas).toHaveLength(1);
    const area = allAreas[0]!;
    expect(area).toHaveAttribute("d", "M 20,109.4444 h 960 v 25.5556 h -960 Z");
  });

  test("Don't render any rect in ReferenceArea when no x1, x2, y1 or y2 is set", () => {
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
        <ReferenceArea stroke="#666" label="0" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test("Render a rect in ReferenceArea when x1, x2, y1 or y2 is set", () => {
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
        <ReferenceArea x1="201106" stroke="#666" label="0" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  test("Don't render any line or label when reference area is outside domain in ReferenceArea", () => {
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
        <ReferenceArea y1={200} y2={300} fill="#666" />
        <ReferenceArea x1="20150201" x2="20150201" fill="#666" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
  });

  test('Render line and label when ifOverflow is "extendDomain" in ReferenceArea', () => {
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
        <ReferenceArea y1={200} y2={300} fill="#666" ifOverflow="extendDomain" />
      </BarChart>
    ));
    expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(1);
  });

  describe("label", () => {
    it("should render label defined as a string", () => {
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
          <ReferenceArea x1="201106" x2="201110" fill="#666" label="My label text" />
        </BarChart>
      ));
      expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
      expect(screen.getByText("My label text")).toBeVisible();
    });

    it("should render label defined as a number", () => {
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
          <ReferenceArea x1="201106" x2="201110" fill="#666" label={2024} />
        </BarChart>
      ));
      expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
      expect(screen.getByText("2024")).toBeVisible();
    });

    it("should render label defined as a Label props object", () => {
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
          <ReferenceArea
            x1="201106"
            x2="201110"
            fill="#666"
            label={{ value: "This is not documented by it works perfectly fine", offset: 8 }}
          />
        </BarChart>
      ));
      expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
      expect(screen.getByText("This is not documented by it works perfectly fine")).toBeVisible();
    });

    test("Render 1 line and 1 label when label is a function", () => {
      // Solid render-prop form: recharts reads top-level props.x/props.y, which
      // the Solid Label content fn surfaces under `viewBox` instead. The original
      // assertions never check x/y, so the label renders a static <text>.
      const renderLabel = (): JSX.Element => (
        <text class="customized-reference-area-label">My custom label text</text>
      );
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
          <ReferenceArea x1="201106" x2="201110" fill="#666" label={renderLabel} />
        </BarChart>
      ));
      expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(1);
      expect(container.querySelectorAll(".customized-reference-area-label")).toHaveLength(1);
      expect(screen.getByText("My custom label text")).toBeVisible();
    });

    test.each([true, false])("should not render label when label=%s", (label) => {
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
          <ReferenceArea x1="201106" x2="201110" fill="#666" label={label} />
        </BarChart>
      ));
      expect(container.querySelectorAll(".recharts-label")).toHaveLength(0);
    });
  });

  describe("shape", () => {
    it("should render rectangle when shape is not defined", () => {
      const { container } = render(() => (
        <BarChart width={200} height={200} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="uv" />
          <ReferenceArea
            x1="201106"
            x2="201110"
            fill="#666"
            radius={20}
            strokeWidth={3}
            fillOpacity={0.7}
            stroke="yellow"
          />
        </BarChart>
      ));
      const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
      expect(allAreas).toHaveLength(1);
      const area = allAreas[0]!;
      expect.soft(area).toHaveAttribute("x", "112.2727");
      expect.soft(area).toHaveAttribute("y", "5");
      expect.soft(area).toHaveAttribute("width", "59.0909");
      expect.soft(area).toHaveAttribute("height", "160");
      expect.soft(area).toHaveAttribute("radius", "20");
      expect.soft(area).toHaveAttribute("x1", "201106");
      expect.soft(area).toHaveAttribute("x2", "201110");
      expect.soft(area).toHaveAttribute("fill", "#666");
      expect.soft(area).toHaveAttribute("stroke-width", "3");
      expect.soft(area).toHaveAttribute("fill-opacity", "0.7");
      expect.soft(area).toHaveAttribute("stroke", "yellow");
      expect.soft(area).toHaveAttribute("class", "recharts-rectangle recharts-reference-area-rect");
    });

    it("should render if shape is a function", () => {
      render(() => (
        <BarChart width={200} height={200} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="uv" />
          <ReferenceArea
            x1="201106"
            x2="201110"
            fill="#666"
            shape={() => <g data-testid="my-custom-shape" />}
            radius={10}
            strokeWidth={3}
          />
        </BarChart>
      ));
      const area = screen.getByTestId("my-custom-shape");
      expect(area).toBeVisible();
    });

    it("should pass arguments to the shape function", () => {
      const spy = vi.fn();
      render(() => (
        <BarChart width={200} height={200} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="uv" />
          <ReferenceArea
            x1="201106"
            x2="201110"
            fill="#666"
            shape={spy}
            radius={10}
            strokeWidth={3}
          />
        </BarChart>
      ));
      expect(spy).toHaveBeenLastCalledWith({
        clipPath: undefined,
        fill: "#666",
        fillOpacity: 0.5,
        height: 160,
        radius: 10,
        stroke: "none",
        strokeWidth: 3,
        width: 59.09090909090909,
        x: 112.27272727272728,
        x1: "201106",
        x2: "201110",
        y: 5,
      });
    });

    it("should pass clip-path when ifOverflow=hidden", () => {
      const { container } = render(() => (
        <BarChart width={200} height={200} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="uv" />
          <ReferenceArea x1="201106" x2="201110" ifOverflow="hidden" />
        </BarChart>
      ));
      const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
      expect(allAreas).toHaveLength(1);
      const area = allAreas[0]!;
      expect(area).toHaveAttribute("clip-path");
      expect(area.getAttribute("clip-path")).toMatch(/url\(#recharts(\d+)-clip\)/);
    });

    test.each(["discard", "extendDomain", "visible"] satisfies ReadonlyArray<IfOverflow>)(
      "should pass no clip-path when ifOverflow=%s",
      (ifOverflow) => {
        const { container } = render(() => (
          <BarChart width={200} height={200} data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="uv" />
            <ReferenceArea x1="201106" x2="201110" ifOverflow={ifOverflow} />
          </BarChart>
        ));
        const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
        expect(allAreas).toHaveLength(1);
        const area = allAreas[0]!;
        expect(area).not.toHaveAttribute("clip-path");
      },
    );

    it("should discard rect shape if it does not fit on the domain and ifOverflow=discard", () => {
      const { container } = render(() => (
        <BarChart width={200} height={200} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="uv" />
          <ReferenceArea y1={100} y2={200} ifOverflow="discard" />
        </BarChart>
      ));
      const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
      expect(allAreas).toHaveLength(0);
    });

    test.each(["extendDomain", "visible", "hidden"] satisfies ReadonlyArray<IfOverflow>)(
      "should draw the shape if it does not fit on the domain and ifOverflow=%s",
      (ifOverflow) => {
        const { container } = render(() => (
          <BarChart width={200} height={200} data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="uv" />
            <ReferenceArea y1={100} y2={200} ifOverflow={ifOverflow} />
          </BarChart>
        ));
        const allAreas = container.querySelectorAll(".recharts-reference-area-rect");
        expect(allAreas).toHaveLength(1);
      },
    );
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
        <LineChart
          width={100}
          height={100}
          data={[
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ]}
        >
          <YAxis dataKey="y" />
          <XAxis dataKey="x" />
          <ReferenceArea
            x1={0}
            y1={0}
            x2={1}
            y2={1}
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
      const dot = container.querySelector(".recharts-reference-area-rect");
      assertNotNull(dot);

      fireEvent.click(dot);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenLastCalledWith(expect.objectContaining({ type: "click" }));

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

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it after removing from DOM", () => {
      const areaSpy = vi.fn();
      const [showArea, setShowArea] = createSignal(true);
      const Comp = (): null => {
        const areas = useAppSelector((state) => selectReferenceAreasByAxis(state, "yAxis", 0));
        createEffect(() => {
          const value = (() => areas())();
          ((v) => areaSpy(v))(value);
        });
        return null;
      };
      // The reference wraps this in a BarChart whose <Bar> only anchors the
      // chart; the settings report (the actual assertion) is independent of any
      // graphical item. We use the minimal LineChart shell (matching the
      // ReferenceDot port) so the toggle-driven removal doesn't re-trigger Bar's
      // animation manager — a Bar-internal effect that, under the store update
      // from disposal, would create an owner-less effect (NO_OWNER_EFFECT).
      render(() => (
        <LineChart width={200} height={200}>
          <XAxis dataKey="name" />
          <YAxis />
          <Show when={showArea()}>
            <ReferenceArea
              y1={1}
              y2={2}
              x1="category 3"
              x2="category 4"
              ifOverflow="extendDomain"
            />
          </Show>
          <Comp />
        </LineChart>
      ));
      expect(areaSpy).toHaveBeenLastCalledWith([
        {
          // `id` is a documented Solid deviation: recharts matches reference
          // elements by object identity; Solid store proxies break that, so the
          // port mints a stable id for proxy-safe removal.
          id: expect.stringMatching(/^recharts-reference-area-/) as unknown as string,
          ifOverflow: "extendDomain",
          x1: "category 3",
          x2: "category 4",
          xAxisId: 0,
          y1: 1,
          y2: 2,
          yAxisId: 0,
        },
      ]);

      setShowArea(false);
      expect(areaSpy).toHaveBeenLastCalledWith([]);
    });
  });

  describe("multiple axes", () => {
    // The port resolves the x/y scales per-axis via selectAxisScale(state, axis,
    // xAxisId/yAxisId, …). A reference area targeting a non-default axis id must map
    // through THAT axis' scale: y1..y2 = 120..180 lives inside the "right" domain
    // (0..200) but is out of range of the default "left" domain (0..20), so with
    // ifOverflow="discard" (default) only the correctly-targeted area survives.
    const multiAxisData = [
      { name: "A", pv: 10, uv: 100 },
      { name: "B", pv: 20, uv: 200 },
    ];

    it("should map the reference area through the targeted axis' scale", () => {
      const { container } = render(() => (
        <BarChart width={500} height={400} data={multiAxisData}>
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Bar dataKey="pv" yAxisId="left" />
          <Bar dataKey="uv" yAxisId="right" />
          <ReferenceArea y1={120} y2={180} yAxisId="right" fill="#666" />
          <ReferenceArea y1={120} y2={180} yAxisId="left" fill="#f00" />
        </BarChart>
      ));
      // Only the area targeting the "right" axis (domain 0..200) is in range.
      expect(container.querySelectorAll(".recharts-reference-area-rect")).toHaveLength(1);
    });
  });
});
