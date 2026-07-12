// Ported from recharts 3.8.1 src/cartesian/ZAxis.tsx (commit 7a23854).
//
// REGISTRATION-ONLY: ZAxis never renders (it has no ticks/line); it only pushes
// settings into the cartesianAxis slice so Scatter can size its points by the z
// value. Solid deviations: useLayoutEffect/prevRef → createEffect add/replace +
// onCleanup remove (the XAxis/YAxis idiom); defaults via merge.
import { createEffect, merge } from "solid-js";
import { useAppStore } from "../state/hooks";
import { AxisId, ZAxisSettings } from "../state/cartesianAxisSlice";
import { implicitZAxis } from "../state/selectors/axisSelectors";
import { AxisDomain, DataKey, ScaleType } from "../util/types";
import { AxisRange } from "../state/selectors/axisSelectors";
import { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";
import { unregisterOnCleanup } from "../state/unregisterOnCleanup";

export interface ZAxisProps<DataPointType = unknown, DataValueType = unknown> {
  zAxisId?: AxisId;
  type?: "number" | "category";
  dataKey?: DataKey<DataPointType, DataValueType>;
  range?: AxisRange;
  domain?: AxisDomain;
  scale?: ScaleType | CustomScaleDefinition;
  name?: string;
  unit?: string;
}

export const zAxisDefaultProps = {
  zAxisId: 0,
  range: implicitZAxis.range,
  scale: implicitZAxis.scale,
  type: implicitZAxis.type,
} as const;

export function ZAxis<DataPointType = unknown, DataValueType = unknown>(
  props: ZAxisProps<DataPointType, DataValueType>,
): null {
  const store = useAppStore();
  const merged = merge(zAxisDefaultProps, props);

  let prev: ZAxisSettings | null = null;

  createEffect(
    (): ZAxisSettings => ({
      id: merged.zAxisId,
      type: merged.type,
      dataKey: merged.dataKey,
      range: merged.range,
      domain: merged.domain,
      scale: merged.scale,
      // recharts registers the raw prop name/unit (undefined when unset); the
      // implicit "" is only the fallback when NO ZAxis exists (selectZAxisSettings).
      name: merged.name,
      unit: merged.unit,
      allowDataOverflow: implicitZAxis.allowDataOverflow,
      allowDuplicatedCategory: implicitZAxis.allowDuplicatedCategory,
      includeHidden: implicitZAxis.includeHidden,
      reversed: implicitZAxis.reversed,
    }),
    (settings) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.cartesianAxis.addZAxis(settings);
      } else if (prev !== settings) {
        store.actions.cartesianAxis.replaceZAxis({ prev, next: settings });
      }
      prev = settings;
    },
  );

  unregisterOnCleanup(() => {
    if (prev && store != null) {
      store.actions.cartesianAxis.removeZAxis(prev);
      prev = null;
    }
  });

  return null;
}
