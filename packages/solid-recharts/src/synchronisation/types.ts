// Ported from recharts 3.8.1 src/synchronisation/types.ts (commit 7a23854).
// Canonical home for SyncMethod (util/types re-exports it; the earlier seed there
// is now re-homed here). Deviation: `DataKey<any>` → `DataKey<unknown>` (no any).
import { Coordinate, DataKey, TickItem } from "../util/types";
import { TooltipIndex } from "../state/tooltipSlice";

export type ActiveLabel = string | number | undefined;

/**
 * Despite the name, this type is used for all event types, not just mouse events.
 */
export type MouseHandlerDataParam = {
  /**
   * Index of the active tick in the current chart. Only works with number-indexed
   * one-dimensional data charts (Line, Area, Bar, Pie, …), not two-dimensional
   * ones (Treemap, Sankey) — though one day it will, hence the TooltipIndex type.
   */
  activeTooltipIndex: number | TooltipIndex | undefined;
  isTooltipActive: boolean;
  /**
   * Exactly the same as activeTooltipIndex — duplicated in recharts@2 too, kept
   * for backwards compatibility.
   */
  activeIndex: number | TooltipIndex | undefined;
  /** The category or domain value of the active tooltip entry. */
  activeLabel: ActiveLabel;
  activeDataKey: DataKey<unknown> | undefined;
  activeCoordinate: Coordinate | undefined;
};

/**
 * Customises how charts synchronize tooltips and brushes. Default: `index`.
 *
 * - `index`: other charts reuse the current datum's index within the data array.
 * - `value`: try to match other charts' values.
 * - custom function: receives the current chart's ticks and the other chart's
 *   active tooltip state, and returns the active tick index in the current chart.
 */
export type SyncMethod =
  | "index"
  | "value"
  | ((ticks: ReadonlyArray<TickItem>, data: MouseHandlerDataParam) => number);
