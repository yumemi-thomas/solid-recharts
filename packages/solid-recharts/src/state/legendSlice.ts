// Ported from recharts 3.8.1 src/state/legendSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer): createStore + draft-first setters.
//
// Deviation: recharts stores `payload: ReadonlyArray<ReadonlyArray<LegendPayload>>`
// and matches entries by reference for replace/remove (`indexOf`). A Solid store
// proxies stored arrays, so reference matching breaks — instead each registered
// entry carries the graphical item's `id` (`{ id, items }`) and replace/remove
// match by it (the same proxy-safe strategy as graphicalItemsSlice/tooltipSlice).
// `selectLegendPayload` flattens `items` back to the reference's flat shape.
import { createStore, produce } from "solid-js/store";
import { createCollectionActions } from "./createCollectionActions";
import { patched } from "./patched";
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

  const payload = createCollectionActions<LegendPayloadEntry>(
    (updater) =>
      setState(
        produce((s) => {
          const next = updater(s.payload);
          if (next !== s.payload) {
            s.payload = next;
          }
        }),
      ),
    (e) => e.id,
  );

  const actions: LegendActions = {
    setLegendSize(payload) {
      // Slice immutability contract (ADR-0002): replace the node, not leaves.
      setState(
        produce((s) => {
          s.size = patched(s.size, { width: payload.width, height: payload.height });
        }),
      );
    },
    setLegendSettings(payload) {
      setState(
        produce((s) => {
          s.settings = patched(s.settings, {
            align: payload.align,
            layout: payload.layout,
            verticalAlign: payload.verticalAlign,
            itemSorter: payload.itemSorter,
          });
        }),
      );
    },
    addLegendPayload: payload.add,
    replaceLegendPayload: payload.replace,
    removeLegendPayload: payload.remove,
  };

  return { state, actions };
}
