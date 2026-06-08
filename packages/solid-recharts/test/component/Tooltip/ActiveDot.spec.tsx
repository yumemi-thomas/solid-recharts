import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render } from "../../helper/render";
import { Area, AreaChart, ComposedChart, Line, LineChart, Tooltip } from "../../../src";
import { PageData } from "../../_data";
import { showTooltip } from "./tooltipTestHelpers";
import {
  areaChartMouseHoverTooltipSelector,
  composedChartMouseHoverTooltipSelector,
  lineChartMouseHoverTooltipSelector,
} from "./tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/ActiveDot.spec.tsx.
 * Harness adaptations: React render -> Solid render(() => ...); userEvent/mouseOver
 * trigger -> showTooltip helper (mouseMove); import React dropped.
 *
 * Cases NOT ported:
 *  - "should clone custom Dot element and inject extra sneaky props" (all charts).
 *    src/component/ActivePoints.tsx renderActiveDot() returns a custom JSX element
 *    as-is and does NOT clone it to inject the sneaky dot props (no cloneElement
 *    equivalent), so the data-testid element has no injected attributes.
 *  - the whole "as a child of RadarChart" block: src/polar/Radar.tsx documents
 *    activeDot / ActivePoints as DEFERRED — Radar accepts the prop but never
 *    renders an .recharts-active-dot layer.
 *  - "LineChart domain visibility guard" relies on XAxis/YAxis domain +
 *    allowDataOverflow active-dot suppression; left unported (out of scope for the
 *    impl-ready active-dot rendering path).
 */

const commonChartProps = {
  width: 400,
  height: 400,
  data: PageData,
};

