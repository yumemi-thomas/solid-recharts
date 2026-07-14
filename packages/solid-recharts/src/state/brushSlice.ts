// Ported from recharts 3.8.1 src/state/brushSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux). Brush is a deferred vertical; this slice
// is wired into the store so the offset can read `brush.height` (0 by default).
import { createStore, produce } from "solid-js/store";
import { Padding } from "../util/types";

/**
 * Of all Brush properties, only `height` has a default and is always defined.
 * The others are nullable and computed from offsets/margins when not set.
 */
export type BrushSettings = {
  x: number | undefined;
  y: number | undefined;
  width: number | undefined;
  height: number;
  padding: Padding;
};

export const initialBrushState: BrushSettings = {
  // x/y/width are nullable: when unset, selectBrushDimensions derives them from the
  // chart offset (brush spans the plot width, just below the plot area).
  x: undefined,
  y: undefined,
  width: undefined,
  height: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};

export interface BrushActions {
  setBrushSettings(payload: BrushSettings | null): void;
}

export interface BrushSlice {
  readonly state: BrushSettings;
  readonly actions: BrushActions;
}

export function createBrushSlice(initialState: BrushSettings = initialBrushState): BrushSlice {
  const [state, setState] = createStore<BrushSettings>({
    ...initialState,
    padding: { ...initialState.padding },
  });

  const actions: BrushActions = {
    // The reducer replaces the whole settings object (or resets to initial when
    // null); draft-first assignment of every field applies the full replacement.
    setBrushSettings(payload) {
      const next = payload ?? initialBrushState;
      setState(
        produce((s) => {
          s.x = next.x;
          s.y = next.y;
          s.width = next.width;
          s.height = next.height;
          s.padding = { ...next.padding };
        }),
      );
    },
  };

  return { state, actions };
}
