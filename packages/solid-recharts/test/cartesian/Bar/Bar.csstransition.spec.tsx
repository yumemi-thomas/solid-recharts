// Port of recharts 3.8.1 test/cartesian/Bar/Bar.csstransition.spec.tsx (commit 7a23854).
import type { JSX } from "@solidjs/web";
import { flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { generateMockData } from "../../_data";
import { Bar, BarChart, DefaultZIndexes, Tooltip, XAxis } from "../../../src";
import type { BarShapeProps } from "../../../src/cartesian/Bar";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectActiveBars, expectBars, type ExpectedBar } from "../../helper/expectBars";
import {
  hideTooltip,
  showTooltip,
  showTooltipOnCoordinate,
} from "../../component/Tooltip/tooltipTestHelpers";
import { barChartMouseHoverTooltipSelector } from "../../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectNthCalledWith } from "../../helper/expectLastCalledWith";
import { assertNotNull } from "../../helper/assertNotNull";
import { fireEvent } from "@solidjs/testing-library";

const expectedBars: ReadonlyArray<ExpectedBar> = [
  {
    d: "M 24.5,61.7 h 156 v 303.3 h -156 Z",
    height: "303.3",
    radius: "0",
    width: "156",
    x: "24.5",
    y: "61.7",
  },
  {
    d: "M 219.5,100.85 h 156 v 264.15 h -156 Z",
    height: "264.15",
    radius: "0",
    width: "156",
    x: "219.5",
    y: "100.85",
  },
];

function runPendingTimers(): void {
  vi.runOnlyPendingTimers();
  flush();
}

describe("Bar CSS transitions", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("width activeBar=false", () => {
    const renderTestCase = createSelectorTestCase(({ children }) => (
      <BarChart width={400} height={400} data={generateMockData(2, 10)}>
        <Bar dataKey="y" isAnimationActive={false} />
        <XAxis dataKey="x" />
        {children}
        <Tooltip />
      </BarChart>
    ));

    it("should ignore mouse events and only render inactive shapes - this is performance optimization", () => {
      const { container } = renderTestCase();

      expectBars(container, expectedBars);
      expectActiveBars(container, []);

      showTooltip(container, barChartMouseHoverTooltipSelector);

      expectBars(container, expectedBars);
      expectActiveBars(container, []);
    });
  });

  describe("width activeBar=true", () => {
    it("should render active shapes on mouse over to give it a chance to start its CSS transition", () => {
      const renderTestCase = createSelectorTestCase(({ children }) => (
        <BarChart width={400} height={400} data={generateMockData(2, 10)}>
          <Bar dataKey="y" isAnimationActive={false} activeBar />
          <XAxis dataKey="x" />
          {children}
          <Tooltip />
        </BarChart>
      ));

      const { container } = renderTestCase();

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);

      showTooltip(container, barChartMouseHoverTooltipSelector);

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);

      runPendingTimers();

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);

      hideTooltip(container, barChartMouseHoverTooltipSelector);

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);

      runPendingTimers();

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);

      const activeBarRect = container.querySelector(
        `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar path`,
      );
      assertNotNull(activeBarRect);
      fireEvent.transitionEnd(activeBarRect);
      flush();

      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.bar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);
    });

    it("should call the shape renderer with isActive=true for active bars", () => {
      const shapeSpy: Mock<(props: BarShapeProps, index?: string | number) => JSX.Element> =
        vi.fn();
      const renderTestCase = createSelectorTestCase(({ children }) => (
        <BarChart width={400} height={400} data={generateMockData(2, 10)}>
          <Bar dataKey="y" isAnimationActive={false} activeBar shape={shapeSpy} />
          <XAxis dataKey="x" />
          {children}
          <Tooltip />
        </BarChart>
      ));

      const { container } = renderTestCase();

      expect(shapeSpy).toHaveBeenCalledTimes(2);
      expectNthCalledWith(
        shapeSpy,
        1,
        expect.objectContaining({
          index: 0,
          isActive: false,
        }),
        0,
      );
      expectNthCalledWith(
        shapeSpy,
        2,
        expect.objectContaining({
          index: 1,
          isActive: false,
        }),
        1,
      );

      showTooltip(container, barChartMouseHoverTooltipSelector);

      /*
       * Solid re-renders inactive bars in originalDataIndex order (1 then 0) during
       * the enter-layer staging pass; React may interleave differently. All calls
       * remain isActive:false while the bar is in the active layer (reference
       * Bar.csstransition.spec.tsx L221–254).
       */
      expect(shapeSpy).toHaveBeenCalledTimes(4);
      expectNthCalledWith(
        shapeSpy,
        3,
        expect.objectContaining({
          index: 1,
          isActive: false,
        }),
        1,
      );

      expectNthCalledWith(
        shapeSpy,
        4,
        expect.objectContaining({
          index: 0,
          isActive: false,
        }),
        0,
      );

      hideTooltip(container, barChartMouseHoverTooltipSelector);
      flush();

      expect(shapeSpy).toHaveBeenCalledTimes(6);
      expectNthCalledWith(
        shapeSpy,
        5,
        expect.objectContaining({
          index: 1,
          isActive: false,
        }),
        1,
      );
      expectNthCalledWith(
        shapeSpy,
        6,
        expect.objectContaining({
          index: 0,
          isActive: false,
        }),
        0,
      );

      runPendingTimers();
      expect(shapeSpy).toHaveBeenCalledTimes(6);

      const lastTransitionEndProp = shapeSpy.mock.lastCall?.[0].onTransitionEnd;
      assertNotNull(lastTransitionEndProp);
      lastTransitionEndProp();
      flush();

      expect(shapeSpy).toHaveBeenCalledTimes(7);
    });

    it("should remove the old active layer bar when another bar becomes active", () => {
      const renderTestCase = createSelectorTestCase(({ children }) => (
        <BarChart width={400} height={400} data={generateMockData(2, 10)}>
          <Bar dataKey="y" isAnimationActive={false} activeBar />
          <XAxis dataKey="x" />
          {children}
          <Tooltip />
        </BarChart>
      ));
      const { container } = renderTestCase();

      showTooltip(container, barChartMouseHoverTooltipSelector);
      runPendingTimers();
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(0);

      showTooltipOnCoordinate(container, barChartMouseHoverTooltipSelector, {
        clientX: 300,
        clientY: 150,
      });
      runPendingTimers();
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-active-bar`,
        ),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(
          `.recharts-zIndex-layer_${DefaultZIndexes.activeBar} .recharts-inactive-bar`,
        ),
      ).toHaveLength(0);
    });
  });
});
