// Ported from recharts 3.8.1 src/chart/PolarChart.tsx (commit 7a23854).
//
// Solid deviations: `forwardRef` → `ref` prop; `resolveDefaultProps` → per-field
// `?? default` accessors (see the defaults-use-solid-merge memory). Mirrors the
// Solid CartesianChart, with `layout` defaulting to "radial", `baseValue` always
// undefined for polar, and a ReportPolarOptions reporting the polar geometry.
// The polar geometry props (cx/cy/innerRadius/outerRadius/startAngle/endAngle)
// pass through to CategoricalChart exactly as in the reference — svgPropertiesNoEvents
// forwards cx/cy onto the root <svg> (faithful) and drops the rest.
import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { ChartOptions } from "../state/optionsSlice";
import { RechartsStoreProvider } from "../state/RechartsStoreProvider";
import { ChartDataContextProvider } from "../context/chartDataContext";
import { ReportMainChartProps } from "../state/ReportMainChartProps";
import { ReportChartProps } from "../state/ReportChartProps";
import { ReportEventSettings } from "../state/ReportEventSettings";
import { ReportPolarOptions } from "../state/ReportPolarOptions";
import { Margin, PolarChartProps, PolarLayout, TooltipEventType } from "../util/types";
import { TooltipPayloadSearcher } from "../state/tooltipSlice";
import { UpdatableChartOptions } from "../state/rootPropsSlice";
import { PolarChartOptions as PolarOptionsPayload } from "../state/polarOptionsSlice";
import { CategoricalChart } from "./CategoricalChart";

const defaultMargin: Margin = { top: 5, right: 5, bottom: 5, left: 5 };

/**
 * One-time, immutable options that decide a Polar chart's behavior. Users
 * usually go through a convenience component (PieChart, RadarChart, …) which
 * supplies the cx/cy/innerRadius/outerRadius/startAngle/endAngle defaults.
 */
export interface PolarChartOptions {
  chartName: string;
  defaultTooltipEventType: TooltipEventType;
  validateTooltipEventTypes: ReadonlyArray<TooltipEventType>;
  tooltipPayloadSearcher: TooltipPayloadSearcher;
  categoricalChartProps: PolarChartProps;
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

export const PolarChart = (props: PolarChartOptions): JSX.Element => {
  const cp = (): PolarChartProps => props.categoricalChartProps;

  const options = (): ChartOptions => ({
    chartName: props.chartName,
    defaultTooltipEventType: props.defaultTooltipEventType,
    validateTooltipEventTypes: props.validateTooltipEventTypes,
    tooltipPayloadSearcher: props.tooltipPayloadSearcher,
    eventEmitter: undefined,
  });

  const layout = (): PolarLayout => cp().layout ?? "radial";
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
    // Polar charts never expose a baseValue.
    baseValue: undefined,
    reverseStackOrder: cp().reverseStackOrder ?? false,
  });

  const polar = (): PolarOptionsPayload => ({
    cx: cp().cx ?? "50%",
    cy: cp().cy ?? "50%",
    startAngle: cp().startAngle ?? 0,
    endAngle: cp().endAngle ?? 360,
    innerRadius: cp().innerRadius ?? 0,
    outerRadius: cp().outerRadius ?? "80%",
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
      <ReportPolarOptions {...polar()} />
      {/* Spread WITHOUT children (a `{...cp()}` spread eagerly evaluates the
          children getter here, before the provider sets context — running them
          outside the store); pass children as a lazy JSX child instead. */}
      <CategoricalChart {...omit(cp(), "children")} ref={props.ref}>
        {cp().children}
      </CategoricalChart>
    </RechartsStoreProvider>
  );
};
