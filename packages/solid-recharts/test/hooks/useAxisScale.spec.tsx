// Ported from recharts 3.8.1 test/hooks/useAxisScale.spec.tsx (commit 7a23854).
// Solid deviations: hooks from src/hooks (return Accessors; createSelectorTestCase
// spies the accessor value); wrappers read `props.children` (lazy → Spy mounts in
// the chart store).
import { describe, expect, it } from "vitest";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { Brush, Line, LineChart, XAxis, YAxis } from "../../src";
import {
  useCartesianScale,
  useXAxisInverseScale,
  useXAxisScale,
  useYAxisInverseScale,
  useYAxisScale,
} from "../../src/hooks";
import { PageData } from "../_data";

describe("axis scale hooks", () => {
  describe("useXAxisScale", () => {
    describe("in simple chart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" />
          {props.children}
        </LineChart>
      ));

      it("should return the X-axis scale function", () => {
        const { spy } = renderTestCase(useXAxisScale);
        const scaleFunction = spy.mock.calls.at(-1)?.[0];
        expect(typeof scaleFunction).toBe("function");
      });

      it("should map data values to pixel coordinates", () => {
        const { spy } = renderTestCase(useXAxisScale);
        const scaleFunction = spy.mock.calls.at(-1)?.[0];
        expect(typeof scaleFunction?.(0)).toBe("number");
      });
    });

    describe("with numerical axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" />
          <XAxis type="number" dataKey="pv" />
          {props.children}
        </LineChart>
      ));

      it("should return a scale that can map numerical values", () => {
        const { spy } = renderTestCase(useXAxisScale);
        const scaleFunction = spy.mock.calls.at(-1)?.[0];
        expect(typeof scaleFunction?.(5000)).toBe("number");
      });
    });

    describe("with explicit axis ID", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" xAxisId="xAxis1" yAxisId="yAxis1" />
          <XAxis dataKey="name" xAxisId="xAxis1" />
          <YAxis dataKey="pv" yAxisId="yAxis1" />
          {props.children}
        </LineChart>
      ));

      it("should return a scale function even when called with default ID (uses fallback)", () => {
        const { spy } = renderTestCase(useXAxisScale);
        const scaleFunction = spy.mock.calls.at(-1)?.[0];
        // Recharts provides fallback behavior for missing axis IDs
        expect(typeof scaleFunction).toBe("function");
      });
    });
  });

  describe("useYAxisScale", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should return the Y-axis scale function", () => {
      const { spy } = renderTestCase(useYAxisScale);
      expect(typeof spy.mock.calls.at(-1)?.[0]).toBe("function");
    });

    it("should map data values to pixel coordinates", () => {
      const { spy } = renderTestCase(useYAxisScale);
      const scaleFunction = spy.mock.calls.at(-1)?.[0];
      expect(typeof scaleFunction?.(200)).toBe("number");
    });
  });

  describe("useXAxisInverseScale", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </LineChart>
    ));

    it("should return an inverse scale function", () => {
      const { spy } = renderTestCase(useXAxisInverseScale);
      expect(typeof spy.mock.calls.at(-1)?.[0]).toBe("function");
    });

    it("should convert pixel coordinates back to the closest category", () => {
      const { spy: scaleSpy } = renderTestCase(useXAxisScale);
      const scaleFunction = scaleSpy.mock.calls.at(-1)?.[0];
      const { spy: inverseSpy } = renderTestCase(useXAxisInverseScale);
      const inverseFunction = inverseSpy.mock.calls.at(-1)?.[0];
      if (scaleFunction && inverseFunction) {
        const pixelForPageC = scaleFunction("Page C");
        expect(pixelForPageC).toBeDefined();
        expect(inverseFunction(pixelForPageC)).toBe("Page C");
      }
    });
  });

  describe("useYAxisInverseScale", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should return an inverse scale function", () => {
      const { spy } = renderTestCase(useYAxisInverseScale);
      expect(typeof spy.mock.calls.at(-1)?.[0]).toBe("function");
    });
  });

  describe("useCartesianScale", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </LineChart>
    ));

    function useCartesianScalePageA100() {
      return useCartesianScale({ x: "Page A", y: 100 });
    }
    function useCartesianScalePageF400() {
      return useCartesianScale({ x: "Page F", y: 400 });
    }

    it("should convert data coordinates to pixel coordinates", () => {
      const { spy } = renderTestCase(useCartesianScalePageA100);
      const coords = spy.mock.calls.at(-1)?.[0];
      expect(typeof coords?.x).toBe("number");
      expect(typeof coords?.y).toBe("number");
    });

    it("should return different pixels for different data values", () => {
      const { spy: spy1 } = renderTestCase(useCartesianScalePageA100);
      const coords1 = spy1.mock.calls.at(-1)?.[0];
      const { spy: spy2 } = renderTestCase(useCartesianScalePageF400);
      const coords2 = spy2.mock.calls.at(-1)?.[0];
      expect(coords1?.x).not.toBe(coords2?.x);
      expect(coords1?.y).not.toBe(coords2?.y);
    });

    describe("in chart with numerical x-axis", () => {
      const renderNumericalTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" />
          <XAxis type="number" dataKey="pv" />
          {props.children}
        </LineChart>
      ));

      function useCartesianScaleNumerical() {
        return useCartesianScale({ x: 5000, y: 200 });
      }

      it("should convert numerical x value to pixel coordinates", () => {
        const { spy } = renderNumericalTestCase(useCartesianScaleNumerical);
        const coords = spy.mock.calls.at(-1)?.[0];
        expect(coords).toBeDefined();
        expect(typeof coords?.x).toBe("number");
        expect(typeof coords?.y).toBe("number");
      });
    });

    describe("with brush filtering data", () => {
      const renderBrushTestCase = createSelectorTestCase((props) => (
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

      function useCartesianScalePageB() {
        return useCartesianScale({ x: "Page B", y: 200 });
      }

      it("should work with filtered data from brush", () => {
        const { spy } = renderBrushTestCase(useCartesianScalePageB);
        const coords = spy.mock.calls.at(-1)?.[0];
        // Even with brush, scale should exist and return coordinates
        expect(coords).toBeDefined();
        expect(typeof coords?.x).toBe("number");
        expect(typeof coords?.y).toBe("number");
      });
    });
  });
});
