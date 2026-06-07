// Ported from recharts 3.8.1 test/state/selectors/selectIsTooltipActive.spec.tsx
// (commit 7a23854). Solid deviations: selector lives in tooltipSelectors; exact
// React render-count assertions are omitted while preserving state/value parity.
import { beforeEach, describe, it } from "vitest";
import { Bar, BarChart, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "../../../src";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { PageData } from "../../_data";
import { selectIsTooltipActive } from "../../../src/state/selectors/tooltipSelectors";
import {
  barChartMouseHoverTooltipSelector,
  scatterChartMouseHoverTooltipSelector,
} from "../../component/Tooltip/tooltipMouseHoverSelectors";
import { hideTooltip, showTooltip } from "../../component/Tooltip/tooltipTestHelpers";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("selectIsTooltipActive", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  describe("default Tooltip props", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData}>
        <Bar dataKey="uv" />
        <Tooltip />
        {props.children}
      </BarChart>
    ));

    it("should select false before any interactions", () => {
      const { spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "axis", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });

    it("should select true after mouse hover, and then false again on mouse leave", () => {
      const { container, spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "axis", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });

      showTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "1",
        isActive: true,
      });

      hideTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });
  });

  describe("with defaultIndex=number", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData}>
        <Bar dataKey="uv" />
        <Tooltip defaultIndex={0} />
        {props.children}
      </BarChart>
    ));

    it("should select true before any interactions", () => {
      const { spy } = renderTestCase((state) => selectIsTooltipActive(state, "axis", "hover", "0"));
      expectLastCalledWith(spy, {
        activeIndex: "0",
        isActive: true,
      });
    });

    it("should select true after mouse hover, and then false on mouse leave", () => {
      const { container, spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "axis", "hover", "0"),
      );
      expectLastCalledWith(spy, {
        activeIndex: "0",
        isActive: true,
      });

      showTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "1",
        isActive: true,
      });

      hideTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });
  });

  describe("in ScatterChart without defaultIndex", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ScatterChart width={800} height={400}>
        <Scatter data={PageData} />
        <XAxis dataKey="uv" />
        <YAxis dataKey="pv" />
        <Tooltip />
        {props.children}
      </ScatterChart>
    ));

    it("should select false before any interactions", () => {
      const { spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "item", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });

    it("should select true after mouse hover, and then false on mouse leave", () => {
      const { container, spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "item", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });

      showTooltip(container, scatterChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "0",
        isActive: true,
      });

      hideTooltip(container, scatterChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });
  });

  describe("with defaultIndex, and in ScatterChart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ScatterChart width={800} height={400}>
        <Scatter data={PageData} />
        <XAxis dataKey="uv" />
        <YAxis dataKey="pv" />
        <Tooltip defaultIndex={0} />
        {props.children}
      </ScatterChart>
    ));

    it("should select true before any interactions", () => {
      const { spy } = renderTestCase((state) => selectIsTooltipActive(state, "item", "hover", "0"));
      expectLastCalledWith(spy, {
        activeIndex: "0",
        isActive: true,
      });
    });

    it("should select true after mouse hover, and then false on mouse leave", () => {
      const { container, spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "item", "hover", "3"),
      );
      expectLastCalledWith(spy, {
        activeIndex: "3",
        isActive: true,
      });

      showTooltip(container, scatterChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "0",
        isActive: true,
      });

      hideTooltip(container, scatterChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });
  });

  describe("with active=true", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData}>
        <Bar dataKey="uv" />
        <Tooltip active />
        {props.children}
      </BarChart>
    ));

    it("should select false before any interactions", () => {
      const { spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "axis", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });
    });

    it("should select true after mouse hover, and then continue returning true after mouse leave", () => {
      const { container, spy } = renderTestCase((state) =>
        selectIsTooltipActive(state, "axis", "hover", undefined),
      );
      expectLastCalledWith(spy, {
        activeIndex: null,
        isActive: false,
      });

      showTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "1",
        isActive: true,
      });

      hideTooltip(container, barChartMouseHoverTooltipSelector);
      expectLastCalledWith(spy, {
        activeIndex: "1",
        isActive: true,
      });
    });
  });
});
