// Ported from recharts 3.8.1 src/state/selectors/selectTooltipEventType.ts.
// Deviation: the `useTooltipEventType` hook returns an Accessor<TooltipEventType>
// (Solid reactive-hook convention) instead of a bare value.
import { Accessor } from "solid-js";
import { RechartsRootState } from "../store";
import { TooltipEventType } from "../../util/types";
import { useAppSelector } from "../hooks";
import { SharedTooltipSettings } from "../tooltipSlice";

export const selectDefaultTooltipEventType = (state: RechartsRootState): TooltipEventType =>
  state.options.defaultTooltipEventType;

export const selectValidateTooltipEventTypes = (
  state: RechartsRootState,
): ReadonlyArray<TooltipEventType> | undefined => state.options.validateTooltipEventTypes;

export function combineTooltipEventType(
  shared: SharedTooltipSettings,
  defaultTooltipEventType: TooltipEventType,
  validateTooltipEventTypes: ReadonlyArray<TooltipEventType> | undefined,
): TooltipEventType {
  if (shared == null) {
    return defaultTooltipEventType;
  }
  const eventType = shared ? "axis" : "item";
  if (validateTooltipEventTypes == null) {
    return defaultTooltipEventType;
  }
  return validateTooltipEventTypes.includes(eventType) ? eventType : defaultTooltipEventType;
}

export function selectTooltipEventType(
  state: RechartsRootState,
  shared: SharedTooltipSettings,
): TooltipEventType {
  const defaultTooltipEventType = selectDefaultTooltipEventType(state);
  const validateTooltipEventTypes = selectValidateTooltipEventTypes(state);
  return combineTooltipEventType(shared, defaultTooltipEventType, validateTooltipEventTypes);
}

export function useTooltipEventType(
  shared: SharedTooltipSettings,
): Accessor<TooltipEventType | undefined> {
  return useAppSelector((state) => selectTooltipEventType(state, shared));
}