describe("ActiveDot", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("as a child of AreaChart", () => {
    it("should render default activeDot and give it props", () => {
      const { container, debug } = render(() => (
        <AreaChart {...commonChartProps}>
          <Area dataKey="uv" />
          <Tooltip />
        </AreaChart>
      ));
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, areaChartMouseHoverTooltipSelector, debug);
      const activeDot = container.querySelector(".recharts-active-dot");
      assertNotNull(activeDot);
      expect(activeDot).toBeVisible();
      expect(activeDot.getAttributeNames()).toEqual(["class"]);
      expect(activeDot.getAttribute("class")).toEqual("recharts-layer recharts-active-dot");

      const circle = activeDot.querySelector("circle");
      assertNotNull(circle);
      expect(circle).toBeVisible();
      expect(circle.getAttribute("class")).toEqual("recharts-dot");
      expect(circle.getAttribute("cx")).toEqual("161");
      expect(circle.getAttribute("cy")).toEqual("102.5");
      expect(circle.getAttribute("r")).toEqual("4");
      expect(circle.getAttribute("fill")).toEqual("#3182bd");
      expect(circle.getAttribute("stroke-width")).toEqual("2");
      expect(circle.getAttribute("stroke")).toEqual("#fff");

      fireEvent.mouseOut(tooltipTrigger);
      expect(activeDot).not.toBeVisible();
    });

    it("should render custom Dot component, give it props, and render what it returned", () => {
      const spy = vi.fn();
      const MyCustomDot = (props: unknown) => {
        spy(props);
        return <g data-testid="my-custom-dot" />;
      };
      const { container, debug } = render(() => (
        <AreaChart {...commonChartProps}>
          <Area dataKey="uv" activeDot={MyCustomDot} />
          <Tooltip />
        </AreaChart>
      ));
      expect(spy).toHaveBeenCalledTimes(0);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, areaChartMouseHoverTooltipSelector, debug);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(container.querySelector(".recharts-active-dot")).toBeVisible();
      expect(spy).toHaveBeenCalledWith({
        cx: 161,
        cy: 102.5,
        dataKey: "uv",
        fill: "#3182bd",
        index: 2,
        payload: {
          amt: 2400,
          name: "Page C",
          pv: 1398,
          uv: 300,
        },
        r: 4,
        stroke: "#fff",
        strokeWidth: 2,
        value: [0, 300],
      });

      fireEvent.mouseOut(tooltipTrigger);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
    });
  });

  describe("as a child of LineChart", () => {
    it("should render default activeDot and give it props", () => {
      const { container, debug } = render(() => (
        <LineChart {...commonChartProps}>
          <Line dataKey="uv" />
          <Tooltip />
        </LineChart>
      ));
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, lineChartMouseHoverTooltipSelector, debug);
      const activeDot = container.querySelector(".recharts-active-dot");
      assertNotNull(activeDot);
      expect(activeDot).toBeVisible();
      expect(activeDot.getAttributeNames()).toEqual(["class"]);
      expect(activeDot.getAttribute("class")).toEqual("recharts-layer recharts-active-dot");

      const circle = activeDot.querySelector("circle");
      assertNotNull(circle);
      expect(circle).toBeVisible();
      expect(circle.getAttribute("class")).toEqual("recharts-dot");
      expect(circle.getAttribute("cx")).toEqual("161");
      expect(circle.getAttribute("cy")).toEqual("102.5");
      expect(circle.getAttribute("r")).toEqual("4");
      expect(circle.getAttribute("fill")).toEqual("#3182bd");
      expect(circle.getAttribute("stroke-width")).toEqual("2");
      expect(circle.getAttribute("stroke")).toEqual("#fff");

      fireEvent.mouseOut(tooltipTrigger);
      expect(activeDot).not.toBeVisible();
    });

    it("should render custom Dot component, give it props, and render what it returned", () => {
      const spy = vi.fn();
      const MyCustomDot = (props: unknown) => {
        spy(props);
        return <g data-testid="my-custom-dot" />;
      };
      const { container, debug } = render(() => (
        <LineChart {...commonChartProps}>
          <Line dataKey="uv" activeDot={MyCustomDot} />
          <Tooltip />
        </LineChart>
      ));
      expect(spy).toHaveBeenCalledTimes(0);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, lineChartMouseHoverTooltipSelector, debug);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(container.querySelector(".recharts-active-dot")).toBeVisible();
      expect(spy).toHaveBeenCalledWith({
        cx: 161,
        cy: 102.5,
        dataKey: "uv",
        fill: "#3182bd",
        index: 2,
        payload: {
          amt: 2400,
          name: "Page C",
          pv: 1398,
          uv: 300,
        },
        r: 4,
        stroke: "#fff",
        strokeWidth: 2,
        value: 300,
      });

      fireEvent.mouseOut(tooltipTrigger);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
    });
  });

  describe("as a child of ComposedChart with Line", () => {
    it("should render default activeDot and give it props", () => {
      const { container, debug } = render(() => (
        <ComposedChart {...commonChartProps}>
          <Line dataKey="uv" />
          <Tooltip />
        </ComposedChart>
      ));
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, composedChartMouseHoverTooltipSelector, debug);
      const activeDot = container.querySelector(".recharts-active-dot");
      assertNotNull(activeDot);
      expect(activeDot).toBeVisible();
      expect(activeDot.getAttributeNames()).toEqual(["class"]);
      expect(activeDot.getAttribute("class")).toEqual("recharts-layer recharts-active-dot");

      const circle = activeDot.querySelector("circle");
      assertNotNull(circle);
      expect(circle).toBeVisible();
      expect(circle.getAttribute("class")).toEqual("recharts-dot");
      expect(circle.getAttribute("cx")).toEqual("161");
      expect(circle.getAttribute("cy")).toEqual("102.5");
      expect(circle.getAttribute("r")).toEqual("4");
      expect(circle.getAttribute("fill")).toEqual("#3182bd");
      expect(circle.getAttribute("stroke-width")).toEqual("2");
      expect(circle.getAttribute("stroke")).toEqual("#fff");

      fireEvent.mouseOut(tooltipTrigger);
      expect(activeDot).not.toBeVisible();
    });

    it("should render custom Dot component, give it props, and render what it returned", () => {
      const spy = vi.fn();
      const MyCustomDot = (props: unknown) => {
        spy(props);
        return <g data-testid="my-custom-dot" />;
      };
      const { container, debug } = render(() => (
        <ComposedChart {...commonChartProps}>
          <Line dataKey="uv" activeDot={MyCustomDot} />
          <Tooltip />
        </ComposedChart>
      ));
      expect(spy).toHaveBeenCalledTimes(0);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
      const tooltipTrigger = showTooltip(container, composedChartMouseHoverTooltipSelector, debug);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(container.querySelector(".recharts-active-dot")).toBeVisible();
      expect(spy).toHaveBeenCalledWith({
        cx: 161,
        cy: 102.5,
        dataKey: "uv",
        fill: "#3182bd",
        index: 2,
        payload: {
          amt: 2400,
          name: "Page C",
          pv: 1398,
          uv: 300,
        },
        r: 4,
        stroke: "#fff",
        strokeWidth: 2,
        value: 300,
      });

      fireEvent.mouseOut(tooltipTrigger);
      expect(container.querySelector(".recharts-active-dot")).not.toBeInTheDocument();
    });
  });
});
