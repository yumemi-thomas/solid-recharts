// Ported from recharts 3.8.1 src/state/tooltipSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer): createStore + draft-first nested
// setters. Deviations: `DataKey<any>` → `DataKey<unknown>`; the by-reference
// matching of `replaceTooltipEntrySettings`/`removeTooltipEntrySettings`
// (recharts `indexOf(prev)`) can't match Solid store proxies, so they match by
// `settings.graphicalItemId` instead — the same proxy-safe strategy as
// graphicalItemsSlice (SetTooltipEntrySettings is the sole caller and each
// graphical item registers exactly one entry, so the id is unique).
import { createStore } from "solid-js";
import { createCollectionActions } from "./createCollectionActions";
import { patched } from "./patched";
import { TooltipTrigger } from "../chart/types";
import type { NameType, Payload, ValueType } from "../component/DefaultTooltipContent";
import { CartesianViewBoxRequired, Coordinate, DataKey, PolarCoordinate } from "../util/types";
import { AxisId } from "./cartesianAxisSlice";
import { GraphicalItemId } from "./graphicalItemsSlice";

/** One Tooltip can display multiple TooltipPayloadEntries at a time. */
export type TooltipPayloadEntry = Payload<ValueType, NameType>;

export type TooltipEntrySettings = Omit<TooltipPayloadEntry, "payload" | "value"> & {
  nameKey: DataKey<unknown> | undefined;
};

/** What Tooltip renders. */
export type TooltipPayload = ReadonlyArray<TooltipPayloadEntry>;

/**
 * `null` means no active index; a `string` is the index into the chart data
 * (the chart provides a searcher that maps it back to data).
 */
export type TooltipIndex = string | null;

export type TooltipPayloadSearcher<T = unknown> = (
  data: T,
  index: TooltipIndex,
  computedData?: unknown,
  nameKey?: DataKey<unknown>,
) => unknown;

export type TooltipPayloadConfiguration = {
  settings: TooltipEntrySettings;
  /** All the data the item provided; the searcher + activeIndex resolve the payload. */
  dataDefinedOnItem: unknown;
  /** The item's preferred tooltip coordinates, instead of relying on the axes. */
  getPosition: (tooltipIndex: NonNullable<TooltipIndex>) => Coordinate | undefined;
};

export type ActiveTooltipProps = {
  activeIndex: TooltipIndex;
  activeCoordinate: Coordinate | undefined;
};

/** `undefined` means "use the chart default". */
export type SharedTooltipSettings = boolean | undefined;

export type TooltipSettingsState = {
  shared: SharedTooltipSettings;
  trigger: TooltipTrigger;
  axisId: AxisId;
  /** "active after interaction ends" (not "always active"); undefined = depends on interaction. */
  active: boolean | undefined;
  /** Set the tooltip active before user interaction. */
  defaultIndex: TooltipIndex | undefined;
};

export type TooltipInteractionState = {
  active: boolean;
  index: TooltipIndex | undefined;
  dataKey: DataKey<unknown> | undefined;
  graphicalItemId: string | undefined;
  coordinate: Coordinate | PolarCoordinate | undefined;
};

export type TooltipSyncState = TooltipInteractionState & {
  label: string | undefined;
  sourceViewBox: CartesianViewBoxRequired | undefined;
};

export const noInteraction: TooltipInteractionState = {
  active: false,
  index: null,
  dataKey: undefined,
  graphicalItemId: undefined,
  coordinate: undefined,
};

export type TooltipState = {
  itemInteraction: {
    click: TooltipInteractionState;
    hover: TooltipInteractionState;
  };
  axisInteraction: {
    click: TooltipInteractionState;
    hover: TooltipInteractionState;
  };
  keyboardInteraction: TooltipInteractionState;
  syncInteraction: TooltipSyncState;
  tooltipItemPayloads: ReadonlyArray<TooltipPayloadConfiguration>;
  settings: TooltipSettingsState;
};

export const initialTooltipState: TooltipState = {
  itemInteraction: { click: noInteraction, hover: noInteraction },
  axisInteraction: { click: noInteraction, hover: noInteraction },
  keyboardInteraction: noInteraction,
  syncInteraction: {
    active: false,
    index: null,
    dataKey: undefined,
    label: undefined,
    coordinate: undefined,
    sourceViewBox: undefined,
    graphicalItemId: undefined,
  },
  tooltipItemPayloads: [],
  settings: {
    shared: undefined,
    trigger: "hover",
    axisId: 0,
    active: false,
    defaultIndex: undefined,
  },
};

export type GraphicalItemTooltipActionPayload = {
  activeIndex: TooltipIndex;
  activeDataKey: DataKey<unknown> | undefined;
  activeCoordinate: Coordinate | undefined;
  activeGraphicalItemId: GraphicalItemId;
};

export type AxisTooltipActionPayload = {
  activeIndex: TooltipIndex;
  activeDataKey: DataKey<unknown> | undefined;
  activeCoordinate?: Coordinate;
};

export type KeyboardTooltipActionPayload = {
  active: boolean;
  activeIndex: TooltipIndex | undefined;
  activeCoordinate: Coordinate | undefined;
};

export interface TooltipActions {
  addTooltipEntrySettings(payload: TooltipPayloadConfiguration): void;
  replaceTooltipEntrySettings(payload: {
    prev: TooltipPayloadConfiguration;
    next: TooltipPayloadConfiguration;
  }): void;
  removeTooltipEntrySettings(payload: TooltipPayloadConfiguration): void;
  setTooltipSettingsState(payload: TooltipSettingsState): void;
  setActiveMouseOverItemIndex(payload: GraphicalItemTooltipActionPayload): void;
  mouseLeaveChart(): void;
  mouseLeaveItem(): void;
  setActiveClickItemIndex(payload: GraphicalItemTooltipActionPayload): void;
  setMouseOverAxisIndex(payload: AxisTooltipActionPayload): void;
  setMouseClickAxisIndex(payload: AxisTooltipActionPayload): void;
  setSyncInteraction(payload: TooltipSyncState): void;
  setKeyboardInteraction(payload: KeyboardTooltipActionPayload): void;
}

