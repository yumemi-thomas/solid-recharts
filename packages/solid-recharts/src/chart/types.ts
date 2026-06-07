// Ported from recharts 3.8.1 src/chart/types.ts (commit 7a23854).
//
// Deviation: recharts' React event generics become native DOM events — Solid
// event handlers receive native events, so `SyntheticEvent` → `Event`,
// `MouseEvent<SVGGraphicsElement>` → the global `MouseEvent`, and
// `TouchEvent<SVGGraphicsElement>` → the global `TouchEvent` (the element is on
// `event.currentTarget`). No React import.
import { MouseHandlerDataParam } from "../synchronisation/types";

export type TooltipTrigger = "hover" | "click";

export type CategoricalChartFunc<E = Event> = (nextState: MouseHandlerDataParam, event: E) => void;

export interface ExternalMouseEvents {
  /** Customized click handler for this chart. */
  onClick?: CategoricalChartFunc<MouseEvent>;
  /** Customized mouseleave handler for this chart. */
  onMouseLeave?: CategoricalChartFunc<MouseEvent>;
  /** Customized mouseenter handler for this chart. */
  onMouseEnter?: CategoricalChartFunc<MouseEvent>;
  /** Customized mousemove handler for this chart. */
  onMouseMove?: CategoricalChartFunc<MouseEvent>;
  /** Customized mousedown handler for this chart. */
  onMouseDown?: CategoricalChartFunc<MouseEvent>;
  /** Customized mouseup handler for this chart. */
  onMouseUp?: CategoricalChartFunc<MouseEvent>;
  /** Customized contextmenu handler for this chart. */
  onContextMenu?: CategoricalChartFunc<MouseEvent>;
  /** Customized dblclick handler for this chart. */
  onDoubleClick?: CategoricalChartFunc<MouseEvent>;
  /** Customized touchstart handler for this chart. */
  onTouchStart?: CategoricalChartFunc<TouchEvent>;
  /** Customized touchmove handler for this chart. */
  onTouchMove?: CategoricalChartFunc<TouchEvent>;
  /** Customized touchend handler for this chart. */
  onTouchEnd?: CategoricalChartFunc<TouchEvent>;
}
