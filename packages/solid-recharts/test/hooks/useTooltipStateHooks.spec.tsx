// Solid-recharts spec for the public tooltip-state hooks that recharts exposes
// from its main entry but does not unit-test directly: useActiveTooltipLabel,
// useIsTooltipActive, useActiveTooltipCoordinate. Behaviour is anchored to the
// same hover/leave fixtures the useActiveTooltipDataPoints spec uses.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Area,
  AreaChart,
  Tooltip,
  XAxis,
  useActiveTooltipCoordinate,
  useActiveTooltipLabel,
  useIsTooltipActive,
} from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { PageData } from "../_data";
import { hideTooltip, showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { areaChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { render } from "@solidjs/testing-library";

describe("public tooltip-state hooks", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("when called outside of a chart", () => {
    it("useActiveTooltipLabel returns undefined", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        spy(useActiveTooltipLabel()());
        return null;
      };
      render(() => <Comp />);
      expectLastCalledWith(spy, undefined);
    });

    it("useIsTooltipActive returns false", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        spy(useIsTooltipActive()());
        return null;
      };
      render(() => <Comp />);
      expectLastCalledWith(spy, false);
    });

    it("useActiveTooltipCoordinate returns undefined", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        spy(useActiveTooltipCoordinate()());
        return null;
      };
      render(() => <Comp />);
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("as a child of AreaChart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <AreaChart width={400} height={400} data={PageData}>
        <Area dataKey="pv" />
        <XAxis dataKey="name" />
        <Tooltip />
        {props.children}
      </AreaChart>
    ));

    describe("useActiveTooltipLabel", () => {
      it("is undefined before interaction, the category after hover, undefined after leave", () => {
        const { container, spy } = renderTestCase(useActiveTooltipLabel);
        expectLastCalledWith(spy, undefined);

        showTooltip(container, areaChartMouseHoverTooltipSelector);
        expectLastCalledWith(spy, "Page C");

        hideTooltip(container, areaChartMouseHoverTooltipSelector);
        expectLastCalledWith(spy, undefined);
      });
    });

    describe("useIsTooltipActive", () => {
      it("is false before interaction, true after hover, false after leave", () => {
        const { container, spy } = renderTestCase(useIsTooltipActive);
        expectLastCalledWith(spy, false);

        showTooltip(container, areaChartMouseHoverTooltipSelector);
        expectLastCalledWith(spy, true);

        hideTooltip(container, areaChartMouseHoverTooltipSelector);
        expectLastCalledWith(spy, false);
      });
    });

    describe("useActiveTooltipCoordinate", () => {
      it("is undefined before interaction and a numeric coordinate after hover", () => {
        const { container, spy } = renderTestCase(useActiveTooltipCoordinate);
        expectLastCalledWith(spy, undefined);

        showTooltip(container, areaChartMouseHoverTooltipSelector);
        const coordinate = spy.mock.lastCall?.[0];
        expect(coordinate).toBeDefined();
        expect(typeof coordinate.x).toBe("number");
        expect(typeof coordinate.y).toBe("number");
      });
    });
  });
});
