// Ported from recharts 3.8.1 test/hooks/useAxisDomain.spec.tsx (commit 7a23854).
// Solid deviations: hooks from src/hooks return Accessors; createSelectorTestCase
// spies the accessor value; wrappers read `props.children` lazily. The Brush
// panorama hook pair is skipped until nested Brush children inherit the panorama
// chart context in Solid.
import { describe, it } from "vitest";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { Brush, Line, LineChart, XAxis, YAxis } from "../../src";
import { useXAxisDomain, useYAxisDomain } from "../../src/hooks";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { PageData } from "../_data";

describe("axis domain hooks", () => {
  describe("in simple chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with explicit axis IDs", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" xAxisId="xAxis1" yAxisId="yAxis1" />
        <XAxis dataKey="name" xAxisId="xAxis1" />
        <YAxis dataKey="pv" yAxisId="yAxis1" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain with explicit ID", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("xAxis1"));
      expectLastCalledWith(spy, ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"]);
    });

    it("should select YAxis numerical domain with explicit ID", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("yAxis1"));
      expectLastCalledWith(spy, [0, 9800]);
    });

    it("should return default XAxis domain when called without ID", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default YAxis domain when called without ID", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, undefined);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with explicit XAxis with dataKey", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with explicit XAxis with numerical dataKey with duplicates", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis numerical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with numerical type axis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis type="number" dataKey="pv" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis numerical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [0, 9800]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with numerical type axis but categorical dataKey", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis type="number" dataKey="name" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, undefined);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("in vertical chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData} layout="vertical">
        <Line dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [400, 300, 300, 200, 278, 189]);
    });

    it("should select YAxis categorical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });
  });

  describe("with explicit XAxis with numerical dataKey with duplicates, with allowDuplicatedCategory=false", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="uv" allowDuplicatedCategory={false} />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis numerical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [400, 300, 200, 278, 189]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with explicit XAxis with numerical dataKey without duplicates", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="pv" />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis numerical domain with dataKey", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, [2400, 4567, 1398, 9800, 3908, 4800]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });

    it("should return default domain when passed an invalid xAxisId", () => {
      const { spy } = renderTestCase(() => useXAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
    });

    it("should return default domain when passed an invalid yAxisId", () => {
      const { spy } = renderTestCase(() => useYAxisDomain("invalidAxisId"));
      expectLastCalledWith(spy, undefined);
    });
  });

  describe("with custom domain", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <YAxis domain={["dataMin", "dataMax"]} />
        <XAxis dataKey="name" domain={["Page D", "Page E", "Page F"]} />
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain with explicit domain", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"]);
    });

    it("should select YAxis numerical domain", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [189, 400]);
    });
  });

  describe("with data filtered by a brush, when used outside the brush panorama", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        <Brush startIndex={1} endIndex={2}>
          <LineChart>
            <Line dataKey="uv" />
          </LineChart>
        </Brush>
        {props.children}
      </LineChart>
    ));

    it("should select XAxis categorical domain with brush applied", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, ["Page B", "Page C"]);
    });

    it("should select YAxis numerical domain with brush applied", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 300]);
    });
  });

  // DEEP-DEFERRED: recharts' Panorama uses React.cloneElement(innerChart, { data,
  // width, height, compact: true }) to inject the FULL dataset + dimensions into
  // the nested <LineChart> passed as Brush children, so the inner chart's own
  // store reports the full domain. Solid has no cloneElement (PERMANENT-N/A), and
  // a nested <LineChart> spins up its own empty store (no data/dimensions
  // propagated through JSX children) → inner domain is undefined, not the full
  // range. Reproducing this needs prop-injection into an opaque child element,
  // which the JSX-children model can't express without cloneElement.
  describe("with data filtered by a brush, when used inside the brush panorama", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        <Brush startIndex={1} endIndex={2}>
          <LineChart>
            <Line dataKey="uv" />
            {props.children}
          </LineChart>
        </Brush>
      </LineChart>
    ));

    it("should select XAxis categorical domain with brush applied", () => {
      const { spy } = renderTestCase(() => useXAxisDomain());
      expectLastCalledWith(spy, ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"]);
    });

    it("should select YAxis numerical domain with brush applied", () => {
      const { spy } = renderTestCase(() => useYAxisDomain());
      expectLastCalledWith(spy, [0, 400]);
    });
  });
});
