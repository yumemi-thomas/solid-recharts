// Ported from recharts 3.8.1 test/chart/AccessibilityLayer.spec.tsx (commit
// 7a23854). Solid deviations: this first batch covers root SVG accessibility
// attributes for AreaChart/PieChart/FunnelChart; keyboard navigation cases are
// covered by dedicated local Tooltip keyboard specs and remain tracked here.

import { describe, expect, test, vi } from "vitest";
import {
  Area,
  AreaChart,
  Funnel,
  FunnelChart,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "../../src";
import { PageData } from "../_data";
import {
  expectTooltipNotVisible,
  expectTooltipPayload,
  getTooltip,
} from "../component/Tooltip/tooltipTestHelpers";
import { assertNotNull } from "../helper/assertNotNull";
import { fireEvent, render } from "@solidjs/testing-library";

function assertChartA11yAttributes(svg: Element): void {
  expect(svg).not.toBeNull();
  expect(svg).not.toBeUndefined();
  expect(svg).toHaveAttribute("role", "application");
  expect(svg).toHaveAttribute("tabindex", "0");
}

function assertNoA11yAttributes(svg: Element): void {
  expect(svg).not.toBeNull();
  expect(svg).not.toBeUndefined();
  expect(svg).not.toHaveAttribute("role");
  expect(svg).not.toHaveAttribute("tabindex");
}

function getMainSurface(container: HTMLElement | SVGElement): HTMLElement | SVGElement {
  const mainSurface = container.querySelector(
    "svg.recharts-surface:not(.recharts-default-legend svg.recharts-surface)",
  );
  assertNotNull(mainSurface);
  if (!(mainSurface instanceof HTMLElement || mainSurface instanceof SVGElement)) {
    throw new Error("Main surface is not an HTMLElement or SVGElement");
  }
  return mainSurface;
}

function getWrapper(container: HTMLElement): HTMLElement {
  const wrapper = container.querySelector(".recharts-wrapper");
  assertNotNull(wrapper);
  if (!(wrapper instanceof HTMLElement)) {
    throw new Error("Chart wrapper is not an HTMLElement");
  }
  return wrapper;
}

function focusChart(container: HTMLElement): HTMLElement {
  const wrapper = getWrapper(container);
  fireEvent.focus(wrapper);
  return wrapper;
}

function blurChart(container: HTMLElement): void {
  fireEvent.blur(getWrapper(container));
}

function arrowRight(container: HTMLElement): void {
  fireEvent.keyDown(getWrapper(container), { key: "ArrowRight" });
}

function arrowLeft(container: HTMLElement): void {
  fireEvent.keyDown(getWrapper(container), { key: "ArrowLeft" });
}

function assertNoKeyboardInteractions(container: HTMLElement): void {
  assertNoA11yAttributes(getMainSurface(container));
  expectTooltipNotVisible(container);
  focusChart(container);
  expectTooltipNotVisible(container);
  arrowRight(container);
  expectTooltipNotVisible(container);
  arrowLeft(container);
  expectTooltipNotVisible(container);
}

describe.each([true, undefined])(
  "AccessibilityLayer with accessibilityLayer=%s",
  (accessibilityLayer) => {
    describe("AreaChart horizontal", () => {
      test("Add tabindex and role to the svg element", () => {
        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
          </AreaChart>
        ));

        const svg = container.querySelector("svg");
        assertNotNull(svg);
        assertChartA11yAttributes(svg);
      });

      test("When chart receives focus, show the tooltip for the first point", () => {
        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
            <XAxis dataKey="name" />
            <YAxis />
          </AreaChart>
        ));

        expectTooltipNotVisible(container);
        focusChart(container);
        expectTooltipPayload(container, "Page A", ["uv : 400"]);
      });

      test("accessibilityLayer works, even without *Axis elements", () => {
        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
          </AreaChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip.textContent).toBe("");

        focusChart(container);
        expect(tooltip).toHaveTextContent("uv : 400");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("uv : 300");
      });

      test("Chart updates when it receives left/right arrow keystrokes", () => {
        const mockMouseMovements = vi.fn();

        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
            onMouseMove={mockMouseMovements}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
            <XAxis dataKey="name" />
            <YAxis />
          </AreaChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip.textContent).toBe("");

        focusChart(container);
        expect(tooltip).toHaveTextContent("Page A");

        const cursor = container.querySelector(".recharts-tooltip-cursor");
        assertNotNull(cursor);

        arrowLeft(container);
        const cursorPathA = cursor.getAttribute("d");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page B");
        const cursorPathB = cursor.getAttribute("d");
        expect(cursorPathA).not.toEqual(cursorPathB);

        arrowRight(container);
        arrowRight(container);
        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page E");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page F");

        arrowLeft(container);
        expect(tooltip).toHaveTextContent("Page E");

        fireEvent.keyDown(getWrapper(container), { key: "a" });
        expect(tooltip).toHaveTextContent("Page E");
        expect(mockMouseMovements).toHaveBeenCalledTimes(0);
      });

      test("Tooltip closes when chart loses focus", () => {
        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
            <XAxis dataKey="name" />
            <YAxis />
          </AreaChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip.textContent).toBe("");

        focusChart(container);
        expect(tooltip).toHaveTextContent("Page A");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page B");

        blurChart(container);
        expect(tooltip.textContent).toBe("");
      });

      test("Left/right arrow pays attention to if the XAxis is reversed", () => {
        const mockMouseMovements = vi.fn();

        const { container } = render(() => (
          <AreaChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
            onMouseMove={mockMouseMovements}
          >
            <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
            <XAxis dataKey="name" reversed />
            <YAxis />
          </AreaChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip.textContent).toBe("");

        focusChart(container);
        expect(tooltip).toHaveTextContent("Page A");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page A");

        arrowLeft(container);
        expect(tooltip).toHaveTextContent("Page B");

        arrowLeft(container);
        arrowLeft(container);
        arrowLeft(container);
        expect(tooltip).toHaveTextContent("Page E");

        arrowLeft(container);
        expect(tooltip).toHaveTextContent("Page F");

        arrowRight(container);
        expect(tooltip).toHaveTextContent("Page E");

        fireEvent.keyDown(getWrapper(container), { key: "a" });
        expect(tooltip).toHaveTextContent("Page E");
        expect(mockMouseMovements).toHaveBeenCalledTimes(0);
      });
    });

    describe("PieChart", () => {
      test("Add tabindex and role to the svg element", () => {
        const { container } = render(() => (
          <PieChart width={100} height={50} accessibilityLayer={accessibilityLayer}>
            <Pie data={PageData} dataKey="uv" />
          </PieChart>
        ));

        const svg = getMainSurface(container);
        assertChartA11yAttributes(svg);
      });

      test("When chart receives focus, show the tooltip for the first sector", () => {
        const { container } = render(() => (
          <PieChart width={500} height={500} accessibilityLayer={accessibilityLayer}>
            <Pie isAnimationActive={false} data={PageData} dataKey="uv" />
            <Tooltip />
          </PieChart>
        ));

        expectTooltipNotVisible(container);
        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);
      });

      test("Arrow keys navigate between sectors", () => {
        const { container } = render(() => (
          <PieChart width={500} height={500} accessibilityLayer={accessibilityLayer}>
            <Pie isAnimationActive={false} data={PageData} dataKey="uv" />
            <Tooltip />
          </PieChart>
        ));

        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page B : 300"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page C : 300"]);

        arrowLeft(container);
        expectTooltipPayload(container, "", ["Page B : 300"]);

        arrowLeft(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);
      });

      test("Arrow keys stop at boundaries", () => {
        const { container } = render(() => (
          <PieChart width={500} height={500} accessibilityLayer={accessibilityLayer}>
            <Pie isAnimationActive={false} data={PageData} dataKey="uv" />
            <Tooltip />
          </PieChart>
        ));

        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);

        arrowLeft(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);

        for (let i = 0; i < PageData.length - 1; i++) {
          arrowRight(container);
        }
        expectTooltipPayload(container, "", ["Page F : 189"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page F : 189"]);
      });

      test("Tooltip closes when PieChart loses focus", () => {
        const { container } = render(() => (
          <PieChart width={500} height={500} accessibilityLayer={accessibilityLayer}>
            <Pie isAnimationActive={false} data={PageData} dataKey="uv" />
            <Tooltip />
          </PieChart>
        ));

        expectTooltipNotVisible(container);

        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page B : 300"]);

        blurChart(container);
        expect(getTooltip(container).textContent).toBe("");
      });
    });

    describe("FunnelChart", () => {
      test("Add tabindex and role to the svg element", () => {
        const { container } = render(() => (
          <FunnelChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Funnel dataKey="uv" stroke="#ff7300" fill="#ff7300" />
          </FunnelChart>
        ));

        const svg = getMainSurface(container);
        assertChartA11yAttributes(svg);
      });

      test("When chart receives focus, show the tooltip for the first segment", () => {
        const { container } = render(() => (
          <FunnelChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
          >
            <Funnel dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
          </FunnelChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip).toHaveTextContent("");

        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);
      });

      test("Chart updates when it receives left/right arrow keystrokes", () => {
        const mockMouseMovements = vi.fn();

        const { container } = render(() => (
          <FunnelChart
            width={100}
            height={50}
            data={PageData}
            accessibilityLayer={accessibilityLayer}
            onMouseMove={mockMouseMovements}
          >
            <Funnel dataKey="uv" stroke="#ff7300" fill="#ff7300" />
            <Tooltip />
            <Legend />
          </FunnelChart>
        ));

        const tooltip = getTooltip(container);
        expect(tooltip).toHaveTextContent("");
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        focusChart(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        arrowLeft(container);
        expectTooltipPayload(container, "", ["Page A : 400"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page B : 300"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page C : 300"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page D : 200"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page E : 278"]);

        arrowRight(container);
        expectTooltipPayload(container, "", ["Page F : 189"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        arrowLeft(container);
        expectTooltipPayload(container, "", ["Page E : 278"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);

        fireEvent.keyDown(getWrapper(container), { key: "a" });
        expectTooltipPayload(container, "", ["Page E : 278"]);
        expect(mockMouseMovements.mock.instances).toHaveLength(0);
      });
    });
  },
);

describe("AccessibilityLayer with accessibilityLayer=false", () => {
  const accessibilityLayer = false;

  describe("AreaChart", () => {
    test("does not add tabindex and role to the svg element", () => {
      const { container } = render(() => (
        <AreaChart width={100} height={50} data={PageData} accessibilityLayer={accessibilityLayer}>
          <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
        </AreaChart>
      ));

      const svg = getMainSurface(container);
      assertNoA11yAttributes(svg);
    });

    test("does not show tooltip using keyboard", () => {
      const { container } = render(() => (
        <AreaChart width={100} height={50} data={PageData} accessibilityLayer={accessibilityLayer}>
          <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
          <Tooltip />
          <Legend />
          <XAxis dataKey="name" />
          <YAxis />
        </AreaChart>
      ));

      assertNoKeyboardInteractions(container);
    });
  });

  describe("FunnelChart", () => {
    test("does not add tabindex and role to the svg element", () => {
      const { container } = render(() => (
        <FunnelChart
          width={100}
          height={50}
          data={PageData}
          accessibilityLayer={accessibilityLayer}
        >
          <Funnel dataKey="uv" stroke="#ff7300" fill="#ff7300" />
        </FunnelChart>
      ));

      const svg = getMainSurface(container);
      assertNoA11yAttributes(svg);
    });

    test("does not show tooltip using keyboard", () => {
      const { container } = render(() => (
        <FunnelChart
          width={100}
          height={50}
          data={PageData}
          accessibilityLayer={accessibilityLayer}
        >
          <Funnel dataKey="uv" stroke="#ff7300" fill="#ff7300" />
          <Tooltip />
          <Legend />
        </FunnelChart>
      ));

      assertNoKeyboardInteractions(container);
    });
  });

  describe("PieChart", () => {
    test("does not tabindex and role to the svg element", () => {
      const { container } = render(() => (
        <PieChart width={100} height={50} accessibilityLayer={accessibilityLayer}>
          <Pie data={PageData} dataKey="uv" />
        </PieChart>
      ));

      const svg = getMainSurface(container);
      assertNoA11yAttributes(svg);
    });

    test("does not show tooltip using keyboard", () => {
      const { container } = render(() => (
        <PieChart width={100} height={50} accessibilityLayer={accessibilityLayer}>
          <Pie dataKey="uv" data={PageData} />
          <Tooltip />
        </PieChart>
      ));

      assertNoKeyboardInteractions(container);
    });
  });
});
