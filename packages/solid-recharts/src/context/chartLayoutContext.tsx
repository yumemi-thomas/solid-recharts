// Ported from recharts 3.8.1 src/context/chartLayoutContext.tsx (commit 7a23854).
//
// Solid deviations: selector hooks return Accessors (since `useAppSelector`
// does); `useAppDispatch` + action creators → `useAppStore().actions` +
// `createEffect`. Brush/responsive reads go through the current stubs.
import { createEffect, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  CartesianLayout,
  CartesianViewBoxRequired,
  ChartOffsetInternal,
  LayoutType,
  Margin,
  Percent,
  PolarLayout,
  TrapezoidViewBox,
} from "../util/types";
import { useAppSelector, useAppStore } from "../state/hooks";
import { RechartsRootState } from "../state/store";
import {
  selectChartOffsetInternal,
  selectChartViewBox,
} from "../state/selectors/selectChartOffsetInternal";
import { selectChartHeight, selectChartWidth } from "../state/selectors/containerSelectors";
import { useIsPanorama } from "./PanoramaContext";
import { selectBrushDimensions, selectBrushSettings } from "../state/selectors/brushSelectors";
import { useResponsiveContainerContext } from "../component/ResponsiveContainer";
import { isPositiveNumber } from "../util/isWellBehavedNumber";

export function cartesianViewBoxToTrapezoid(box: undefined): undefined;
export function cartesianViewBoxToTrapezoid(
  box: CartesianViewBoxRequired | TrapezoidViewBox,
): TrapezoidViewBox;
export function cartesianViewBoxToTrapezoid(
  box: CartesianViewBoxRequired | TrapezoidViewBox | undefined,
): TrapezoidViewBox | undefined {
  if (!box) {
    return undefined;
  }
  return {
    x: box.x,
    y: box.y,
    upperWidth: "upperWidth" in box ? box.upperWidth : box.width,
    lowerWidth: "lowerWidth" in box ? box.lowerWidth : box.width,
    width: box.width,
    height: box.height,
  };
}

export const useViewBox = (): Accessor<CartesianViewBoxRequired | undefined> => {
  const panorama = useIsPanorama();
  const rootViewBox = useAppSelector(selectChartViewBox);
  const brushDimensions = useAppSelector(selectBrushDimensions);
  const brushSettings = useAppSelector(selectBrushSettings);
  return () => {
    const padding = brushSettings()?.padding;
    const dims = brushDimensions();
    if (!panorama || !dims || !padding) {
      return rootViewBox();
    }
    return {
      width: dims.width - padding.left - padding.right,
      height: dims.height - padding.top - padding.bottom,
      x: padding.left,
      y: padding.top,
    };
  };
};

const manyComponentsThrowErrorsIfOffsetIsUndefined: ChartOffsetInternal = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 0,
  height: 0,
  brushBottom: 0,
};

/** Internal. Returns the chart offset in pixels (or a zeroed default). */
export const useOffsetInternal = (): Accessor<ChartOffsetInternal> => {
  const offset = useAppSelector(selectChartOffsetInternal);
  return () => offset() ?? manyComponentsThrowErrorsIfOffsetIsUndefined;
};

/** Width of the chart in pixels, or `undefined` outside a chart context. */
export const useChartWidth = (): Accessor<number | undefined> => useAppSelector(selectChartWidth);

/** Height of the chart in pixels, or `undefined` outside a chart context. */
export const useChartHeight = (): Accessor<number | undefined> => useAppSelector(selectChartHeight);

/** Margin (empty space around the chart, excluding axes/legend/brushes). */
export const useMargin = (): Accessor<Margin | undefined> =>
  useAppSelector((state) => state.layout.margin);

export const selectChartLayout = (state: RechartsRootState): LayoutType => state.layout.layoutType;

export const useChartLayout = (): Accessor<LayoutType | undefined> =>
  useAppSelector(selectChartLayout);

export const useCartesianChartLayout = (): Accessor<CartesianLayout | undefined> => {
  const layout = useChartLayout();
  return () => {
    const l = layout();
    return l === "horizontal" || l === "vertical" ? l : undefined;
  };
};

export const selectPolarChartLayout = (state: RechartsRootState): PolarLayout | undefined => {
  const layout = state.layout.layoutType;
  return layout === "centric" || layout === "radial" ? layout : undefined;
};

export const usePolarChartLayout = (): Accessor<PolarLayout | undefined> =>
  useAppSelector(selectPolarChartLayout);

/** True if rendered inside a chart context (all charts provide a layout type). */
export const useIsInChartContext = (): Accessor<boolean> => {
  const layout = useChartLayout();
  return () => layout() !== undefined;
};

export const ReportChartSize = (props: {
  width: number | Percent | undefined;
  height: number | Percent | undefined;
}): JSX.Element => {
  const store = useAppStore();
  const isPanorama = useIsPanorama();
  const responsive = useResponsiveContainerContext();

  // Prefer ResponsiveContainer-measured dimensions when present (3.x behavior).
  const width = (): number | Percent | undefined =>
    responsive && responsive.width > 0 ? responsive.width : props.width;
  const height = (): number | Percent | undefined =>
    responsive && responsive.height > 0 ? responsive.height : props.height;

  createEffect(
    () => ({ width: width(), height: height() }),
    ({ width: w, height: h }) => {
      if (!isPanorama && isPositiveNumber(w) && isPositiveNumber(h)) {
        store?.actions.layout.setChartSize({ width: w, height: h });
      }
    },
  );

  return null;
};

export const ReportChartMargin = (props: { margin: Partial<Margin> }): JSX.Element => {
  const store = useAppStore();
  createEffect(
    () => props.margin,
    (margin) => {
      store?.actions.layout.setMargin(margin);
    },
  );
  return null;
};
