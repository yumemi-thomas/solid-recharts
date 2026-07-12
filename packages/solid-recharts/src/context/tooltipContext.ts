// Ported from recharts 3.8.1 src/context/tooltipContext.tsx (commit 7a23854).
//
// These are the graphical-item ("item"-type tooltip) mouse-dispatch hooks: a
// graphical item (Bar/Scatter/Pie sector, etc.) wires them to its own elements so
// hovering/clicking an individual element activates the tooltip for that item.
// This is the item-interaction counterpart to the axis-hover handling in
// RechartsWrapper (which drives 'axis'-type tooltips).
//
// Deviations: `useAppDispatch` → `useAppStore` (call `store.actions.tooltip.*`
// directly; guarded for use outside a chart); React `MouseEvent` → the native DOM
// `MouseEvent`; `DataKey<any>` → `DataKey<unknown>`. No JSX, so `.ts`.
// SOLID DEVIATION: the user handler and `dataKey` are GETTERS, not values — the
// hooks are called at component-body top level, where reading a reactive prop
// (e.g. a signal-driven `dataKey`) is an untracked stale read (STRICT_READ).
// Reading them inside the returned event closure is fresh at dispatch time.
import { Coordinate, DataKey } from "../util/types";
import { useAppStore } from "../state/hooks";
import { TooltipPayload } from "../state/tooltipSlice";

/**
 * Some graphical items provide extra information to the tooltip; some do not.
 */
export type TooltipTriggerInfo = {
  tooltipPayload?: TooltipPayload;
  tooltipPosition?: Coordinate;
};

export type MouseEnterLeaveEvent<T> = (data: T, index: number, event: MouseEvent) => void;

export const useMouseEnterItemDispatch = <T extends TooltipTriggerInfo>(
  onMouseEnterFromProps: () => MouseEnterLeaveEvent<T> | undefined,
  dataKey: () => DataKey<unknown> | undefined,
  graphicalItemId: string,
) => {
  const store = useAppStore();
  return (data: T, index: number) => (event: MouseEvent) => {
    onMouseEnterFromProps()?.(data, index, event);
    store?.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: String(index),
      activeDataKey: dataKey(),
      activeCoordinate: data.tooltipPosition,
      activeGraphicalItemId: graphicalItemId,
    });
  };
};

export const useMouseLeaveItemDispatch = <T extends TooltipTriggerInfo>(
  onMouseLeaveFromProps: () => MouseEnterLeaveEvent<T> | undefined,
) => {
  const store = useAppStore();
  return (data: T, index: number) => (event: MouseEvent) => {
    onMouseLeaveFromProps()?.(data, index, event);
    store?.actions.tooltip.mouseLeaveItem();
  };
};

export const useMouseClickItemDispatch = <T extends TooltipTriggerInfo>(
  onMouseClickFromProps: () => MouseEnterLeaveEvent<T> | undefined,
  dataKey: () => DataKey<unknown> | undefined,
  graphicalItemId: string,
) => {
  const store = useAppStore();
  return (data: T, index: number) => (event: MouseEvent) => {
    onMouseClickFromProps()?.(data, index, event);
    store?.actions.tooltip.setActiveClickItemIndex({
      activeIndex: String(index),
      activeDataKey: dataKey(),
      activeCoordinate: data.tooltipPosition,
      activeGraphicalItemId: graphicalItemId,
    });
  };
};
