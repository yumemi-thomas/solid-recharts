import { beforeEach, describe, expect, it } from "vitest";
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { fireEvent, render } from "@solidjs/testing-library";
import { PageData } from "../../_data";
import { getTooltip, hideTooltip, showTooltip } from "./tooltipTestHelpers";
import {
  Bar,
  BarChart,
  Funnel,
  FunnelChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  Tooltip,
} from "../../../src";
import {
  barChartItemMouseHoverTooltipSelector,
  barChartMouseHoverTooltipSelector,
  funnelChartMouseHoverTooltipSelector,
  pieChartMouseHoverTooltipSelector,
  radialBarMouseHoverTooltipSelector,
  scatterChartMouseHoverTooltipSelector,
} from "./tooltipMouseHoverSelectors";
import { TooltipTrigger } from "../../../src/chart/types";
import { assertNotNull } from "../../helper/assertNotNull";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/tooltipEventType.spec.tsx.
 * Solid adaptations: render(() => …); Component takes props (no destructure);
 * flush() after each raw fireEvent (Solid defers reactive propagation); userEvent
 * .hover replaced with fireEvent.mouseOver. Item-hover interactions go through the
 * mouseMove+mouseEnter showTooltip helper (the port's surface listens for mouseMove,
 * per-item Layers for the non-bubbling mouseEnter).
 */

type TooltipTriggerProps = { tooltipTrigger: TooltipTrigger | undefined };

type TooltipEventTypeTestCase = {
  testName: string;
  Component: (props: TooltipTriggerProps) => JSX.Element;
};

type TooltipEventTypeItemTestCase = TooltipEventTypeTestCase & {
  itemSelector: string;
};

const axisTestCases: ReadonlyArray<TooltipEventTypeTestCase> = [
  {
    testName: "BarChart",
    Component: (props) => (
      <BarChart width={500} height={500} data={PageData}>
        <Bar isAnimationActive={false} dataKey="uv" />
        <Tooltip trigger={props.tooltipTrigger} />
      </BarChart>
    ),
  },
  {
    testName: "RadialBarChart",
    Component: (props) => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar dataKey="uv" />
        <Tooltip trigger={props.tooltipTrigger} />
      </RadialBarChart>
    ),
  },
];

const itemTestCases: ReadonlyArray<TooltipEventTypeItemTestCase> = [
  {
    testName: "BarChart Bar with tooltip.shared=false",
    Component: (props) => (
      <BarChart width={500} height={500} data={PageData}>
        <Bar isAnimationActive={false} dataKey="uv" />
        <Tooltip shared={false} trigger={props.tooltipTrigger} />
      </BarChart>
    ),
    itemSelector: barChartItemMouseHoverTooltipSelector,
  },
  {
    // This is a special case - Bar shows tooltip when rendering over its background, too.
    testName: "BarChart Background with tooltip.shared=false",
    Component: (props) => (
      <BarChart width={500} height={500} data={PageData}>
        <Bar isAnimationActive={false} dataKey="uv" background={{ stroke: "red" }} />
        <Tooltip shared={false} trigger={props.tooltipTrigger} />
      </BarChart>
    ),
    itemSelector: ".recharts-bar-background-rectangle",
  },
  {
    testName: "FunnelChart",
    Component: (props) => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="uv" data={PageData} />
        <Tooltip trigger={props.tooltipTrigger} />
      </FunnelChart>
    ),
    itemSelector: funnelChartMouseHoverTooltipSelector,
  },
  {
    testName: "PieChart",
    Component: (props) => (
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
        <Tooltip trigger={props.tooltipTrigger} />
      </PieChart>
    ),
    itemSelector: pieChartMouseHoverTooltipSelector,
  },
  {
    testName: "ScatterChart",
    Component: (props) => (
      <ScatterChart width={500} height={500}>
        <Scatter data={PageData} dataKey="uv" />
        <Tooltip trigger={props.tooltipTrigger} />
      </ScatterChart>
    ),
    itemSelector: scatterChartMouseHoverTooltipSelector,
  },
  {
    testName: "RadialBarChart with shared=false",
    Component: (props) => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar dataKey="uv" isAnimationActive={false} />
        <Tooltip shared={false} trigger={props.tooltipTrigger} />
      </RadialBarChart>
    ),
    itemSelector: radialBarMouseHoverTooltipSelector,
  },
];

