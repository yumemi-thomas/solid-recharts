// Ported from recharts 3.8.1 src/state/renderedTicksSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer).
//
// Stores the ACTUALLY rendered ticks. The domain→ticks mapping lives in the
// cartesianAxis selectors, but CartesianAxis uses DOM measurement to decide which
// ticks to actually render; this slice stores those so a hook can return them.
import { createStore, produce } from "solid-js/store";
import { TickItem } from "../util/types";
import { AxisId } from "./cartesianAxisSlice";

type RenderedTicksAxisState = {
  [axisId: AxisId]: ReadonlyArray<TickItem>;
};

export type RenderedTicksState = {
  xAxis: RenderedTicksAxisState;
  yAxis: RenderedTicksAxisState;
};

export const initialRenderedTicksState: RenderedTicksState = {
  xAxis: {},
  yAxis: {},
};

export interface RenderedTicksActions {
  setRenderedTicks(payload: {
    axisType: "xAxis" | "yAxis";
    axisId: AxisId;
    ticks: ReadonlyArray<TickItem>;
  }): void;
  removeRenderedTicks(payload: { axisType: "xAxis" | "yAxis"; axisId: AxisId }): void;
}

export interface RenderedTicksSlice {
  readonly state: RenderedTicksState;
  readonly actions: RenderedTicksActions;
}

export function createRenderedTicksSlice(
  initialState: RenderedTicksState = initialRenderedTicksState,
): RenderedTicksSlice {
  const [state, setState] = createStore<RenderedTicksState>({
    xAxis: { ...initialState.xAxis },
    yAxis: { ...initialState.yAxis },
  });

  const actions: RenderedTicksActions = {
    setRenderedTicks({ axisType, axisId, ticks }) {
      setState(
        produce((s) => {
          s[axisType][axisId] = ticks;
        }),
      );
    },
    removeRenderedTicks({ axisType, axisId }) {
      setState(
        produce((s) => {
          delete s[axisType][axisId];
        }),
      );
    },
  };

  return { state, actions };
}
