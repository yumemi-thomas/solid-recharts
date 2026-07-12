// Ported from recharts 3.8.1 test/util/createChartHelpers.spec.tsx.
// The vendored spec is dominated by `@ts-expect-error` type-level assertions
// (verifying the curried helpers reject wrong components / dataKeys / formatter
// value types at compile time). Those are PERMANENT-N/A here (type-only; see
// PERMANENT-N/A: generic .typed cases). What IS runtime-recoverable: the shape
// of the returned object (which components are present / are the same reference)
// and the bound `layout` observed via selectChartLayout. Those are ported below.
import { describe, expect, it } from "vitest";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  createCentricChart,
  createHorizontalChart,
  createRadialChart,
  createVerticalChart,
  Funnel,
  Line,
  LineChart,
  Radar,
  RadialBar,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "../../src";
import { selectChartLayout } from "../../src/context/chartLayoutContext";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";

type ExampleDataPoint = { value: number; name: string };
const data: ReadonlyArray<ExampleDataPoint> = [
  { value: 100, name: "a" },
  { value: 80, name: "b" },
];

describe("Chart Helpers", () => {
  describe("createHorizontalChart", () => {
    it("should return the same component references at runtime, but no others", () => {
      const components = createHorizontalChart<ExampleDataPoint, string, number>()({
        AreaChart,
        Area,
        XAxis,
        YAxis,
      });
      expect(components.AreaChart).toBeDefined();
      expect(components.Area).toBe(Area);
      expect(components.XAxis).toBe(XAxis);
      expect(components.YAxis).toBe(YAxis);
      // all the chart-element wrappers should be available even if not provided
      expect(components.BarChart).toBeDefined();
      expect(components.ComposedChart).toBeDefined();
      expect(components.LineChart).toBeDefined();
      expect(components.ScatterChart).toBeDefined();
    });

    it("should accept all supported cartesian chart components except Funnel and FunnelChart", () => {
      const components = createHorizontalChart<ExampleDataPoint, string, number>()({
        AreaChart,
        BarChart,
        ComposedChart,
        LineChart,
        ScatterChart,
        Area,
        Bar,
        Line,
        Scatter,
        XAxis,
        YAxis,
      });

      expect(components.AreaChart).toBeDefined();
      expect(components.BarChart).toBe(BarChart);
      expect(components.ComposedChart).toBe(ComposedChart);
      expect(components.LineChart).toBe(LineChart);
      expect(components.ScatterChart).toBe(ScatterChart);
      expect(components.Area).toBe(Area);
      expect(components.Bar).toBe(Bar);
      expect(components.Line).toBe(Line);
      expect(components.Scatter).toBe(Scatter);
      expect(components.XAxis).toBe(XAxis);
      expect(components.YAxis).toBe(YAxis);
    });

    it("should set layout to horizontal and prevent overriding", () => {
      const Typed = createHorizontalChart<ExampleDataPoint, string, number>()({
        Area,
      });

      const renderTestCase = createSelectorTestCase((props) => (
        <Typed.AreaChart data={data} width={400} height={400}>
          <Typed.Area dataKey="value" isAnimationActive={false} />
          {props.children}
        </Typed.AreaChart>
      ));

      const { spy } = renderTestCase(selectChartLayout);

      expect(spy).toHaveBeenLastCalledWith("horizontal");
    });

    it("should type Tooltip formatter with the same component reference", () => {
      const Typed = createHorizontalChart<ExampleDataPoint, string, number>()({
        Area,
        XAxis,
        Tooltip,
      });

      expect(Typed.Tooltip).toBe(Tooltip);
    });
  });

  describe("createVerticalChart", () => {
    it("should include all chart components, PLUS FunnelChart because funnels can only be vertical", () => {
      const components = createVerticalChart<ExampleDataPoint, number, string>()({
        Area,
        Funnel,
      });
      expect(components.AreaChart).toBeDefined();
      expect(components.BarChart).toBeDefined();
      expect(components.ComposedChart).toBeDefined();
      expect(components.FunnelChart).toBeDefined();
      expect(components.LineChart).toBeDefined();
      expect(components.ScatterChart).toBeDefined();
      expect(components.Area).toBe(Area);
      expect(components.Funnel).toBe(Funnel);
    });

    it("should set layout to vertical and prevent overriding", () => {
      const Typed = createVerticalChart<ExampleDataPoint, number, string>()({
        Area,
      });

      const renderTestCase = createSelectorTestCase((props) => (
        <Typed.AreaChart data={data} width={400} height={400}>
          <Typed.Area dataKey="name" isAnimationActive={false} />
          {props.children}
        </Typed.AreaChart>
      ));

      const { spy } = renderTestCase(selectChartLayout);

      expect(spy).toHaveBeenLastCalledWith("vertical");
    });
  });

  describe("createCentricChart", () => {
    it("should set layout to centric and prevent overriding", () => {
      const Typed = createCentricChart<ExampleDataPoint, string, number>()({
        Radar,
      });

      const renderTestCase = createSelectorTestCase((props) => (
        <Typed.RadarChart data={data} width={400} height={400}>
          <Typed.Radar dataKey="value" isAnimationActive={false} />
          {props.children}
        </Typed.RadarChart>
      ));

      const { spy } = renderTestCase(selectChartLayout);

      expect(spy).toHaveBeenLastCalledWith("centric");
    });
  });

  describe("createRadialChart", () => {
    it("should set layout to radial and prevent overriding", () => {
      const Typed = createRadialChart<ExampleDataPoint, string, number>()({
        RadialBar,
      });

      const renderTestCase = createSelectorTestCase((props) => (
        <Typed.RadialBarChart data={data} width={400} height={400}>
          <Typed.RadialBar dataKey="value" isAnimationActive={false} />
          {props.children}
        </Typed.RadialBarChart>
      ));

      const { spy } = renderTestCase(selectChartLayout);

      expect(spy).toHaveBeenLastCalledWith("radial");
    });
  });

  describe("untracked components", () => {
    it("should render standard components seamlessly alongside Typed charts", () => {
      const Typed = createHorizontalChart<ExampleDataPoint, string, number>()({
        Area,
        XAxis,
      });

      const renderTestCase = createSelectorTestCase((props) => (
        <Typed.AreaChart data={data} width={400} height={400}>
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Typed.XAxis dataKey="name" />
          <Typed.Area dataKey="value" isAnimationActive={false} />
          {props.children}
        </Typed.AreaChart>
      ));

      const { spy } = renderTestCase(selectChartLayout);

      expect(spy).toHaveBeenLastCalledWith("horizontal");
    });
  });
});
