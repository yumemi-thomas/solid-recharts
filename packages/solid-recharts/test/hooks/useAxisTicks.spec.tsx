// Ported from recharts 3.8.1 test/hooks/useAxisTicks.spec.tsx (commit 7a23854).
// Solid deviations: hooks imported from src/hooks (return Accessors;
// createSelectorTestCase spies the accessor's value); components from src.
import { describe, expect, it } from "vitest";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { Line, LineChart, XAxis, YAxis } from "../../src";
import {
  useXAxisInverseTickSnapScale,
  useXAxisScale,
  useXAxisTicks,
  useYAxisInverseTickSnapScale,
  useYAxisTicks,
} from "../../src/hooks";
import { PageData } from "../_data";

describe("new axis hooks", () => {
  describe("useXAxisInverseTickSnapScale", () => {
    describe("in simple chart with categorical x-axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" />
          <XAxis dataKey="name" />
          {props.children}
        </LineChart>
      ));

      it("should return an inverse scale function", () => {
        const { spy } = renderTestCase(useXAxisInverseTickSnapScale);
        expect(spy).toHaveBeenCalled();
        const inverseFunction = spy.mock.lastCall?.[0];
        expect(inverseFunction).toBeDefined();
        expect(typeof inverseFunction).toBe("function");
      });

      it("should snap to the closest tick", () => {
        const { spy: scaleSpy } = renderTestCase(useXAxisScale);
        const scaleFunction = scaleSpy.mock.lastCall?.[0];

        const { spy: inverseSpy } = renderTestCase(useXAxisInverseTickSnapScale);
        const inverseFunction = inverseSpy.mock.lastCall?.[0];

        if (scaleFunction && inverseFunction) {
          const pixelForPageC = scaleFunction("Page C");
          const pixelForPageD = scaleFunction("Page D");
          if (typeof pixelForPageC !== "number" || typeof pixelForPageD !== "number") {
            throw new Error("Pixel coordinates should be numbers");
          }
          const nearC = pixelForPageC + (pixelForPageD - pixelForPageC) * 0.1;
          expect(inverseFunction(nearC)).toBe("Page C");
          const nearD = pixelForPageC + (pixelForPageD - pixelForPageC) * 0.9;
          expect(inverseFunction(nearD)).toBe("Page D");
        }
      });
    });
  });

  describe("useYAxisInverseTickSnapScale", () => {
    describe("in simple chart with numerical y-axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={PageData}>
          <Line dataKey="uv" />
          <YAxis />
          {props.children}
        </LineChart>
      ));

      it("should return an inverse scale function", () => {
        const { spy } = renderTestCase(useYAxisInverseTickSnapScale);
        expect(spy).toHaveBeenCalled();
        const inverseFunction = spy.mock.lastCall?.[0];
        expect(inverseFunction).toBeDefined();
        expect(typeof inverseFunction).toBe("function");
      });

      it("should snap to the closest tick", () => {
        const { spy: inverseSpy } = renderTestCase(useYAxisInverseTickSnapScale);
        const inverseFunction = inverseSpy.mock.lastCall?.[0];

        const { spy: ticksSpy } = renderTestCase(useYAxisTicks);
        const ticks = ticksSpy.mock.lastCall?.[0];

        if (inverseFunction && ticks && ticks.length >= 2) {
          const [tick1, tick2] = ticks;
          const near1 = tick1.coordinate + (tick2.coordinate - tick1.coordinate) * 0.1;
          expect(inverseFunction(near1)).toBe(tick1.value);
          const near2 = tick1.coordinate + (tick2.coordinate - tick1.coordinate) * 0.9;
          expect(inverseFunction(near2)).toBe(tick2.value);
        }
      });
    });
  });

  describe("useXAxisTicks", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </LineChart>
    ));

    it("should return ticks", () => {
      const { spy } = renderTestCase(useXAxisTicks);
      expect(spy).toHaveBeenCalled();
      const ticks = spy.mock.lastCall?.[0];
      expect(Array.isArray(ticks)).toBe(true);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks[0].value).toBe("Page A");
    });
  });

  describe("useYAxisTicks", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={300} data={PageData}>
        <Line dataKey="uv" />
        <YAxis />
        {props.children}
      </LineChart>
    ));

    it("should return numerical ticks", () => {
      const { spy } = renderTestCase(useYAxisTicks);
      expect(spy).toHaveBeenCalled();
      const ticks = spy.mock.lastCall?.[0];
      expect(Array.isArray(ticks)).toBe(true);
      expect(ticks.length).toBeGreaterThan(0);
      expect(typeof ticks[0].value).toBe("number");
    });
  });
});
