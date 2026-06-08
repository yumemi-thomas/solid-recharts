// Ported from recharts 3.8.1 test/component/Legend.itemSorter.spec.tsx (commit
// 7a23854). The "with default content" sorter cases are covered in
// Legend.render.spec.tsx; here we port the "when Legend content is a function"
// cases, which assert the exact props object passed to a function-form `content`.
//
// Tier-A adaptation: recharts calls the content as a React component
// (`React.createElement(content, props)`) so the spy sees `(props, {})` — the
// trailing `{}` is React's legacy context arg. The Solid port calls the function
// directly with a single argument, so the assertion drops the trailing `{}`; the
// props object itself is byte-identical. `render(() => <…/>)` + `flush()` replace
// React's synchronous render.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { Curve, DefaultZIndexes, Legend, Line, LineChart } from "../../src";
import { numericalData } from "../_data";

describe("Legend.itemSorter", () => {
  describe("when Legend content is a function", () => {
    it("should pass legend items sorted by label value by default", () => {
      const customContent = vi.fn();

      render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend content={customContent} />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      flush();

      expect(customContent).toHaveBeenLastCalledWith({
        align: "center",
        chartHeight: 500,
        chartWidth: 500,
        content: customContent,
        iconSize: 14,
        inactiveColor: "#ccc",
        itemSorter: "value",
        labelStyle: {},
        layout: "horizontal",
        margin: { bottom: 5, left: 5, right: 5, top: 5 },
        payload: [
          {
            color: "#3182bd",
            dataKey: "value",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "value",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "A",
              shape: Curve,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "A",
          },
          {
            color: "#3182bd",
            dataKey: "percent",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "percent",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "B",
              shape: Curve,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "B",
          },
        ],
        verticalAlign: "bottom",
        width: 490,
      });
    });

    it("should pass legend items sorted by dataKey when itemSorter is set", () => {
      const customContent = vi.fn();

      render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend content={customContent} itemSorter="dataKey" />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      flush();

      expect(customContent).toHaveBeenLastCalledWith({
        align: "center",
        chartHeight: 500,
        chartWidth: 500,
        content: customContent,
        iconSize: 14,
        inactiveColor: "#ccc",
        itemSorter: "dataKey",
        labelStyle: {},
        layout: "horizontal",
        margin: { bottom: 5, left: 5, right: 5, top: 5 },
        payload: [
          {
            color: "#3182bd",
            dataKey: "percent",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "percent",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "B",
              shape: Curve,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "B",
          },
          {
            color: "#3182bd",
            dataKey: "value",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "value",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "A",
              shape: Curve,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "A",
          },
        ],
        verticalAlign: "bottom",
        width: 490,
      });
    });
  });
});
