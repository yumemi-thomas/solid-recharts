// Ported from recharts 3.8.1 src/state/tooltipSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer): createStore + draft-first nested
// setters. Deviations: `DataKey<any>` → `DataKey<unknown>`; the by-reference
// matching of `replaceTooltipEntrySettings`/`removeTooltipEntrySettings`
// (recharts `indexOf(prev)`) can't match Solid store proxies, so they match by
// `settings.graphicalItemId` instead — the same proxy-safe strategy as
// graphicalItemsSlice (SetTooltipEntrySettings is the sole caller and each
// graphical item registers exactly one entry, so the id is unique).
import { createStore } from "solid-js";
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

  const actions: TooltipActions = {
    addTooltipEntrySettings(payload) {
      setState((s) => {
        s.tooltipItemPayloads = [...s.tooltipItemPayloads, payload];
      });
    },
    replaceTooltipEntrySettings({ prev, next }) {
      setState((s) => {
        // Deviation: recharts matches `prev` by reference (`indexOf`), but a
        // Solid store proxies stored objects so the raw `prev` never `===` the
        // proxied element. Match by `settings.graphicalItemId` instead — the
        // same proxy-safe identity strategy as graphicalItemsSlice. Each
        // graphical item registers exactly one entry, so the id is unique.
        const index = s.tooltipItemPayloads.findIndex(
          (p) => p.settings.graphicalItemId === prev.settings.graphicalItemId,
        );
        if (index > -1) {
          const nextItems = s.tooltipItemPayloads.slice();
          nextItems[index] = next;
          s.tooltipItemPayloads = nextItems;
        }
      });
    },
    removeTooltipEntrySettings(payload) {
      setState((s) => {
        s.tooltipItemPayloads = s.tooltipItemPayloads.filter(
          (p) => p.settings.graphicalItemId !== payload.settings.graphicalItemId,
        );
      });
    },
    setTooltipSettingsState(payload) {
      setState((s) => {
        s.settings = payload;
      });
    },
    setActiveMouseOverItemIndex(payload) {
      setState((s) => {
        s.syncInteraction.active = false;
        s.syncInteraction.sourceViewBox = undefined;
        s.keyboardInteraction.active = false;
        s.itemInteraction.hover.active = true;
        s.itemInteraction.hover.index = payload.activeIndex;
        s.itemInteraction.hover.dataKey = payload.activeDataKey;
        s.itemInteraction.hover.graphicalItemId = payload.activeGraphicalItemId;
        s.itemInteraction.hover.coordinate = payload.activeCoordinate;
      });
    },
    mouseLeaveChart() {
      setState((s) => {
        s.itemInteraction.hover.active = false;
        s.axisInteraction.hover.active = false;
      });
    },
    mouseLeaveItem() {
      setState((s) => {
        s.itemInteraction.hover.active = false;
      });
    },
    setActiveClickItemIndex(payload) {
      setState((s) => {
        s.syncInteraction.active = false;
        s.syncInteraction.sourceViewBox = undefined;
        s.itemInteraction.click.active = true;
        s.keyboardInteraction.active = false;
        s.itemInteraction.click.index = payload.activeIndex;
        s.itemInteraction.click.dataKey = payload.activeDataKey;
        s.itemInteraction.click.graphicalItemId = payload.activeGraphicalItemId;
        s.itemInteraction.click.coordinate = payload.activeCoordinate;
      });
    },
    setMouseOverAxisIndex(payload) {
      setState((s) => {
        s.syncInteraction.active = false;
        s.syncInteraction.sourceViewBox = undefined;
        s.axisInteraction.hover.active = true;
        s.keyboardInteraction.active = false;
        s.axisInteraction.hover.index = payload.activeIndex;
        s.axisInteraction.hover.dataKey = payload.activeDataKey;
        s.axisInteraction.hover.coordinate = payload.activeCoordinate;
      });
    },
    setMouseClickAxisIndex(payload) {
      setState((s) => {
        s.syncInteraction.active = false;
        s.syncInteraction.sourceViewBox = undefined;
        s.keyboardInteraction.active = false;
        s.axisInteraction.click.active = true;
        s.axisInteraction.click.index = payload.activeIndex;
        s.axisInteraction.click.dataKey = payload.activeDataKey;
        s.axisInteraction.click.coordinate = payload.activeCoordinate;
      });
    },
    setSyncInteraction(payload) {
      setState((s) => {
        s.syncInteraction = payload;
      });
    },
    setKeyboardInteraction(payload) {
      setState((s) => {
        s.keyboardInteraction.active = payload.active;
        s.keyboardInteraction.index = payload.activeIndex;
        s.keyboardInteraction.coordinate = payload.activeCoordinate;
      });
    },
  };

  return { state, actions };
}