export interface TooltipSlice {
  readonly state: TooltipState;
  readonly actions: TooltipActions;
}

export function createTooltipSlice(initialState: TooltipState = initialTooltipState): TooltipSlice {
  const [state, setState] = createStore<TooltipState>({
    itemInteraction: {
      click: { ...initialState.itemInteraction.click },
      hover: { ...initialState.itemInteraction.hover },
    },
    axisInteraction: {
      click: { ...initialState.axisInteraction.click },
      hover: { ...initialState.axisInteraction.hover },
    },
    keyboardInteraction: { ...initialState.keyboardInteraction },
    syncInteraction: { ...initialState.syncInteraction },
    tooltipItemPayloads: [...initialState.tooltipItemPayloads],
    settings: { ...initialState.settings },
  });

  // Deviation: recharts matches `prev` by reference (`indexOf`), but a Solid store
  // proxies stored objects so the raw `prev` never `===` the proxied element. The
  // collection matches by `settings.graphicalItemId` instead — the same proxy-safe
  // identity strategy as graphicalItemsSlice. Each graphical item registers exactly
  // one entry, so the id is unique.
  const entries = createCollectionActions<TooltipPayloadConfiguration>(
    (updater) =>
      setState((s) => {
        const next = updater(s.tooltipItemPayloads);
        if (next !== s.tooltipItemPayloads) {
          s.tooltipItemPayloads = next;
        }
      }),
    (p) => p.settings.graphicalItemId,
  );

  const actions: TooltipActions = {
    addTooltipEntrySettings: entries.add,
    replaceTooltipEntrySettings: entries.replace,
    removeTooltipEntrySettings: entries.remove,
    setTooltipSettingsState(payload) {
      setState((s) => {
        s.settings = payload;
      });
    },
    setActiveMouseOverItemIndex(payload) {
      // Slice immutability contract (ADR-0002): replace each written interaction
      // node so `state.tooltip.<node>` yields a new reference and the selector
      // graph invalidates by input-reference comparison. In-place leaf writes
      // keep the node reference stable, so reference-keyed selectors would never
      // recompute — see the store-proxy-reference-identity memory.
      setState((s) => {
        s.syncInteraction = patched(s.syncInteraction, {
          active: false,
          sourceViewBox: undefined,
        });
        s.keyboardInteraction = patched(s.keyboardInteraction, { active: false });
        s.itemInteraction = patched(s.itemInteraction, {
          hover: {
            active: true,
            index: payload.activeIndex,
            dataKey: payload.activeDataKey,
            graphicalItemId: payload.activeGraphicalItemId,
            coordinate: payload.activeCoordinate,
          },
        });
      });
    },
    mouseLeaveChart() {
      setState((s) => {
        s.itemInteraction = patched(s.itemInteraction, {
          hover: patched(s.itemInteraction.hover, { active: false }),
        });
        s.axisInteraction = patched(s.axisInteraction, {
          hover: patched(s.axisInteraction.hover, { active: false }),
        });
      });
    },
    mouseLeaveItem() {
      setState((s) => {
        s.itemInteraction = patched(s.itemInteraction, {
          hover: patched(s.itemInteraction.hover, { active: false }),
        });
      });
    },
    setActiveClickItemIndex(payload) {
      setState((s) => {
        s.syncInteraction = patched(s.syncInteraction, {
          active: false,
          sourceViewBox: undefined,
        });
        s.keyboardInteraction = patched(s.keyboardInteraction, { active: false });
        s.itemInteraction = patched(s.itemInteraction, {
          click: {
            active: true,
            index: payload.activeIndex,
            dataKey: payload.activeDataKey,
            graphicalItemId: payload.activeGraphicalItemId,
            coordinate: payload.activeCoordinate,
          },
        });
      });
    },
    setMouseOverAxisIndex(payload) {
      setState((s) => {
        s.syncInteraction = patched(s.syncInteraction, {
          active: false,
          sourceViewBox: undefined,
        });
        s.keyboardInteraction = patched(s.keyboardInteraction, { active: false });
        s.axisInteraction = patched(s.axisInteraction, {
          hover: patched(s.axisInteraction.hover, {
            active: true,
            index: payload.activeIndex,
            dataKey: payload.activeDataKey,
            coordinate: payload.activeCoordinate,
          }),
        });
      });
    },
    setMouseClickAxisIndex(payload) {
      setState((s) => {
        s.syncInteraction = patched(s.syncInteraction, {
          active: false,
          sourceViewBox: undefined,
        });
        s.keyboardInteraction = patched(s.keyboardInteraction, { active: false });
        s.axisInteraction = patched(s.axisInteraction, {
          click: patched(s.axisInteraction.click, {
            active: true,
            index: payload.activeIndex,
            dataKey: payload.activeDataKey,
            coordinate: payload.activeCoordinate,
          }),
        });
      });
    },
    setSyncInteraction(payload) {
      setState((s) => {
        s.syncInteraction = payload;
      });
    },
    setKeyboardInteraction(payload) {
      setState((s) => {
        s.keyboardInteraction = patched(s.keyboardInteraction, {
          active: payload.active,
          index: payload.activeIndex,
          coordinate: payload.activeCoordinate,
        });
      });
    },
  };

  return { state, actions };
}
