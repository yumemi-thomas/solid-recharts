// Ported from recharts 3.8.1 src/state/referenceElementsSlice.ts (commit 7a23854).
//
// FULL SOLID-NATIVE REWRITE (no Redux/immer — see the state-architecture
// decision). `createSlice` → a factory returning `{ state, actions }` (a Solid
// store + draft-first setters), wired into state/store.ts.
//
// Key deviation: recharts matches dots/areas/lines for removal by OBJECT
// REFERENCE (`current(state).dots.findIndex(dot => dot === payload)`). Solid
// stores wrap stored objects in proxies, so a read no longer `===` the raw
// object the caller passed — reference matching can't work. Each settings object
// therefore carries a generated `id` (the Report* component mints it via
// useUniqueId) and we match by `id`, the same proxy-safe strategy as
// graphicalItemsSlice / tooltipSlice / legendSlice.
import { createStore } from "solid-js";
import { createCollectionActions } from "./createCollectionActions";
import type { AxisId } from "./cartesianAxisSlice";
import type { IfOverflow } from "../util/IfOverflow";
import type { ReferenceLineSegment } from "../cartesian/ReferenceLine";

export type ReferenceElementSettings = {
  /**
   * Deviation from recharts: a stable id used for proxy-safe removal (recharts
   * matches by object reference, which Solid store proxies break).
   */
  id: string;
  yAxisId: AxisId;
  xAxisId: AxisId;
  ifOverflow: IfOverflow;
};

export type ReferenceDotSettings = ReferenceElementSettings & {
  x: unknown;
  y: unknown;
  r: number;
};

export type ReferenceAreaSettings = ReferenceElementSettings & {
  x1: unknown;
  x2: unknown;
  y1: unknown;
  y2: unknown;
};

export type ReferenceLineSettings = ReferenceElementSettings & {
  x: unknown;
  y: unknown;
  segment: ReferenceLineSegment | undefined;
};

export type ReferenceElementState = {
  dots: ReadonlyArray<ReferenceDotSettings>;
  areas: ReadonlyArray<ReferenceAreaSettings>;
  lines: ReadonlyArray<ReferenceLineSettings>;
};

export const initialReferenceElementState: ReferenceElementState = {
  dots: [],
  areas: [],
  lines: [],
};

export interface ReferenceElementsActions {
  addDot(dot: ReferenceDotSettings): void;
  removeDot(dot: ReferenceDotSettings): void;
  addArea(area: ReferenceAreaSettings): void;
  removeArea(area: ReferenceAreaSettings): void;
  addLine(line: ReferenceLineSettings): void;
  removeLine(line: ReferenceLineSettings): void;
}

export interface ReferenceElementsSlice {
  readonly state: ReferenceElementState;
  readonly actions: ReferenceElementsActions;
}

export function createReferenceElementsSlice(
  initialState: ReferenceElementState = initialReferenceElementState,
): ReferenceElementsSlice {
  const [state, setState] = createStore<ReferenceElementState>({
    dots: [...initialState.dots],
    areas: [...initialState.areas],
    lines: [...initialState.lines],
  });

  // State arrays are typed ReadonlyArray (immutable external API); the collection
  // actions reassign the whole array rather than mutate in place (see ADR-0002).
  // Reference elements have no replace action — a change is remove-then-add at the
  // call site (ReferenceLine/Dot/Area), so only add + remove are wired.
  const dots = createCollectionActions<ReferenceDotSettings>(
    (updater) =>
      setState((s) => {
        const next = updater(s.dots);
        if (next !== s.dots) {
          s.dots = next;
        }
      }),
    (d) => d.id,
  );
  const areas = createCollectionActions<ReferenceAreaSettings>(
    (updater) =>
      setState((s) => {
        const next = updater(s.areas);
        if (next !== s.areas) {
          s.areas = next;
        }
      }),
    (a) => a.id,
  );
  const lines = createCollectionActions<ReferenceLineSettings>(
    (updater) =>
      setState((s) => {
        const next = updater(s.lines);
        if (next !== s.lines) {
          s.lines = next;
        }
      }),
    (l) => l.id,
  );

  const actions: ReferenceElementsActions = {
    addDot: dots.add,
    removeDot: dots.remove,
    addArea: areas.add,
    removeArea: areas.remove,
    addLine: lines.add,
    removeLine: lines.remove,
  };

  return { state, actions };
}
