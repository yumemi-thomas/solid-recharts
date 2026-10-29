// Ported from recharts 3.8.1 src/util/createCartesianCharts.tsx.
// Solid-native: React.ComponentType → `(props) => JSX.Element`. The layout
// binding wrapper spreads the user props then sets `layout` as a static
// attribute LAST, so the bound layout wins over any passed value; the public
// type omits `layout` so TS rejects it too.
import type { JSX } from "@solidjs/web";
import { AreaChart as OriginalAreaChart } from "../chart/AreaChart";
import { BarChart as OriginalBarChart } from "../chart/BarChart";
import { LineChart as OriginalLineChart } from "../chart/LineChart";
import { ComposedChart as OriginalComposedChart } from "../chart/ComposedChart";
import { ScatterChart as OriginalScatterChart } from "../chart/ScatterChart";
import { FunnelChart as OriginalFunnelChart } from "../chart/FunnelChart";
import type { CartesianChartProps } from "./types";

type Component<P> = (props: P) => JSX.Element;
type ChartComponent<TData> = Component<Omit<CartesianChartProps<TData>, "layout">>;

export type TypedHorizontalChartContext<TData, _TCategorical, _TNumerical, TComponents> = {
  AreaChart: ChartComponent<TData>;
  BarChart: ChartComponent<TData>;
  LineChart: ChartComponent<TData>;
  ComposedChart: ChartComponent<TData>;
  ScatterChart: ChartComponent<TData>;
} & Omit<TComponents, "Funnel" | "FunnelChart">;

export type TypedVerticalChartContext<TData, _TCategorical, _TNumerical, TComponents> = {
  AreaChart: ChartComponent<TData>;
  BarChart: ChartComponent<TData>;
  LineChart: ChartComponent<TData>;
  ComposedChart: ChartComponent<TData>;
  ScatterChart: ChartComponent<TData>;
  FunnelChart: ChartComponent<TData>;
} & TComponents;

const createCartesianCharts = <TData,>(
  layout: "horizontal" | "vertical",
): {
  AreaChart: ChartComponent<TData>;
  BarChart: ChartComponent<TData>;
  LineChart: ChartComponent<TData>;
  ComposedChart: ChartComponent<TData>;
  ScatterChart: ChartComponent<TData>;
} => ({
  AreaChart: (props) => <OriginalAreaChart {...props} layout={layout} />,
  BarChart: (props) => <OriginalBarChart {...props} layout={layout} />,
  LineChart: (props) => <OriginalLineChart {...props} layout={layout} />,
  ComposedChart: (props) => <OriginalComposedChart {...props} layout={layout} />,
  ScatterChart: (props) => <OriginalScatterChart {...props} layout={layout} />,
});

export type NoFunnel<T> = "Funnel" extends keyof T
  ? never
  : "FunnelChart" extends keyof T
    ? never
    : T;

/**
 * Creates a typed context for horizontal Cartesian charts. Curries the chart
 * definition to statically bind `layout="horizontal"`. Rejects strictly vertical
 * components (`Funnel`, `FunnelChart`) at compile time.
 *
 * @since 3.8
 */
export function createHorizontalChart<TData, TCategorical = string, TNumerical = number>() {
  return function withComponents<TComponents extends Record<string, unknown>>(
    components: NoFunnel<TComponents>,
  ): TypedHorizontalChartContext<TData, TCategorical, TNumerical, TComponents> {
    // `Object.assign` types the merge as an intersection, which `NoFunnel<T>` (T or
    // never) keeps assignable to the declared result — no cast needed.
    return Object.assign(createCartesianCharts<TData>("horizontal"), components);
  };
}

/**
 * Creates a typed context for vertical Cartesian charts. Curries the chart
 * definition to statically bind `layout="vertical"`. Natively supports strictly
 * vertical components like `Funnel` and `FunnelChart`.
 *
 * @since 3.8
 */
export function createVerticalChart<TData, TCategorical = string, TNumerical = number>() {
  return function withComponents<TComponents extends Record<string, unknown>>(
    components: TComponents,
  ): TypedVerticalChartContext<TData, TCategorical, TNumerical, TComponents> {
    const FunnelChart: ChartComponent<TData> = (props) => (
      <OriginalFunnelChart {...props} layout="vertical" />
    );
    return {
      ...createCartesianCharts<TData>("vertical"),
      FunnelChart,
      ...components,
    };
  };
}
