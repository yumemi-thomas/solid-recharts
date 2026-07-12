// Ported from recharts 3.8.1 src/chart/CartesianChart.tsx (commit 7a23854).
//
// Solid deviations: `forwardRef` → `ref` prop; `resolveDefaultProps` → per-field
// `?? default` accessors (see the defaults-use-solid-merge memory — using
// explicit nullish-coalescing avoids `merge`'s undefined-override gotcha AND the
// required-ness typing gap). Provider + Report components mirror recharts.
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { ChartOptions } from "../state/optionsSlice";
import { RechartsStoreProvider } from "../state/RechartsStoreProvider";
import { ChartDataContextProvider } from "../context/chartDataContext";
import { ReportMainChartProps } from "../state/ReportMainChartProps";
import { ReportChartProps } from "../state/ReportChartProps";
import { ReportEventSettings } from "../state/ReportEventSettings";
import { CartesianChartProps, LayoutType, Margin, TooltipEventType } from "../util/types";
import { TooltipPayloadSearcher } from "../state/tooltipSlice";
import { UpdatableChartOptions } from "../state/rootPropsSlice";
import { CategoricalChart } from "./CategoricalChart";
import { useIsPanorama } from "../context/PanoramaContext";

const defaultMargin: Margin = { top: 5, right: 5, bottom: 5, left: 5 };

/**
 * One-time, immutable options that decide a Cartesian chart's behavior. Users
 * usually go through a convenience component (LineChart, BarChart, …).
 */
export interface CartesianChartOptions {
  chartName: string;
  defaultTooltipEventType: TooltipEventType;
  validateTooltipEventTypes: ReadonlyArray<TooltipEventType>;
  tooltipPayloadSearcher: TooltipPayloadSearcher;
  categoricalChartProps: CartesianChartProps;
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export const CartesianChart = (props: CartesianChartOptions): JSX.Element => {
  const cp = (): CartesianChartProps => props.categoricalChartProps;

  // Brush panorama: a nested `<SomeChart>` inside `<Brush>` is an overview of the
  // OUTER chart's full dataset. Instead of recharts' cloneElement-into-the-main-
  // surface, render this nested chart's graphical items directly into the existing
  // panorama context — they register into the outer store and draw into the brush's
  // panorama surface (isPanorama=true → full data range + brush viewBox). No new
  // store/wrapper/surface; the chart-level props (width/height/data) are the outer's.
  if (useIsPanorama()) {
    return <>{cp().children}</>;
  }

  const options = (): ChartOptions => ({
    chartName: props.chartName,
    defaultTooltipEventType: props.defaultTooltipEventType,
    validateTooltipEventTypes: props.validateTooltipEventTypes,
    tooltipPayloadSearcher: props.tooltipPayloadSearcher,
    eventEmitter: undefined,
  });

  const layout = (): LayoutType => cp().layout ?? "horizontal";
  const margin = (): Partial<Margin> => cp().margin ?? defaultMargin;

  const updatable = (): UpdatableChartOptions => ({
    accessibilityLayer: cp().accessibilityLayer ?? true,
    barCategoryGap: cp().barCategoryGap ?? "10%",
    barGap: cp().barGap ?? 4,
    barSize: cp().barSize,
    class: cp().class,
    maxBarSize: cp().maxBarSize,
    stackOffset: cp().stackOffset ?? "none",
    syncId: cp().syncId,
    syncMethod: cp().syncMethod ?? "index",
    baseValue: cp().baseValue,
    reverseStackOrder: cp().reverseStackOrder ?? false,
  });

  return (
    <RechartsStoreProvider preloadedState={{ options: options() }}>
      <ChartDataContextProvider chartData={cp().data} />
      <ReportMainChartProps layout={layout()} margin={margin()} />
      <ReportEventSettings
        throttleDelay={cp().throttleDelay}
        throttledEvents={cp().throttledEvents}
      />
      <ReportChartProps {...updatable()} />
      {/* Spread WITHOUT children (a `{...cp()}` spread eagerly evaluates the
          children getter here, before the provider sets context — running them
          outside the store); pass children as a lazy JSX child instead. */}
      <CategoricalChart {...omit(cp(), "children")} ref={props.ref}>
        {cp().children}
      </CategoricalChart>
    </RechartsStoreProvider>
  );
};
