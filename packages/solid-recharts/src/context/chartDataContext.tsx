// Ported from recharts 3.8.1 src/context/chartDataContext.tsx (commit 7a23854).
//
// Solid deviations: `useAppDispatch` + action creators → `useAppStore()` + slice
// actions (`store.actions.chartData.*`); `useEffect` → `createEffect` + `onCleanup`;
// selector hooks return
// Accessors (since `useAppSelector` does). `SetComputedData` and the BrushStartEndIndex
// type are kept local; the latter re-homes to brushUpdateContext when ported.
import { type Accessor, createEffect, on, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { ChartData } from "../state/chartDataSlice";
import { useAppSelector, useAppStore } from "../state/hooks";
import { RechartsRootState } from "../state/store";
import { useIsPanorama } from "./PanoramaContext";

interface BrushStartEndIndex {
  startIndex: number;
  endIndex: number;
}

export const ChartDataContextProvider = (props: {
  chartData: ChartData | undefined;
}): JSX.Element => {
  const store = useAppStore();
  const isPanorama = useIsPanorama();

  createEffect(
    on(
      () => props.chartData,
      (chartData) => {
        // Panorama mode reuses the main chart's data — don't overwrite it.
        if (isPanorama) {
          return undefined;
        }
        store?.actions.chartData.setChartData(chartData);
        onCleanup(() => {
          store?.actions.chartData.setChartData(undefined);
        });
      },
    ),
  );

  return null;
};

export const SetComputedData = (props: { computedData: unknown }): JSX.Element => {
  const store = useAppStore();

  createEffect(
    on(
      () => props.computedData,
      (computedData) => {
        store?.actions.chartData.setComputedData(computedData);
        onCleanup(() => {
          store?.actions.chartData.setChartData(undefined);
        });
      },
    ),
  );

  return null;
};

const selectChartData = (state: RechartsRootState): ChartData | undefined =>
  state.chartData.chartData;

/**
 * Returns the chart's `data` array (set on the chart root), or `undefined`.
 * @deprecated use a more specific selector depending on how the graphical item identifies its data.
 */
export const useChartData = (): Accessor<ChartData | undefined> => useAppSelector(selectChartData);

const selectDataIndex = (state: RechartsRootState): BrushStartEndIndex => {
  const { dataStartIndex, dataEndIndex } = state.chartData;
  return { startIndex: dataStartIndex, endIndex: dataEndIndex };
};

/**
 * startIndex and endIndex are data boundaries set through Brush.
 */
export const useDataIndex = (): Accessor<BrushStartEndIndex | undefined> => {
  return useAppSelector(selectDataIndex);
};
