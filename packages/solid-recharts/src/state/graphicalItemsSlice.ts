// Ported from recharts 3.8.1 src/state/graphicalItemsSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE (no Redux/immer — see the state-architecture
// decision). `createSlice` → a factory returning `{ state, actions }` (a Solid
// store + draft-first setters).
//
// Key deviation: recharts matches items for replace/remove by OBJECT REFERENCE
// (`current(state).cartesianItems.indexOf(payload)` + immer `castDraft`). Solid
// stores wrap stored objects in proxies, so a read no longer `===` the raw object
// the caller passed — reference matching can't work. We match by the required
// unique `id` instead, which is the items' real identity and gives identical
// ordering/replacement semantics.
import { createStore } from "solid-js";
import { createCollectionActions } from "./createCollectionActions";
import { toOpaqueArray } from "./opaque";
import { ChartData } from "./chartDataSlice";
import { AxisId } from "./cartesianAxisSlice";
import { DataKey } from "../util/types";
import { LineSettings } from "./types/LineSettings";
import { AreaSettings } from "./types/AreaSettings";
import { BarSettings } from "./types/BarSettings";
import { ScatterSettings } from "./types/ScatterSettings";
import { PieSettings } from "./types/PieSettings";
import { RadarSettings } from "./types/RadarSettings";
import { RadialBarSettings } from "./types/RadialBarSettings";

/**
 * Unique ID of a graphical item — provided by the user or generated. Used to
 * identify the item in state.
 */
export type GraphicalItemId = string;

export interface GraphicalItemSettings {
  id: GraphicalItemId;
  /**
   * If the item has its own data array it appears here; otherwise data is taken
   * from the chart root `data` prop.
   */
  data: ChartData | undefined;
  dataKey: DataKey<unknown> | undefined;
  /**
   * Hidden items stay in state because some components (e.g. Legend) still show
   * a record for them, and stacks ignore them.
   */
  hide: boolean;
}

export interface BaseCartesianGraphicalItemSettings extends GraphicalItemSettings {
  xAxisId: AxisId;
  yAxisId: AxisId;
  zAxisId: AxisId;
  /**
   * Items inside a Brush panorama must not interact with the main items.
   */
  isPanorama: boolean;
}

// Scatter/RadialBar/Pie/Radar settings are deferred to their verticals; this
// union grows as those land.
export type CartesianGraphicalItemSettings =
  | AreaSettings
  | BarSettings
  | LineSettings
  | ScatterSettings;

export interface BasePolarGraphicalItemSettings extends GraphicalItemSettings {
  angleAxisId: AxisId;
  radiusAxisId: AxisId;
}

export type PolarGraphicalItemSettings = PieSettings | RadarSettings | RadialBarSettings;

export type GraphicalItemsState = {
  /**
   * All cartesian graphical items and their settings. Order is arbitrary; do not
   * assume indexes here match indexes elsewhere.
   */
  cartesianItems: ReadonlyArray<CartesianGraphicalItemSettings>;
  /**
   * All polar graphical items and their settings.
   */
  polarItems: ReadonlyArray<PolarGraphicalItemSettings>;
};

export const initialGraphicalItemsState: GraphicalItemsState = {
  cartesianItems: [],
  polarItems: [],
};

interface ReplacePayload<T> {
  prev: T;
  next: T;
}

export interface GraphicalItemsActions {
  addCartesianGraphicalItem(item: CartesianGraphicalItemSettings): void;
  replaceCartesianGraphicalItem(payload: ReplacePayload<CartesianGraphicalItemSettings>): void;
  removeCartesianGraphicalItem(item: CartesianGraphicalItemSettings): void;
  addPolarGraphicalItem(item: PolarGraphicalItemSettings): void;
  replacePolarGraphicalItem(payload: ReplacePayload<PolarGraphicalItemSettings>): void;
  removePolarGraphicalItem(item: PolarGraphicalItemSettings): void;
}

export interface GraphicalItemsSlice {
  readonly state: GraphicalItemsState;
  readonly actions: GraphicalItemsActions;
}

export function createGraphicalItemsSlice(
  initialState: GraphicalItemsState = initialGraphicalItemsState,
): GraphicalItemsSlice {
  const [state, setState] = createStore<GraphicalItemsState>({
    cartesianItems: [...initialState.cartesianItems],
    polarItems: [...initialState.polarItems],
  });

  // State arrays are typed ReadonlyArray (immutable external API); the collection
  // actions reassign the whole array rather than mutate in place (see ADR-0002).
  const cartesian = createCollectionActions<CartesianGraphicalItemSettings>(
    (updater) =>
      setState((s) => {
        const next = updater(s.cartesianItems);
        if (next !== s.cartesianItems) {
          s.cartesianItems = next;
        }
      }),
    (it) => it.id,
  );
  const polar = createCollectionActions<PolarGraphicalItemSettings>(
    (updater) =>
      setState((s) => {
        const next = updater(s.polarItems);
        if (next !== s.polarItems) {
          s.polarItems = next;
        }
      }),
    (it) => it.id,
  );

  // An item's own `data` array is replaced wholesale with the item, never edited in
  // place, so it is stored opaque (see opaque.ts): the many scopes that read the
  // series' rows subscribe to the array, not to each row and field.
  const withOpaqueData = <T extends GraphicalItemSettings>(item: T): T =>
    item.data == null || Object.isFrozen(item.data)
      ? item
      : { ...item, data: toOpaqueArray(item.data) };

  const actions: GraphicalItemsActions = {
    addCartesianGraphicalItem: (item) => cartesian.add(withOpaqueData(item)),
    replaceCartesianGraphicalItem: ({ prev, next }) =>
      cartesian.replace({ prev, next: withOpaqueData(next) }),
    removeCartesianGraphicalItem: cartesian.remove,
    addPolarGraphicalItem: (item) => polar.add(withOpaqueData(item)),
    replacePolarGraphicalItem: ({ prev, next }) =>
      polar.replace({ prev, next: withOpaqueData(next) }),
    removePolarGraphicalItem: polar.remove,
  };

  return { state, actions };
}
