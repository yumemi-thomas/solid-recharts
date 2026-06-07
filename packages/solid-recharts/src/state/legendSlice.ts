// Ported from recharts 3.8.1 src/state/legendSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer): createStore + draft-first setters.
//
// Deviation: recharts stores `payload: ReadonlyArray<ReadonlyArray<LegendPayload>>`
// and matches entries by reference for replace/remove (`indexOf`). A Solid store
// proxies stored arrays, so reference matching breaks — instead each registered
// entry carries the graphical item's `id` (`{ id, items }`) and replace/remove
// match by it (the same proxy-safe strategy as graphicalItemsSlice/tooltipSlice).
// `selectLegendPayload` flattens `items` back to the reference's flat shape.
import { createStore } from "solid-js";
import { LayoutType, Size } from "../util/types";
import {
  HorizontalAlignmentType,
  LegendItemSorter,
  LegendPayload,
  VerticalAlignmentType,
} from "../component/DefaultLegendContent";

export type LegendSettings = {
  layout: LayoutType;
  align: HorizontalAlignmentType;
  verticalAlign: VerticalAlignmentType;
  itemSorter: LegendItemSorter | null;
};

/** One graphical item's registered legend entry, keyed by its id (Solid deviation). */
export type LegendPayloadEntry = {
  id: string;
  items: ReadonlyArray<LegendPayload>;
};

export type LegendState = {
  settings: LegendSettings;
  size: Size;
  payload: ReadonlyArray<LegendPayloadEntry>;
};

export const initialLegendState: LegendState = {
  settings: {
    layout: "horizontal",
    align: "center",
    verticalAlign: "bottom",
    itemSorter: "value",
  },
  size: { width: 0, height: 0 },
  payload: [],
};

export interface LegendActions {
  setLegendSize(payload: Size): void;
  setLegendSettings(payload: LegendSettings): void;
  addLegendPayload(payload: LegendPayloadEntry): void;
  replaceLegendPayload(payload: { prev: LegendPayloadEntry; next: LegendPayloadEntry }): void;
  removeLegendPayload(payload: LegendPayloadEntry): void;
}

export interface LegendSlice {
  readonly state: LegendState;
  readonly actions: LegendActions;
}

export function createLegendSlice(initialState: LegendState = initialLegendState): LegendSlice {
  const [state, setState] = createStore<LegendState>({
    settings: { ...initialState.settings },
    size: { ...initialState.size },
    payload: [...initialState.payload],
  });

  const actions: LegendActions = {
    setLegendSize(payload) {
      setState((s) => {
        s.size.width = payload.width;
        s.size.height = payload.height;
      });
    },
    setLegendSettings(payload) {
      setState((s) => {
        s.settings.align = payload.align;
        s.settings.layout = payload.layout;
        s.settings.verticalAlign = payload.verticalAlign;
        s.settings.itemSorter = payload.itemSorter;
      });
    },
    addLegendPayload(payload) {
      setState((s) => {
        s.payload = [...s.payload, payload];
      });
    },
    replaceLegendPayload({ prev, next }) {
      setState((s) => {
        const index = s.payload.findIndex((e) => e.id === prev.id);
        if (index > -1) {
          const nextItems = s.payload.slice();
          nextItems[index] = next;
          s.payload = nextItems;
        }
      });
    },
    removeLegendPayload(payload) {
      setState((s) => {
        s.payload = s.payload.filter((e) => e.id !== payload.id);
      });
    },
  };

  return { state, actions };
}
