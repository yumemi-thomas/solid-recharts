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

export type XAxisHeight = number | "auto";

export type XAxisSettings = CartesianAxisSettings & {
  padding: XAxisPadding;
  height: XAxisHeight;
  orientation: XAxisOrientation;
  heightHistory?: number[];
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
  updateXAxisHeight(payload: { id: AxisId; height: number }): void;
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

  // The x/y/z axis maps are Record<AxisId, …> (not arrays), and their
  // add/replace/remove mutate the draft IN PLACE — preserving each map's reference
  // identity, which downstream reads rely on. So this is a local record helper, not
  // the shared array `createCollectionActions`; `pick` selects the map to touch.
  // Concentrates the replace body that was written verbatim three times (x/y/z).
  function axisCollection<A extends { id: AxisId }>(pick: (s: AxisMapState) => Record<AxisId, A>) {
    return {
      add: (axis: A) =>
        setState((s) => {
          pick(s)[axis.id] = axis;
        }),
      replace: ({ prev, next }: { prev: A; next: A }) =>
        setState((s) => {
          const map = pick(s);
          if (map[prev.id] !== undefined) {
            if (prev.id !== next.id) {
              delete map[prev.id];
            }
            map[next.id] = next;
          }
        }),
      remove: (axis: A) =>
        setState((s) => {
          delete pick(s)[axis.id];
        }),
    };
  }
  const x = axisCollection<XAxisSettings>((s) => s.xAxis);
  const y = axisCollection<YAxisSettings>((s) => s.yAxis);
  const z = axisCollection<ZAxisSettings>((s) => s.zAxis);

  const actions: CartesianAxisActions = {
    addXAxis: x.add,
    replaceXAxis: x.replace,
    removeXAxis: x.remove,
    addYAxis: y.add,
    replaceYAxis: y.replace,
    removeYAxis: y.remove,
    addZAxis: z.add,
    replaceZAxis: z.replace,
    removeZAxis: z.remove,
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
    updateXAxisHeight({ id, height }) {
      setState((s) => {
        const axis = s.xAxis[id];
        if (axis) {
          const history = axis.heightHistory || [];
          if (
            history.length === 3 &&
            history[0] === history[2] &&
            height === history[1] &&
            height !== axis.height &&
            Math.abs(height - (history[0] ?? 0)) <= 1
          ) {
            return;
          }
          s.xAxis[id] = {
            ...axis,
            height,
            heightHistory: [...history, height].slice(-3),
          };
        }
      });
    },
  };

  return { state, actions };
}
