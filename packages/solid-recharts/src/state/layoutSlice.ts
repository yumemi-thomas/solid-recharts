// Ported from recharts 3.8.1 src/state/layoutSlice.ts (commit 7a23854).
// Solid-native slice (no Redux): createStore + draft-first action setters.
import { createStore, produce } from "solid-js/store";
import { patched } from "./patched";
import { LayoutType, Margin, Size } from "../util/types";

export type ChartLayoutState = {
  layoutType: LayoutType;
  width: number;
  height: number;
  margin: Margin;
  /** How much the chart is zoomed in; used to scale mouse coordinates. */
  scale: number;
};

export const initialChartLayoutState: ChartLayoutState = {
  layoutType: "horizontal",
  width: 0,
  height: 0,
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
  scale: 1,
};

export interface ChartLayoutActions {
  setLayout(layoutType: LayoutType): void;
  setChartSize(size: Size): void;
  setMargin(margin: Partial<Margin>): void;
  setScale(scale: number): void;
}

export interface ChartLayoutSlice {
  readonly state: ChartLayoutState;
  readonly actions: ChartLayoutActions;
}

export function createChartLayoutSlice(
  initialState: ChartLayoutState = initialChartLayoutState,
): ChartLayoutSlice {
  const [state, setState] = createStore<ChartLayoutState>({
    ...initialState,
    margin: { ...initialState.margin },
  });

  const actions: ChartLayoutActions = {
    setLayout(layoutType) {
      setState(
        produce((s) => {
          s.layoutType = layoutType;
        }),
      );
    },
    setChartSize(size) {
      setState(
        produce((s) => {
          s.width = size.width;
          s.height = size.height;
        }),
      );
    },
    setMargin(margin) {
      // Slice immutability contract (ADR-0002): replace the margin node.
      setState(
        produce((s) => {
          s.margin = patched(s.margin, {
            top: margin.top ?? 0,
            right: margin.right ?? 0,
            bottom: margin.bottom ?? 0,
            left: margin.left ?? 0,
          });
        }),
      );
    },
    setScale(scale) {
      setState(
        produce((s) => {
          s.scale = scale;
        }),
      );
    },
  };

  return { state, actions };
}