describe("tooltipEventType", () => {
  describe.each(axisTestCases.concat(itemTestCases))(
    "basic assumptions in $testName",
    ({ Component }) => {
      describe.each(["hover", "click", undefined] as const)("trigger=%s", (tooltipTrigger) => {
        it("should not display any tooltip before user interaction", () => {
          const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);
          const tooltip = getTooltip(container);
          expect(tooltip).not.toBeVisible();
        });

        it("should render chart area", () => {
          const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);
          expect(container.querySelector(".recharts-wrapper")).not.toBeNull();
          expect(container.querySelector(".recharts-wrapper")).toBeVisible();
        });
      });
    },
  );

  describe.each(axisTestCases)("axis in $testName", ({ Component }) => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 100, height: 100 });
    });

    describe.each(["hover", undefined] as const)("trigger=%s", (tooltipTrigger) => {
      it("should display tooltip when hovering over chart area, and hide it on mouse out", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);
        const tooltip = getTooltip(container);

        showTooltip(container, barChartMouseHoverTooltipSelector);

        expect(tooltip).toBeVisible();

        hideTooltip(container, barChartMouseHoverTooltipSelector);

        expect(tooltip).not.toBeVisible();
      });

      it("should not react to mouse clicks", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);
        expect(tooltip).not.toBeVisible();

        const trigger = container.querySelector(".recharts-wrapper");
        assertNotNull(trigger);

        fireEvent.click(trigger, { clientX: 200, clientY: 200 });
        flush();

        expect(tooltip).not.toBeVisible();
      });
    });

    describe("trigger=click", () => {
      const tooltipTrigger = "click";
      it("should display tooltip when clicking anywhere on the chart, and keep it there when clicking again", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);
        expect(tooltip).not.toBeVisible();

        const trigger = container.querySelector(".recharts-wrapper");
        assertNotNull(trigger);

        fireEvent.click(trigger, { clientX: 200, clientY: 200 });
        flush();

        expect(tooltip).toBeVisible();

        fireEvent.click(trigger, { clientX: 200, clientY: 200 });
        flush();

        expect(tooltip).toBeVisible();
      });

      it("should not react to mouse over", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);
        expect(tooltip).not.toBeVisible();

        const trigger = container.querySelector(".recharts-wrapper");
        assertNotNull(trigger);

        fireEvent.mouseOver(trigger, { clientX: 200, clientY: 200 });
        flush();

        expect(tooltip).not.toBeVisible();
      });
    });
  });

  describe.each(itemTestCases)("item in $testName", ({ Component, itemSelector }) => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 100, height: 100 });
    });

    describe.each(["hover", "click", undefined] as const)("trigger=%s", (tooltipTrigger) => {
      it("should render some items with given selector", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);
        expect(container.querySelector(itemSelector)).not.toBeNull();
        expect(container.querySelector(itemSelector)).toBeVisible();
      });

      it("should not react to mouse clicks or hovers on chart area", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);

        const trigger = container.querySelector(".recharts-wrapper");
        assertNotNull(trigger);

        fireEvent.click(trigger, { clientX: 200, clientY: 200 });
        flush();
        expect(tooltip).not.toBeVisible();

        fireEvent.mouseOver(trigger, { clientX: 200, clientY: 200 });
        flush();
        expect(tooltip).not.toBeVisible();
      });
    });

    describe.each(["hover", undefined] as const)("trigger=%s", (tooltipTrigger) => {
      it("should display tooltip when hovering over the item element", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);
        expect(tooltip).not.toBeVisible();

        showTooltip(container, itemSelector, undefined, false);
        expect(tooltip).toBeVisible();

        // this is needed for bar background - for some reason it needs to select the trigger twice, otherwise mouseOut does not dismiss the tooltip
        const trigger2 = container.querySelector(itemSelector);
        assertNotNull(trigger2);
        fireEvent.mouseOut(trigger2);
        fireEvent.mouseLeave(trigger2);
        flush();
        expect(tooltip).not.toBeVisible();
      });

      it("should not react to mouse clicks on the item", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);
        expect(tooltip).not.toBeVisible();

        const trigger = container.querySelector(itemSelector);
        assertNotNull(trigger);

        fireEvent.click(trigger, { clientX: 200, clientY: 200 });
        flush();
        expect(tooltip).not.toBeVisible();
      });
    });

    describe("trigger=click", () => {
      const tooltipTrigger = "click";
      it("should display tooltip when clicking on the item element, and keep it there on second click too, and after mouse over too", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);

        const trigger = container.querySelector(itemSelector);
        assertNotNull(trigger);

        fireEvent.click(trigger, { clientX: 20, clientY: 20 });
        flush();
        expect(tooltip).toBeVisible();

        fireEvent.click(trigger, { clientX: 20, clientY: 20 });
        flush();
        expect(tooltip).toBeVisible();

        fireEvent.mouseLeave(trigger);
        flush();
        expect(tooltip).toBeVisible();

        fireEvent.mouseLeave(container);
        flush();
        expect(tooltip).toBeVisible();
      });

      it("should not react to mouse hover on the item", () => {
        const { container } = render(() => <Component tooltipTrigger={tooltipTrigger} />);

        const tooltip = getTooltip(container);

        const trigger = container.querySelector(itemSelector);
        assertNotNull(trigger);

        fireEvent.mouseOver(trigger, { clientX: 20, clientY: 20 });
        flush();
        expect(tooltip).not.toBeVisible();
      });
    });
  });
});
