// Ported from recharts 3.8.1 test/hooks/useActiveTooltipDataPoints.spec.tsx (commit 7a23854).
// Solid deviations: hooks return Accessors; createSelectorTestCase spies the
// accessor value; exact React render-count assertions are relaxed to value parity.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  Line,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  useActiveTooltipDataPoints,
} from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { PageData } from "../_data";
import {
  hideTooltip,
  showTooltip,
  showTooltipClick,
} from "../component/Tooltip/tooltipTestHelpers";
import {
  areaChartMouseHoverTooltipSelector,
  composedChartMouseHoverTooltipSelector,
  scatterChartMouseHoverTooltipSelector,
} from "../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { render } from "@solidjs/testing-library";

describe("useActiveTooltipDataPoints", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("when called outside of a chart", () => {
    it("should return undefined", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const result = useActiveTooltipDataPoints();
        spy(result());
        return null;
      };
      render(() => <Comp />);
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("as a child of AreaChart", () => {
    describe("without Tooltip element", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <AreaChart width={400} height={400} data={PageData}>
          <Area dataKey="pv" />
          {props.children}
        </AreaChart>
      ));

      it("should return undefined before any interactions", () => {
        const { spy } = renderTestCase(useActiveTooltipDataPoints);
        expectLastCalledWith(spy, undefined);
      });

      it("should return data point after mouse hover", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should again return undefined after mouse leave", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);
        hideTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, undefined);
      });

      it("should return undefined after click", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltipClick(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, undefined);
      });
    });

    describe("with defaultIndex", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <AreaChart width={400} height={400} data={PageData}>
          <Area dataKey="pv" />
          <Tooltip defaultIndex={1} />
          {props.children}
        </AreaChart>
      ));

      it("should return data point before any interactions", () => {
        const { spy } = renderTestCase(useActiveTooltipDataPoints);
        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page B",
            pv: 4567,
            uv: 300,
          },
        ]);
      });

      it("should return new data point after mouse hover", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should return undefined after mouse leave", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);
        hideTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, undefined);
      });

      it("should return the defaultIndex data point after click", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltipClick(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page B",
            pv: 4567,
            uv: 300,
          },
        ]);
      });
    });

    describe("with trigger=hover and active=true", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <AreaChart width={400} height={400} data={PageData}>
          <Area dataKey="pv" />
          <Tooltip trigger="hover" active />
          {props.children}
        </AreaChart>
      ));

      it("should return undefined before any interactions", () => {
        const { spy } = renderTestCase(useActiveTooltipDataPoints);
        expectLastCalledWith(spy, undefined);
      });

      it("should return data point after hover", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should continue returning the same payload after mouse leave", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);
        hideTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should return undefined after click", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltipClick(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, undefined);
      });
    });

    describe("with Tooltip trigger=click", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <AreaChart width={400} height={400} data={PageData}>
          <Area dataKey="pv" />
          <Tooltip trigger="click" />
          {props.children}
        </AreaChart>
      ));

      it("should return undefined before any interactions", () => {
        const { spy } = renderTestCase(useActiveTooltipDataPoints);
        expectLastCalledWith(spy, undefined);
      });

      it("should return data point after click", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltipClick(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should continue returning the same payload after mouse leave", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltipClick(container, areaChartMouseHoverTooltipSelector);
        hideTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, [
          {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
        ]);
      });

      it("should return undefined after hover", () => {
        const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
        showTooltip(container, areaChartMouseHoverTooltipSelector);

        expectLastCalledWith(spy, undefined);
      });
    });
  });

  describe("as a child of ScatterChart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ScatterChart width={400} height={400} data={PageData}>
        <Scatter dataKey="pv" />
        {props.children}
      </ScatterChart>
    ));

    it("should deduplicate the data points and return only one element", () => {
      const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
      showTooltip(container, scatterChartMouseHoverTooltipSelector);

      expectLastCalledWith(spy, [
        {
          amt: 2400,
          name: "Page A",
          pv: 2400,
          uv: 400,
        },
      ]);
    });
  });

  describe("as a child of ComposedChart with multiple graphical items sharing the same data", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={400} height={400} data={PageData}>
        <Area dataKey="pv" />
        <Bar dataKey="uv" />
        <Line dataKey="amt" />
        {props.children}
      </ComposedChart>
    ));

    it("should return one deduplicated data point", () => {
      const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
      showTooltip(container, composedChartMouseHoverTooltipSelector);

      expectLastCalledWith(spy, [
        {
          amt: 2400,
          name: "Page C",
          pv: 1398,
          uv: 300,
        },
      ]);
    });
  });

  describe("as a child of ComposedChart with multiple graphical items each with their own data", () => {
    const dataUv = PageData.map((p) => ({ name: p.name, uv: p.uv }));
    const dataPv = PageData.map((p) => ({ name: p.name, pv: p.pv }));
    const dataAmt = PageData.map((p) => ({ name: p.name, amt: p.amt }));
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={400} height={400} data={PageData}>
        <Area data={dataPv} dataKey="pv" />
        <Area data={dataUv} dataKey="uv" />
        <Line data={dataAmt} dataKey="amt" />
        <XAxis dataKey="name" allowDuplicatedCategory={false} />
        {props.children}
      </ComposedChart>
    ));

    it("should return one data point for each graphical item", () => {
      const { container, spy } = renderTestCase(useActiveTooltipDataPoints);
      showTooltip(container, composedChartMouseHoverTooltipSelector);

      expectLastCalledWith(spy, [
        { name: "Page C", pv: 1398 },
        { name: "Page C", uv: 300 },
        { amt: 2400, name: "Page C" },
      ]);
    });
  });

  describe("when activeDot is defined as inline object", () => {
    const ChartContent = () => {
      useActiveTooltipDataPoints();

      return (
        <Line
          activeDot={{
            strokeWidth: 1.5,
            fill: "white",
            stroke: "black",
            r: 3,
          }}
        />
      );
    };

    const renderTestCase = createSelectorTestCase(() => (
      <ComposedChart width={400} height={400} data={PageData}>
        <ChartContent />
      </ComposedChart>
    ));

    it("should render and show tooltip without infinite loop", () => {
      const { container } = renderTestCase();
      showTooltip(container, composedChartMouseHoverTooltipSelector);
      expect(container).toBeDefined();
    });
  });
});
