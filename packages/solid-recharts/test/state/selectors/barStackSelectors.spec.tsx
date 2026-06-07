import { describe, expect, it, test } from "vitest";
import { Bar, BarChart, BarStack } from "../../../src";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";
import {
  expandRectangle,
  selectAllBarsInStack,
} from "../../../src/state/selectors/barStackSelectors";
import { PageData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("BarStack Selectors", () => {
  describe("in chart with BarStack", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={200} height={200} data={PageData}>
        <BarStack stackId="mystackid">
          <Bar dataKey="uv" id="red" />
          <Bar dataKey="pv" id="green" />
          {props.children}
        </BarStack>
        <Bar dataKey="amt" id="blue" />
      </BarChart>
    ));

    test("selectAllBarsInStack", () => {
      const { spy } = renderTestCase((state) => selectAllBarsInStack(state, "mystackid", false));
      expectLastCalledWith(spy, [
        expect.objectContaining({
          id: "red",
          stackId: "mystackid",
          type: "bar",
          xAxisId: defaultAxisId,
          yAxisId: defaultAxisId,
        }),
        expect.objectContaining({
          id: "green",
          stackId: "mystackid",
          type: "bar",
          xAxisId: defaultAxisId,
          yAxisId: defaultAxisId,
        }),
      ]);
    });
  });

  describe("expandRectangle", () => {
    it("should return undefined if both rectangles are undefined", () => {
      const result = expandRectangle(undefined, undefined);
      expect(result).toBeUndefined();
    });

    it("should return the other rectangle if one is undefined", () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 };
      const result1 = expandRectangle(rect1, undefined);
      expect(result1).toEqual(rect1);

      const rect2 = { x: 5, y: 5, width: 15, height: 15 };
      const result2 = expandRectangle(undefined, rect2);
      expect(result2).toEqual(rect2);
    });

    it("should expand two rectangles that are touching each other", () => {
      const rect1 = { x: 5, y: 0, width: 25, height: 10 };
      const rect2 = { x: 2, y: 10, width: 20, height: 15 };
      const result = expandRectangle(rect1, rect2);
      expect(result).toEqual({ x: 2, y: 0, width: 28, height: 25 });
    });

    it("should expand two rectangles that have a gap between them", () => {
      const rect1 = { x: 5, y: 0, width: 10, height: 10 };
      const rect2 = { x: 20, y: 15, width: 10, height: 10 };
      const result = expandRectangle(rect1, rect2);
      expect(result).toEqual({ x: 5, y: 0, width: 25, height: 25 });
    });

    it("should expand two overlapping rectangles", () => {
      const rect1 = { x: 5, y: 5, width: 20, height: 20 };
      const rect2 = { x: 15, y: 15, width: 20, height: 20 };
      const result = expandRectangle(rect1, rect2);
      expect(result).toEqual({ x: 5, y: 5, width: 30, height: 30 });
    });

    it("should expand rectangles with negative height", () => {
      const rect1 = { x: 10, y: 100, width: 60, height: -25 };
      const rect2 = { x: 100, y: 25, width: -50, height: 50 };
      const result = expandRectangle(rect1, rect2);
      expect(result).toEqual({ x: 10, y: 25, width: 90, height: 75 });
    });
  });
});
