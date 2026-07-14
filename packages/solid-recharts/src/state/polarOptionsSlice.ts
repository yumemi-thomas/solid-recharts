// Ported from recharts 3.8.1 src/state/polarOptionsSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE. recharts' slice state is `PolarChartOptions | null`
// (a nullable top-level value). Solid's `createStore` requires an object, so the
// nullable value is wrapped in a `{ current }` store; `store.ts` re-exposes it as
// a reactive `polarOptions` getter so `state.polarOptions` stays `… | null`.
// The reducer mutates fields in place when already set (preserving identity),
// matching the reference.
import { createStore, produce } from "solid-js/store";

export type PolarChartOptions = {
  cx: number | string;
  cy: number | string;
  startAngle: number;
  endAngle: number;
  innerRadius: number | string;
  outerRadius: number | string;
};

export type PolarChartState = PolarChartOptions | null;

export interface PolarOptionsActions {
  updatePolarOptions(payload: PolarChartOptions): void;
}

export interface PolarOptionsSlice {
  /** Wrapper around the nullable value; read `state.current`. */
  readonly state: { readonly current: PolarChartState };
  readonly actions: PolarOptionsActions;
}

export function createPolarOptionsSlice(initialState: PolarChartState = null): PolarOptionsSlice {
  const [state, setState] = createStore<{ current: PolarChartState }>({ current: initialState });

  const actions: PolarOptionsActions = {
    updatePolarOptions(payload) {
      setState(
        produce((s) => {
          const prev = s.current;
          if (prev === null) {
            s.current = payload;
            return;
          }
          prev.startAngle = payload.startAngle;
          prev.endAngle = payload.endAngle;
          prev.cx = payload.cx;
          prev.cy = payload.cy;
          prev.innerRadius = payload.innerRadius;
          prev.outerRadius = payload.outerRadius;
        }),
      );
    },
  };

  return { state, actions };
}
