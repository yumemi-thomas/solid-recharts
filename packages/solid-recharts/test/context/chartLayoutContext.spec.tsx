// Ported from recharts 3.8.1 test/context/chartLayoutContext.spec.tsx (commit 7a23854).
//
// Solid deviations:
// - chart hooks return Accessors (useOffsetInternal, useChartLayout, …); spied via
//   createSelectorTestCase (effect on accessor value) or read directly.
// - `<Customized component={Comp} />` is NOT ported (deprecated React element-cloning
//   shim); the consumer is rendered directly as a chart child, matching the Solid
//   useOffset.spec.tsx convention. The exact offset VALUES are golden-anchored to
//   recharts.
// - `toHaveBeenCalledTimes(n)` assertions are React-render-count specific and do not
//   translate to Solid's effect-based spy; dropped (see useOffset.spec.tsx).
// - layout hooks + useOffsetInternal are imported from the source path (not re-exported
//   from index, same as the reference imports useOffsetInternal from the source).
import { createEffect, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  useCartesianChartLayout,
  useChartLayout,
  usePolarChartLayout,
  useOffsetInternal,
} from "../../src/context/chartLayoutContext";
import { Brush, ComposedChart, Legend, PieChart, XAxis, YAxis } from "../../src";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { render } from "@solidjs/testing-library";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { emptyOffset } from "../helper/offsetHelpers";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

describe("ClipPathIdContext", () => {
  it("should generate unique clipPathId", () => {
    expect.assertions(1);
    const MockConsumer = (): null => {
      const clipPathId = useClipPathId();
      expect(clipPathId).toMatch(/^recharts\d+-clip$/);
      return null;
    };
    render(() => (
      <ComposedChart width={100} height={200}>
        <MockConsumer />
      </ComposedChart>
    ));
  });

  it("should return undefined when using the hook outside of chart", () => {
    expect.assertions(1);
    const MockComponent = (): null => {
      const clipPathId = useClipPathId();
      expect(clipPathId).toBe(undefined);
      return null;
    };
    render(() => <MockComponent />);
  });
});

describe("useOffsetInternal", () => {
  it("should return offset with all zeroes when used outside of chart", () => {
    const offsetSpy = vi.fn();
    const Comp = (): null => {
      const offset = useOffsetInternal();
      offsetSpy(offset());
      return null;
    };
    render(() => <Comp />);
    expectLastCalledWith(offsetSpy, emptyOffset);
  });

  it("should return default offset in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5,
      brushBottom: 5,
      height: 190,
      width: 90,
    });
  });

  it("should add chart margin", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
      brushBottom: 30,
      height: 160,
      width: 40,
    });
  });

  it("should include default Brush height (40) in bottom property", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Brush />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 70,
      left: 40,
      brushBottom: 30,
      height: 120,
      width: 40,
    });
  });

  it("should include explicit brush height in bottom property", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={300} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Brush height={13} />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      top: 10,
      right: 20,
      bottom: 43,
      left: 40,
      brushBottom: 30,
      height: 147,
      width: 240,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 30,
      brushBottom: 30,
      height: 160,
      left: 100,
      right: 80,
      top: 10,
      width: 120,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 30,
      brushBottom: 30,
      height: 160,
      left: 63,
      right: 59,
      top: 10,
      width: 178,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 30,
      brushBottom: 30,
      height: 160,
      left: 40,
      right: 20,
      top: 10,
      width: 240,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 60,
      brushBottom: 60,
      height: 100,
      left: 40,
      right: 20,
      top: 40,
      width: 40,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 69,
      brushBottom: 69,
      height: 98,
      left: 40,
      right: 20,
      top: 33,
      width: 40,
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
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 30,
      brushBottom: 30,
      height: 160,
      left: 40,
      right: 20,
      top: 10,
      width: 40,
    });
  });

  /*
   * The test for Legend can be simple and test only one case;
   * all the various Legend positioning and cases are covered by appendOffsetOfLegend tests
   * so no need to duplicate.
   */
  it("should include computed width and height on Legend - see appendOffsetOfLegend for detailed behaviour", () => {
    mockGetBoundingClientRect({ height: 29, width: 43 });
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={100} height={200} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <Legend />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(useOffsetInternal);

    expectLastCalledWith(spy, {
      bottom: 59,
      brushBottom: 30,
      height: 131,
      left: 40,
      right: 20,
      top: 10,
      width: 40,
    });
  });
});

describe("layout hooks", () => {
  it("should return undefined for all layout hooks outside of chart", () => {
    expect.assertions(3);
    const Comp = (): null => {
      expect(useChartLayout()()).toBe(undefined);
      expect(useCartesianChartLayout()()).toBe(undefined);
      expect(usePolarChartLayout()()).toBe(undefined);
      return null;
    };
    render(() => <Comp />);
  });

  it("should return cartesian layout and no polar layout in cartesian chart", () => {
    const chartSpy = vi.fn();
    const cartesianSpy = vi.fn();
    const polarSpy = vi.fn();
    const Comp = (): null => {
      const chart = useChartLayout();
      const cartesian = useCartesianChartLayout();
      const polar = usePolarChartLayout();
      createEffect(
        () => chart(),
        (v) => chartSpy(v),
      );
      createEffect(
        () => cartesian(),
        (v) => cartesianSpy(v),
      );
      createEffect(
        () => polar(),
        (v) => polarSpy(v),
      );
      return null;
    };
    render(() => (
      <ComposedChart width={100} height={200}>
        <Comp />
      </ComposedChart>
    ));
    flush();

    expect(chartSpy).toHaveBeenLastCalledWith("horizontal");
    expect(cartesianSpy).toHaveBeenLastCalledWith("horizontal");
    expect(polarSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("should return polar layout and no cartesian layout in polar chart", () => {
    const chartSpy = vi.fn();
    const cartesianSpy = vi.fn();
    const polarSpy = vi.fn();
    const Comp = (): null => {
      const chart = useChartLayout();
      const cartesian = useCartesianChartLayout();
      const polar = usePolarChartLayout();
      createEffect(
        () => chart(),
        (v) => chartSpy(v),
      );
      createEffect(
        () => cartesian(),
        (v) => cartesianSpy(v),
      );
      createEffect(
        () => polar(),
        (v) => polarSpy(v),
      );
      return null;
    };
    render(() => (
      <PieChart width={100} height={200}>
        <Comp />
      </PieChart>
    ));
    flush();

    expect(chartSpy).toHaveBeenLastCalledWith("centric");
    expect(cartesianSpy).toHaveBeenLastCalledWith(undefined);
    expect(polarSpy).toHaveBeenLastCalledWith("centric");
  });
});
