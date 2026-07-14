// Solid port of recharts 3.8.1 test/helper/parameterizedTestCases.tsx (commit 7a23854).
// Minimal subset: BarChart + ComposedChart cases used by cartesian/Bar/Bar.spec.tsx.
import type { JSX } from "solid-js";
import type { CartesianLayout, EventThrottlingProps } from "../../src/util/types";
import { AreaChart, BarChart, ComposedChart, LineChart, Scatter, ScatterChart } from "../../src";
import type { TooltipIndex } from "../../src/state/tooltipSlice";

export type CartesianChartTestCase = {
  ChartElement: (
    props: {
      children?: JSX.Element;
      width?: number;
      height?: number;
      data?: unknown[];
      layout?: CartesianLayout;
      compact?: boolean;
      class?: string;
      onClick?: (param: unknown) => void;
      onMouseEnter?: (param: unknown) => void;
      onMouseMove?: (param: unknown) => void;
      onMouseLeave?: (param: unknown) => void;
      onTouchStart?: (param: unknown) => void;
      onTouchMove?: (param: unknown) => void;
      onTouchEnd?: (param: unknown) => void;
    } & EventThrottlingProps,
  ) => JSX.Element;
  testName: string;
  tooltipIndex: NonNullable<TooltipIndex>;
};

export const ComposedChartCase: CartesianChartTestCase = {
  ChartElement: (props) => <ComposedChart width={500} height={500} {...props} />,
  testName: "ComposedChart",
  tooltipIndex: "0",
};

export const AreaChartCase: CartesianChartTestCase = {
  ChartElement: (props) => <AreaChart width={500} height={500} {...props} />,
  testName: "AreaChart",
  tooltipIndex: "0",
};

export const LineChartCase: CartesianChartTestCase = {
  ChartElement: (props) => <LineChart width={500} height={500} {...props} />,
  testName: "LineChart",
  tooltipIndex: "0",
};

export const BarChartCase: CartesianChartTestCase = {
  ChartElement: (props) => <BarChart width={500} height={500} {...props} />,
  testName: "BarChart",
  tooltipIndex: "0",
};

export const ScatterChartCase: CartesianChartTestCase = {
  ChartElement: (props) => (
    <ScatterChart width={500} height={500} {...props}>
      <Scatter />
    </ScatterChart>
  ),
  testName: "ScatterChart",
  tooltipIndex: "0",
};

// Bar.spec's matrix: ComposedChart accepts <Bar>, so the "must not render" set is
// only the non-composed cartesian charts. Keep this list unchanged.
const barMatrixChartCases: ReadonlyArray<CartesianChartTestCase> = [
  ComposedChartCase,
  BarChartCase,
  ScatterChartCase,
];

// The full set of cartesian charts used by `allCartesianChartsExcept` (Area.spec's
// render-gate matrix). Includes the dedicated AreaChart/LineChart cases.
const allCartesianChartCases: ReadonlyArray<CartesianChartTestCase> = [
  ComposedChartCase,
  AreaChartCase,
  LineChartCase,
  BarChartCase,
  ScatterChartCase,
];

/** Charts where `<Bar />` must not render rectangles (recharts Bar.spec matrix). */
export function chartsWhereBarMustNotRender(
  exceptions: ReadonlyArray<CartesianChartTestCase>,
): ReadonlyArray<CartesianChartTestCase> {
  return barMatrixChartCases.filter(
    (testCase) => !exceptions.some((e) => e.testName === testCase.testName),
  );
}

/** Cartesian charts EXCEPT the given exceptions (recharts allCartesianChartsExcept). */
export function allCartesianChartsExcept(
  exceptions: ReadonlyArray<CartesianChartTestCase>,
): ReadonlyArray<CartesianChartTestCase> {
  return allCartesianChartCases.filter(
    (testCase) => !exceptions.some((e) => e.testName === testCase.testName),
  );
}
