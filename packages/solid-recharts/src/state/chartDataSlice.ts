// Ported from recharts 3.8.1 src/state/chartDataSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE of the state layer (no Redux — see the project's
// state-architecture decision). A "slice" becomes a factory that creates a Solid
// `createStore` plus action functions that update it with draft-first setters.
// The reducer + action-creator shape of RTK is gone; consumers call the action
// functions directly, and selectors read `state` inside a `createMemo`.
//
// `castDraft`/immer are unnecessary — Solid's store setter takes a mutable draft.
import { createStore } from "solid-js";
import { BrushStartEndIndex } from "../context/brushUpdateContext";

/**
 * This is the data that's coming through main chart `data` prop
 * Recharts is very flexible in what it accepts so the type is very flexible too.
 * This will typically be an object, and various components will provide various `dataKey`
 * that dictates how to pull data from that object.
 *
 * TL;DR: before dataKey
 *
 * @inline
 */
export type ChartData<DataPointType = unknown> = ReadonlyArray<DataPointType>;

/**
 * So this is the same unknown type as ChartData but this is after the dataKey has been applied.
 * We still don't know what the type is - that depends on what exactly it was before the dataKey application,
 * and the dataKey can return whatever anyway - but let's keep it separate as a form of documentation.
 *
 * TL;DR: ChartData after dataKey.
 */
export type AppliedChartData = ReadonlyArray<{ value: unknown }>;

export type ChartDataState = {
  chartData: ChartData | undefined;
  /**
   * store a copy of chart data after it has been processed by each chart's specific
   * compute functions. TODO: add other charts besides Sankey
   */
  computedData: unknown | undefined;
  /**
   * Using Brush, users can choose where they want to zoom in.
   * This is zero-based index of the starting data point.
   */
  dataStartIndex: number;
  /**
   * Using Brush, users can choose where they want to zoom in.
   * This is zero-based index of the last data point.
   */
  dataEndIndex: number;
};

export const initialChartDataState: ChartDataState = {
  chartData: undefined,
  computedData: undefined,
  dataStartIndex: 0,
  dataEndIndex: 0,
};

type BrushStartEndIndexActionPayload = Partial<BrushStartEndIndex>;

export interface ChartDataActions {
  setChartData(chartData: ChartData | undefined): void;
  setComputedData(computedData: unknown): void;
  setDataStartEndIndexes(payload: BrushStartEndIndexActionPayload): void;
}

export interface ChartDataSlice {
  readonly state: ChartDataState;
  readonly actions: ChartDataActions;
}

/**
 * Creates the chartData slice: a reactive store plus its action functions.
 * Equivalent to recharts' `createSlice({ name: 'chartData', ... })`, but the
 * store is a Solid store and the actions mutate it directly.
 */
export function createChartDataSlice(
  initialState: ChartDataState = initialChartDataState,
): ChartDataSlice {
  const [state, setState] = createStore<ChartDataState>({ ...initialState });

  const actions: ChartDataActions = {
    setChartData(chartData) {
      setState((s) => {
        s.chartData = chartData;
        if (chartData == null) {
          s.dataStartIndex = 0;
          s.dataEndIndex = 0;
          return;
        }
        if (chartData.length > 0 && s.dataEndIndex !== chartData.length - 1) {
          s.dataEndIndex = chartData.length - 1;
        }
      });
    },
    setComputedData(computedData) {
      setState((s) => {
        s.computedData = computedData;
      });
    },
    setDataStartEndIndexes({ startIndex, endIndex }) {
      setState((s) => {
        if (startIndex != null) {
          s.dataStartIndex = startIndex;
        }
        if (endIndex != null) {
          s.dataEndIndex = endIndex;
        }
      });
    },
  };

  return { state, actions };
}
