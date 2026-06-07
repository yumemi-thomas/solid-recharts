// Ported from recharts 3.8.1 src/state/ReportPolarOptions.tsx (commit 7a23854).
//
// Solid deviations: `useAppDispatch` + action creator → `useAppStore().actions`;
// `useEffect` → two-arg `createEffect` (compute the payload, dispatch in apply).
import { createEffect } from "solid-js";
import type { JSX } from "@solidjs/web";
import { PolarChartOptions } from "./polarOptionsSlice";
import { useAppStore } from "./hooks";

export const ReportPolarOptions = (props: PolarChartOptions): JSX.Element => {
  const store = useAppStore();

  createEffect(
    () => ({
      cx: props.cx,
      cy: props.cy,
      startAngle: props.startAngle,
      endAngle: props.endAngle,
      innerRadius: props.innerRadius,
      outerRadius: props.outerRadius,
    }),
    (payload) => {
      store?.actions.polarOptions.updatePolarOptions(payload);
    },
  );

  return null;
};
