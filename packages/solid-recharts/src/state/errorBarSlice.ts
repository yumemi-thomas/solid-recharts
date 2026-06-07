// Ported from recharts 3.8.1 src/state/errorBarSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE (no Redux/immer). Keyed by the graphical item's id;
// each item holds an array of ErrorBarsSettings. recharts matches for
// replace/remove by (dataKey, direction) — kept verbatim (these are the error
// bar's identity within an item).
import { createStore } from "solid-js";
import type { ErrorBarDirection } from "../cartesian/ErrorBar";
import { DataKey } from "../util/types";
import { GraphicalItemId } from "./graphicalItemsSlice";

/**
 * ErrorBars have many settings, but only the ones an axis needs to extend its
 * domain are reported to the store: the direction and the dataKey.
 */
export type ErrorBarsSettings = {
  /**
   * Only meaningful in Scatter (both directions possible); elsewhere it's derived
   * from the chart layout.
   */
  direction: ErrorBarDirection;
  /** Which data property each ErrorBar reads; can stretch the axis domain. */
  dataKey: DataKey<unknown>;
};

export type ErrorBarsState = Record<GraphicalItemId, ReadonlyArray<ErrorBarsSettings>>;

export const initialErrorBarsState: ErrorBarsState = {};

interface AddPayload {
  itemId: GraphicalItemId;
  errorBar: ErrorBarsSettings;
}
interface ReplacePayload {
  itemId: GraphicalItemId;
  prev: ErrorBarsSettings;
  next: ErrorBarsSettings;
}

export interface ErrorBarsActions {
  addErrorBar(payload: AddPayload): void;
  replaceErrorBar(payload: ReplacePayload): void;
  removeErrorBar(payload: AddPayload): void;
}

export interface ErrorBarsSlice {
  readonly state: ErrorBarsState;
  readonly actions: ErrorBarsActions;
}

const sameErrorBar = (a: ErrorBarsSettings, b: ErrorBarsSettings): boolean =>
  a.dataKey === b.dataKey && a.direction === b.direction;

export function createErrorBarSlice(
  initialState: ErrorBarsState = initialErrorBarsState,
): ErrorBarsSlice {
  const [state, setState] = createStore<ErrorBarsState>({ ...initialState });

  const actions: ErrorBarsActions = {
    addErrorBar({ itemId, errorBar }) {
      setState((s) => {
        s[itemId] = [...(s[itemId] ?? []), errorBar];
      });
    },
    replaceErrorBar({ itemId, prev, next }) {
      setState((s) => {
        const list = s[itemId];
        if (list) {
          s[itemId] = list.map((e) => (sameErrorBar(e, prev) ? next : e));
        }
      });
    },
    removeErrorBar({ itemId, errorBar }) {
      setState((s) => {
        const list = s[itemId];
        if (list) {
          s[itemId] = list.filter((e) => !sameErrorBar(e, errorBar));
        }
      });
    },
  };

  return { state, actions };
}
