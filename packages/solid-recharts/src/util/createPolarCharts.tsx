// Ported from recharts 3.8.1 src/util/createPolarCharts.tsx.
// Solid-native: React.ComponentType → `(props) => JSX.Element`; layout binding
// via `merge()`.
import type { JSX } from "@solidjs/web";
import { RadialBarChart as OriginalRadialBarChart } from "../chart/RadialBarChart";
import { RadarChart as OriginalRadarChart } from "../chart/RadarChart";
import { PieChart as OriginalPieChart } from "../chart/PieChart";
import type { PolarChartProps } from "./types";

type Component<P> = (props: P) => JSX.Element;
type ChartComponent<TData> = Component<Omit<PolarChartProps<TData>, "layout">>;

export type TypedCentricChartContext<TData, _TCategorical, _TNumerical, TComponents> = {
  RadarChart: ChartComponent<TData>;
} & Omit<TComponents, "RadialBar" | "RadialBarChart" | "Pie" | "PieChart">;

export type TypedRadialChartContext<TData, _TCategorical, _TNumerical, TComponents> = {
  RadialBarChart: ChartComponent<TData>;
  PieChart: ChartComponent<TData>;
} & Omit<TComponents, "Radar" | "RadarChart">;

export type NoRadial<T> = "RadialBar" extends keyof T
  ? never
  : "RadialBarChart" extends keyof T
    ? never
    : "Pie" extends keyof T
      ? never
      : "PieChart" extends keyof T
        ? never
        : T;

export type NoCentric<T> = "Radar" extends keyof T
  ? never
  : "RadarChart" extends keyof T
    ? never
    : T;

/**
 * Creates a typed context for centric Polar charts. Curries chart definitions to
 * strictly bind `layout="centric"`. Rejects radial-only elements (`RadialBar`,
 * `Pie`, etc.) at compile time.
 *
 * @since 3.8
 */
export function createCentricChart<TData, TCategorical = string, TNumerical = number>() {
  return function withComponents<TComponents extends Record<string, unknown>>(
    components: NoRadial<TComponents>,
  ): TypedCentricChartContext<TData, TCategorical, TNumerical, TComponents> {
    const RadarChart: ChartComponent<TData> = (props) => (
      <OriginalRadarChart {...props} layout="centric" />
    );
    // eslint-disable-next-line typescript/consistent-type-assertions -- runtime identity preserved; type is a remap
    return {
      RadarChart,
      // eslint-disable-next-line typescript/consistent-type-assertions -- NoRadial<T> narrows to T at runtime
      ...(components as TComponents),
    } as unknown as TypedCentricChartContext<TData, TCategorical, TNumerical, TComponents>;
  };
}

/**
 * Creates a typed context for radial Polar charts. Curries chart definitions to
 * strictly bind `layout="radial"`. Rejects centric-only elements (`Radar`,
 * `RadarChart`) at compile time.
 *
 * @since 3.8
 */
export function createRadialChart<TData, TCategorical = string, TNumerical = number>() {
  return function withComponents<TComponents extends Record<string, unknown>>(
    components: NoCentric<TComponents>,
  ): TypedRadialChartContext<TData, TCategorical, TNumerical, TComponents> {
    const RadialBarChart: ChartComponent<TData> = (props) => (
      <OriginalRadialBarChart {...props} layout="radial" />
    );
    const PieChart: ChartComponent<TData> = (props) => (
      <OriginalPieChart {...props} layout="radial" />
    );
    // eslint-disable-next-line typescript/consistent-type-assertions -- runtime identity preserved; type is a remap
    return {
      RadialBarChart,
      PieChart,
      // eslint-disable-next-line typescript/consistent-type-assertions -- NoCentric<T> narrows to T at runtime
      ...(components as TComponents),
    } as unknown as TypedRadialChartContext<TData, TCategorical, TNumerical, TComponents>;
  };
}
