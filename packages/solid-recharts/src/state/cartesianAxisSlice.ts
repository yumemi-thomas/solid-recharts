// Ported from recharts 3.8.1 src/state/cartesianAxisSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE of the state layer (no Redux/immer — see the
// state-architecture decision). recharts' `createSlice` becomes a factory
// returning `{ state, actions }` (a Solid store + draft-first setters); the X/Y
// axis maps are `Record<AxisId, …Settings>` stored as a Solid store.
//
// Deviations: `DataKey<any>`/`TickProp<any>` → `<unknown>` (this repo bans
// `any`). `castDraft`/immer are unnecessary — Solid's setter takes a mutable
// draft. The `add/replace/remove` reducers (RTK `prepareAutoBatched`) become
// plain action functions; batching is handled by Solid's store microtask.
import { createStore } from "solid-js";
import type {
  AxisDomain,
  AxisInterval,
  AxisTick,
  CartesianTickContentProps,
  DataKey,
  EvaluatedAxisDomainType,
  ScaleType,
  TickFormatter,
  TickProp,
} from "../util/types";
import type { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";
// Type-only import; axisSelectors imports types back from here — the cycle is
// erased at runtime (same as the reference's `import type { AxisRange }`).
import type { AxisRange } from "./selectors/axisSelectors";

/**
 * Identifies an axis within a chart. Users may give an axis a string or number
 * id; graphical items reference the axis they use by this id. Every chart has a
 * default axis under {@link defaultAxisId}.
 */
export type AxisId = string | number;

export const defaultAxisId: AxisId = 0;

export type XAxisPadding = { left?: number; right?: number } | "gap" | "no-gap";
export type YAxisPadding = { top?: number; bottom?: number } | "gap" | "no-gap";

export type XAxisOrientation = "top" | "bottom";
export type YAxisOrientation = "left" | "right";

/**
 * Properties shared in X, Y, and Z axes. User-defined axis settings, coming
 * from props.
 */
export type BaseCartesianAxis = {
  id: AxisId;
  scale:
    | ScaleType
    | CustomScaleDefinition
    | CustomScaleDefinition<string>
    | CustomScaleDefinition<number>
    | CustomScaleDefinition<Date>;
  /**
   * Before creating this object, the domain type is evaluated based on the chart
   * layout so that we have the 'auto' resolved.
   */
  type: EvaluatedAxisDomainType;
  /**
   * The axis functionality is severely restricted without a dataKey — but there
   * is still something left, and the prop is optional, so this can be undefined
   * even in real charts. There are no defaults.
   */
  dataKey: DataKey<never> | undefined;
  unit: string | undefined;
  name: string | undefined;
  allowDuplicatedCategory: boolean;
  allowDataOverflow: boolean;
  reversed: boolean;
  includeHidden: boolean;
  domain: AxisDomain | undefined;
};

/**
 * Controls how Recharts calculates "nice" tick values for numerical axes.
 *
 * - `'none'`: no tick-rounding algorithm; positions come entirely from d3 (evenly
 *   spaced but not rounded). No domain-extension logic.
 * - `'auto'` *(default)*: decides whether/how to apply niceties from the domain
 *   definition; `'auto'` keyword → `'adaptive'` with possible domain extension,
 *   otherwise the same algorithm within the fixed domain (mirrors Recharts v2).
 * - `'adaptive'`: always the space-efficient algorithm (`getAdaptiveStep`).
 * - `'snap125'`: always the round-numbers algorithm (`getSnap125Step`), snapping
 *   steps to {1, 2, 2.5, 5} × 10ⁿ.
 *
 * @see {@link https://recharts.github.io/guide/axisTicks/}
 */
export type NiceTicksAlgorithm = "none" | "auto" | "adaptive" | "snap125";

export type TicksSettings = {
  allowDecimals: boolean;
  /**
   * Suggested number of ticks passed to d3 (a hint; d3 may return more or fewer).
   * If undefined, d3 decides on its own (default 10, varies by domain).
   */
  tickCount: number | undefined;
  /**
   * Ticks can be any type on a category axis; must be numbers on a number axis.
   */
  ticks: ReadonlyArray<AxisTick> | undefined;
  tick: TickProp<CartesianTickContentProps>;
  /**
   * Controls how Recharts calculates "nice" tick values for this axis.
   * @defaultValue 'auto'
   */
  niceTicks: NiceTicksAlgorithm;
};

/**
 * External props, visible to users via the public API. All sorts of internal
 * computed things derive from these, but they come through selectors.
 *
 * Properties shared between X and Y axes.
 */
export type CartesianAxisSettings = BaseCartesianAxis &
  TicksSettings & {
    interval: AxisInterval;
    mirror: boolean;
    minTickGap: number;
    angle: number;
    hide: boolean;
    tickFormatter: TickFormatter | undefined;
  };

export type XAxisSettings = CartesianAxisSettings & {
  padding: XAxisPadding;
  height: number;
  orientation: XAxisOrientation;
};

export type YAxisWidth = number | "auto";

export type YAxisSettings = CartesianAxisSettings & {
  padding: YAxisPadding;
  width: YAxisWidth;
  orientation: YAxisOrientation;
  widthHistory?: number[];
};

/**
 * Z axis is special — it's never displayed. It controls the size of Scatter
 * dots but never shows ticks anywhere.
 */
export type ZAxisSettings = BaseCartesianAxis & {
  range: AxisRange;
};

export type AxisMapState = {
  xAxis: Record<AxisId, XAxisSettings>;
  yAxis: Record<AxisId, YAxisSettings>;
  zAxis: Record<AxisId, ZAxisSettings>;
};

export const initialCartesianAxisState: AxisMapState = {
  xAxis: {},
  yAxis: {},
  zAxis: {},
};

interface ReplacePayload<T> {
  prev: T;
  next: T;
}

export interface CartesianAxisActions {
  addXAxis(axis: XAxisSettings): void;
  replaceXAxis(payload: ReplacePayload<XAxisSettings>): void;
  removeXAxis(axis: XAxisSettings): void;
  addYAxis(axis: YAxisSettings): void;
  replaceYAxis(payload: ReplacePayload<YAxisSettings>): void;
  removeYAxis(axis: YAxisSettings): void;
  addZAxis(axis: ZAxisSettings): void;
  replaceZAxis(payload: ReplacePayload<ZAxisSettings>): void;
  removeZAxis(axis: ZAxisSettings): void;
  updateYAxisWidth(payload: { id: AxisId; width: number }): void;
}

export interface CartesianAxisSlice {
  readonly state: AxisMapState;
  readonly actions: CartesianAxisActions;
}

/**
 * This is the slice where each individual Axis element pushes its own
 * configuration. Prefer this one over the legacy axisSlice.
 */
export function createCartesianAxisSlice(
  initialState: AxisMapState = initialCartesianAxisState,
): CartesianAxisSlice {
  const [state, setState] = createStore<AxisMapState>({
    xAxis: { ...initialState.xAxis },
    yAxis: { ...initialState.yAxis },
    zAxis: { ...initialState.zAxis },
  });

  const actions: CartesianAxisActions = {
    addXAxis(axis) {
      setState((s) => {
        s.xAxis[axis.id] = axis;
      });
    },
    replaceXAxis({ prev, next }) {
      setState((s) => {
        if (s.xAxis[prev.id] !== undefined) {
          if (prev.id !== next.id) {
            delete s.xAxis[prev.id];
          }
          s.xAxis[next.id] = next;
        }
      });
    },
    removeXAxis(axis) {
      setState((s) => {
        delete s.xAxis[axis.id];
      });
    },
    addYAxis(axis) {
      setState((s) => {
        s.yAxis[axis.id] = axis;
      });
    },
    replaceYAxis({ prev, next }) {
      setState((s) => {
        if (s.yAxis[prev.id] !== undefined) {
          if (prev.id !== next.id) {
            delete s.yAxis[prev.id];
          }
          s.yAxis[next.id] = next;
        }
      });
    },
    removeYAxis(axis) {
      setState((s) => {
        delete s.yAxis[axis.id];
      });
    },
    addZAxis(axis) {
      setState((s) => {
        s.zAxis[axis.id] = axis;
      });
    },
    replaceZAxis({ prev, next }) {
      setState((s) => {
        if (s.zAxis[prev.id] !== undefined) {
          if (prev.id !== next.id) {
            delete s.zAxis[prev.id];
          }
          s.zAxis[next.id] = next;
        }
      });
    },
    removeZAxis(axis) {
      setState((s) => {
        delete s.zAxis[axis.id];
      });
    },
    updateYAxisWidth({ id, width }) {
      setState((s) => {
        const axis = s.yAxis[id];
        if (axis) {
          const history = axis.widthHistory || [];
          // An oscillation is detected when the new width matches the width
          // before the last one — a simple A -> B -> A pattern. If the next
          // width is B and the difference is under 1 pixel, we ignore it.
          if (
            history.length === 3 &&
            history[0] === history[2] &&
            width === history[1] &&
            width !== axis.width &&
            Math.abs(width - (history[0] ?? 0)) <= 1
          ) {
            return;
          }
          const newHistory = [...history, width].slice(-3);
          s.yAxis[id] = {
            ...axis,
            width,
            widthHistory: newHistory,
          };
        }
      });
    },
  };

  return { state, actions };
}
