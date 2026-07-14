// Ported from recharts 3.8.1 src/state/polarAxisSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer): createStore + draft-first actions.
// Polar charts are a deferred vertical; this slice is wired into the store so the
// polar axis registration path is ready when Radar/RadialBar/Pie land.
import { createStore, produce } from "solid-js/store";
import { AxisId, BaseCartesianAxis, TicksSettings } from "./cartesianAxisSlice";

export type RadiusAxisSettings = BaseCartesianAxis & TicksSettings;
export type AngleAxisSettings = BaseCartesianAxis & TicksSettings;

export type PolarAxisState = {
  radiusAxis: Record<AxisId, RadiusAxisSettings>;
  angleAxis: Record<AxisId, AngleAxisSettings>;
};

export const initialPolarAxisState: PolarAxisState = {
  radiusAxis: {},
  angleAxis: {},
};

export interface PolarAxisActions {
  addRadiusAxis(axis: RadiusAxisSettings): void;
  removeRadiusAxis(axis: RadiusAxisSettings): void;
  addAngleAxis(axis: AngleAxisSettings): void;
  removeAngleAxis(axis: AngleAxisSettings): void;
}

export interface PolarAxisSlice {
  readonly state: PolarAxisState;
  readonly actions: PolarAxisActions;
}

export function createPolarAxisSlice(
  initialState: PolarAxisState = initialPolarAxisState,
): PolarAxisSlice {
  const [state, setState] = createStore<PolarAxisState>({
    radiusAxis: { ...initialState.radiusAxis },
    angleAxis: { ...initialState.angleAxis },
  });

  const actions: PolarAxisActions = {
    addRadiusAxis(axis) {
      setState(
        produce((s) => {
          s.radiusAxis[axis.id] = axis;
        }),
      );
    },
    removeRadiusAxis(axis) {
      setState(
        produce((s) => {
          delete s.radiusAxis[axis.id];
        }),
      );
    },
    addAngleAxis(axis) {
      setState(
        produce((s) => {
          s.angleAxis[axis.id] = axis;
        }),
      );
    },
    removeAngleAxis(axis) {
      setState(
        produce((s) => {
          delete s.angleAxis[axis.id];
        }),
      );
    },
  };

  return { state, actions };
}
