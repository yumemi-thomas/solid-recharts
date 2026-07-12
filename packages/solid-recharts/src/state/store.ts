// Solid-native replacement for recharts 3.8.1 src/state/store.ts.
//
// recharts uses @reduxjs/toolkit `configureStore` + `combineReducers` over 16
// slices. The Solid-native store has no reducers/dispatch: each slice is a
// factory returning `{ state, actions }` (a Solid store + its setters), and the
// root store composes them — `state` mirrors the slice state proxies, `actions`
// namespaces the slice actions by slice name (symmetric with `state`).
//
import { createChartDataSlice, type ChartDataActions, type ChartDataState } from "./chartDataSlice";
import {
  createChartLayoutSlice,
  type ChartLayoutActions,
  type ChartLayoutState,
} from "./layoutSlice";
import { createOptionsSlice, type ChartOptions, type OptionsActions } from "./optionsSlice";
import {
  createEventSettingsSlice,
  type EventSettingsActions,
  type EventSettingsState,
} from "./eventSettingsSlice";
import {
  createRootPropsSlice,
  type RootPropsActions,
  type UpdatableChartOptions,
} from "./rootPropsSlice";
import {
  createGraphicalItemsSlice,
  type GraphicalItemsActions,
  type GraphicalItemsState,
} from "./graphicalItemsSlice";
import {
  createCartesianAxisSlice,
  type AxisMapState,
  type CartesianAxisActions,
} from "./cartesianAxisSlice";
import { createPolarAxisSlice, type PolarAxisActions, type PolarAxisState } from "./polarAxisSlice";
import {
  createRenderedTicksSlice,
  type RenderedTicksActions,
  type RenderedTicksState,
} from "./renderedTicksSlice";
import { createZIndexSlice, type ZIndexActions, type ZIndexState } from "./zIndexSlice";
import { createBrushSlice, type BrushActions, type BrushSettings } from "./brushSlice";
import {
  createPolarOptionsSlice,
  type PolarChartState,
  type PolarOptionsActions,
} from "./polarOptionsSlice";
import { createTooltipSlice, type TooltipActions, type TooltipState } from "./tooltipSlice";
import { createLegendSlice, type LegendActions, type LegendState } from "./legendSlice";
import {
  createReferenceElementsSlice,
  type ReferenceElementsActions,
  type ReferenceElementState,
} from "./referenceElementsSlice";
import { createErrorBarSlice, type ErrorBarsActions, type ErrorBarsState } from "./errorBarSlice";

export type RechartsRootState = {
  chartData: ChartDataState;
  layout: ChartLayoutState;
  options: ChartOptions;
  eventSettings: EventSettingsState;
  rootProps: UpdatableChartOptions;
  graphicalItems: GraphicalItemsState;
  cartesianAxis: AxisMapState;
  polarAxis: PolarAxisState;
  renderedTicks: RenderedTicksState;
  zIndex: ZIndexState;
  brush: BrushSettings;
  polarOptions: PolarChartState;
  tooltip: TooltipState;
  legend: LegendState;
  referenceElements: ReferenceElementState;
  errorBars: ErrorBarsState;
};

export type RechartsActions = {
  chartData: ChartDataActions;
  layout: ChartLayoutActions;
  options: OptionsActions;
  eventSettings: EventSettingsActions;
  rootProps: RootPropsActions;
  graphicalItems: GraphicalItemsActions;
  cartesianAxis: CartesianAxisActions;
  polarAxis: PolarAxisActions;
  renderedTicks: RenderedTicksActions;
  zIndex: ZIndexActions;
  brush: BrushActions;
  polarOptions: PolarOptionsActions;
  tooltip: TooltipActions;
  legend: LegendActions;
  referenceElements: ReferenceElementsActions;
  errorBars: ErrorBarsActions;
};

export interface RechartsStore {
  readonly state: RechartsRootState;
  readonly actions: RechartsActions;
}

/**
 * Assembles the root store from the slice factories. Equivalent to recharts'
 * `createRechartsStore(preloadedState, chartName)`, minus the Redux runtime:
 * callers run `store.actions.<slice>.<fn>()` directly and read reactive state
 * via `useAppSelector`.
 */
export function createRechartsStore(preloadedState?: Partial<RechartsRootState>): RechartsStore {
  const chartData = createChartDataSlice(preloadedState?.chartData);
  const layout = createChartLayoutSlice(preloadedState?.layout);
  const options = createOptionsSlice(preloadedState?.options);
  const eventSettings = createEventSettingsSlice(preloadedState?.eventSettings);
  const rootProps = createRootPropsSlice(preloadedState?.rootProps);
  const graphicalItems = createGraphicalItemsSlice(preloadedState?.graphicalItems);
  const cartesianAxis = createCartesianAxisSlice(preloadedState?.cartesianAxis);
  const polarAxis = createPolarAxisSlice(preloadedState?.polarAxis);
  const renderedTicks = createRenderedTicksSlice(preloadedState?.renderedTicks);
  const zIndex = createZIndexSlice(preloadedState?.zIndex);
  const brush = createBrushSlice(preloadedState?.brush);
  const polarOptions = createPolarOptionsSlice(preloadedState?.polarOptions ?? null);
  const tooltip = createTooltipSlice(preloadedState?.tooltip);
  const legend = createLegendSlice(preloadedState?.legend);
  const referenceElements = createReferenceElementsSlice(preloadedState?.referenceElements);
  const errorBars = createErrorBarSlice(preloadedState?.errorBars);

  return {
    state: {
      chartData: chartData.state,
      layout: layout.state,
      options: options.state,
      eventSettings: eventSettings.state,
      rootProps: rootProps.state,
      graphicalItems: graphicalItems.state,
      cartesianAxis: cartesianAxis.state,
      polarAxis: polarAxis.state,
      renderedTicks: renderedTicks.state,
      zIndex: zIndex.state,
      brush: brush.state,
      // Reactive unwrap of the nullable polar-options store (read tracks `current`).
      get polarOptions(): PolarChartState {
        return polarOptions.state.current;
      },
      tooltip: tooltip.state,
      legend: legend.state,
      referenceElements: referenceElements.state,
      errorBars: errorBars.state,
    },
    actions: {
      chartData: chartData.actions,
      layout: layout.actions,
      options: options.actions,
      eventSettings: eventSettings.actions,
      rootProps: rootProps.actions,
      graphicalItems: graphicalItems.actions,
      cartesianAxis: cartesianAxis.actions,
      polarAxis: polarAxis.actions,
      renderedTicks: renderedTicks.actions,
      zIndex: zIndex.actions,
      brush: brush.actions,
      polarOptions: polarOptions.actions,
      tooltip: tooltip.actions,
      legend: legend.actions,
      referenceElements: referenceElements.actions,
      errorBars: errorBars.actions,
    },
  };
}
