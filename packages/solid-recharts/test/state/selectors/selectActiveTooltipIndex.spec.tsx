import { beforeEach, describe, it } from "vitest";
import { flush } from "solid-js";
import { fireEvent } from "@solidjs/testing-library";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { RadialBar, RadialBarChart, Tooltip } from "../../../src";
import { PageData } from "../../_data";
import { selectActiveTooltipIndex } from "../../../src/state/selectors/tooltipSelectors";
import { showTooltip } from "../../component/Tooltip/tooltipTestHelpers";
import { assertNotNull } from "../../helper/assertNotNull";
import { radialBarChartMouseHoverTooltipSelector } from "../../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("selectActiveTooltipIndex", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("in RadialChart", () => {
    describe("with default Tooltip", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={300} height={300} data={PageData}>
          <RadialBar dataKey="uv" isAnimationActive={false} />
          <Tooltip />
          {props.children}
        </RadialBarChart>
      ));

      it("should return undefined before any interaction", () => {
        const { spy } = renderTestCase(selectActiveTooltipIndex);
        expectLastCalledWith(spy, null);
      });

      it("should return index after mouse hover, and undefined again after mouse leave", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        showTooltip(container, ".recharts-radial-bar-sector");
        expectLastCalledWith(spy, "3");
        const wrapper = container.querySelector(".recharts-wrapper");
        assertNotNull(wrapper);
        fireEvent.mouseLeave(wrapper);
        flush();
        expectLastCalledWith(spy, null);
      });

      it("should return undefined after clicking on a sector", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = container.querySelector(".recharts-radial-bar-sector");
        assertNotNull(trigger);
        expectLastCalledWith(spy, null);
        fireEvent.click(trigger);
        flush();
        expectLastCalledWith(spy, null);
      });
    });

    describe("with defaultIndex=number", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={300} height={300} data={PageData}>
          <RadialBar dataKey="uv" isAnimationActive={false} />
          <Tooltip defaultIndex={0} />
          {props.children}
        </RadialBarChart>
      ));

      it("should return the default index before any interaction", () => {
        const { spy } = renderTestCase(selectActiveTooltipIndex);
        expectLastCalledWith(spy, "0");
      });

      it("should return mouse hover index after mouse hover, and undefined again after mouse leave", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = showTooltip(container, radialBarChartMouseHoverTooltipSelector);
        expectLastCalledWith(spy, "3");
        fireEvent.mouseLeave(trigger);
        flush();
        expectLastCalledWith(spy, null);
      });

      it("should return the default index after clicking on a sector", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = container.querySelector(".recharts-radial-bar-sector");
        assertNotNull(trigger);
        expectLastCalledWith(spy, "0");
        fireEvent.click(trigger);
        flush();
        expectLastCalledWith(spy, "0");
      });
    });

    describe("with shared=false", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={300} height={300} data={PageData}>
          <RadialBar dataKey="uv" isAnimationActive={false} />
          <Tooltip shared={false} />
          {props.children}
        </RadialBarChart>
      ));

      it("should return undefined before any interaction", () => {
        const { spy } = renderTestCase(selectActiveTooltipIndex);
        expectLastCalledWith(spy, null);
      });

      it("should return index after mouse hover, and undefined again after mouse leave", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = showTooltip(container, ".recharts-radial-bar-sector");
        expectLastCalledWith(spy, "0");
        fireEvent.mouseLeave(trigger);
        flush();
        expectLastCalledWith(spy, null);
      });

      it("should return undefined after clicking on a sector", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = container.querySelector(".recharts-radial-bar-sector");
        assertNotNull(trigger);
        expectLastCalledWith(spy, null);
        fireEvent.click(trigger);
        flush();
        expectLastCalledWith(spy, null);
      });
    });

    describe("with shared=false and defaultIndex=number", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={300} height={300} data={PageData}>
          <RadialBar dataKey="uv" isAnimationActive={false} />
          <Tooltip shared={false} defaultIndex={3} />
          {props.children}
        </RadialBarChart>
      ));

      it("should return the default index before any interaction", () => {
        const { spy } = renderTestCase(selectActiveTooltipIndex);
        expectLastCalledWith(spy, "3");
      });

      it("should return mouse hover index after mouse hover, and undefined again after mouse leave", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = showTooltip(container, ".recharts-radial-bar-sector");
        expectLastCalledWith(spy, "0");
        fireEvent.mouseLeave(trigger);
        flush();
        expectLastCalledWith(spy, null);
      });

      it("should return the default index after clicking on a sector", () => {
        const { container, spy } = renderTestCase(selectActiveTooltipIndex);
        const trigger = container.querySelector(".recharts-radial-bar-sector");
        assertNotNull(trigger);
        expectLastCalledWith(spy, "3");
        fireEvent.click(trigger);
        flush();
        expectLastCalledWith(spy, "3");
      });
    });

    describe("with trigger=click", () => {
      describe("without defaultIndex", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadialBarChart width={300} height={300} data={PageData}>
            <RadialBar dataKey="uv" isAnimationActive={false} />
            <Tooltip trigger="click" />
            {props.children}
          </RadialBarChart>
        ));

        it("should return undefined before any interaction", () => {
          const { spy } = renderTestCase(selectActiveTooltipIndex);
          expectLastCalledWith(spy, null);
        });

        it("should return index after clicking on a chart, and continue returning that index after clicking again", () => {
          const { container, spy } = renderTestCase(selectActiveTooltipIndex);
          const trigger = container.querySelector(radialBarChartMouseHoverTooltipSelector);
          assertNotNull(trigger);
          expectLastCalledWith(spy, null);
          fireEvent.click(trigger, { clientX: 200, clientY: 200 });
          flush();
          expectLastCalledWith(spy, "3");
          fireEvent.click(trigger, { clientX: 200, clientY: 200 });
          flush();
          expectLastCalledWith(spy, "3");
        });

        it("should return undefined after mouse hover", () => {
          const { container, spy } = renderTestCase(selectActiveTooltipIndex);
          const trigger = showTooltip(container, ".recharts-radial-bar-sector");
          expectLastCalledWith(spy, null);
          fireEvent.mouseLeave(trigger);
          flush();
          expectLastCalledWith(spy, null);
        });
      });

      describe("with defaultIndex=number", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadialBarChart width={300} height={300} data={PageData}>
            <RadialBar dataKey="uv" isAnimationActive={false} />
            <Tooltip trigger="click" defaultIndex={1} />
            {props.children}
          </RadialBarChart>
        ));

        it("should return the default index before any interaction", () => {
          const { spy } = renderTestCase(selectActiveTooltipIndex);
          expectLastCalledWith(spy, "1");
        });

        it("should return mouse hover index after clicking on the chart, and continue returning that index after clicking again", () => {
          const { container, spy } = renderTestCase(selectActiveTooltipIndex);
          const trigger = container.querySelector(radialBarChartMouseHoverTooltipSelector);
          assertNotNull(trigger);
          expectLastCalledWith(spy, "1");
          fireEvent.click(trigger, { clientX: 200, clientY: 200 });
          flush();
          expectLastCalledWith(spy, "3");
          fireEvent.click(trigger, { clientX: 200, clientY: 200 });
          flush();
          expectLastCalledWith(spy, "3");
        });

        it("should ignore mouse hover events", () => {
          const { container, spy } = renderTestCase(selectActiveTooltipIndex);
          const trigger = showTooltip(container, radialBarChartMouseHoverTooltipSelector);
          expectLastCalledWith(spy, "1");
          fireEvent.mouseLeave(trigger);
          flush();
          expectLastCalledWith(spy, "1");
        });
      });
    });
  });
});
