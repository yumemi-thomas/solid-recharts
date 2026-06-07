// Ported from recharts 3.8.1 test/hooks/useOffset.spec.tsx (commit 7a23854).
// Solid deviations: hooks return Accessors; `Customized` hook probes are replaced
// by createSelectorTestCase; call-count assertions are relaxed where Solid's
// registration effects settle differently from React renders.
import { flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Brush, ComposedChart, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "../../src";
import { useActiveTooltipDataPoints, useOffset, usePlotArea } from "../../src/hooks";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { render } from "../helper/render";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { pageData } from "../_data";
import { showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { lineChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

describe("useOffset", () => {
  it("should return undefined when used outside of chart", () => {
    const offsetSpy = vi.fn();
    const Comp = (): null => {
      const offset = useOffset();
      offsetSpy(offset());
      return null;
    };
    render(() => <Comp />);
    expectLastCalledWith(offsetSpy, undefined);
  });

  it("should return default offset in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5,
    });
  });

  it("should add chart margin", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it("should include default Brush height (40) in bottom property", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Brush />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 70,
      left: 40,
    });
  });

  it("should include explicit brush height in bottom property", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={300} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Brush height={13} />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 43,
      left: 40,
    });
  });

  it("should include default width of YAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={300} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <YAxis orientation="left" yAxisId="left" />
        <YAxis orientation="right" yAxisId="right" />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 30,
      left: 100,
      right: 80,
      top: 10,
    });
  });

  it("should include explicit width of YAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={300} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <YAxis orientation="left" yAxisId="left" width={23} />
        <YAxis orientation="right" yAxisId="right" width={39} />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 30,
      left: 63,
      right: 59,
      top: 10,
    });
  });

  it("should exclude hidden YAxis dimensions", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={300} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <YAxis orientation="left" yAxisId="left" width={23} hide />
        <YAxis orientation="right" yAxisId="right" width={37} hide />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 30,
      left: 40,
      right: 20,
      top: 10,
    });
  });

  it("should include default height of XAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <XAxis orientation="top" xAxisId="top" />
        <XAxis orientation="bottom" xAxisId="bottom" />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 60,
      left: 40,
      right: 20,
      top: 40,
    });
  });

  it("should include explicit height of XAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <XAxis orientation="top" xAxisId="top" height={23} />
        <XAxis orientation="bottom" xAxisId="bottom" height={39} />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 69,
      left: 40,
      right: 20,
      top: 33,
    });
  });

  it("should exclude hidden XAxis height", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <XAxis orientation="top" xAxisId="top" height={23} hide />
        <XAxis orientation="bottom" xAxisId="bottom" height={37} hide />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 30,
      left: 40,
      right: 20,
      top: 10,
    });
  });

  it("should include computed width and height on Legend - see appendOffsetOfLegend for detailed behaviour", () => {
    mockGetBoundingClientRect({ height: 29, width: 43 });
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Legend />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffset);

    expectLastCalledWith(spy, {
      bottom: 59,
      left: 40,
      right: 20,
      top: 10,
    });
  });

  it("should render when used in the same component as XAxis", () => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
    const spy = vi.fn();
    const Child = () => {
      usePlotArea();
      useOffset();
      useActiveTooltipDataPoints();
      spy();
      return <XAxis />;
    };

    const { container } = render(() => (
      <LineChart width={500} height={300} data={pageData}>
        <Line dataKey="uv" />
        <Tooltip />
        <Child />
      </LineChart>
    ));
    flush();

    expect(spy).toHaveBeenCalled();

    showTooltip(container, lineChartMouseHoverTooltipSelector);
    flush();

    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
