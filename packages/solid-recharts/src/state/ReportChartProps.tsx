// Ported from recharts 3.8.1 src/state/ReportChartProps.tsx (commit 7a23854).
// useAppDispatch → useAppStore().actions; useEffect → createEffect.
import { createEffect } from "solid-js";
import type { JSX } from "@solidjs/web";
import { UpdatableChartOptions } from "./rootPropsSlice";
import { useAppStore } from "./hooks";

export const ReportChartProps = (props: UpdatableChartOptions): JSX.Element => {
  const store = useAppStore();

  createEffect(
    () => ({ ...props }),
    (options) => {
      store?.actions.rootProps.updateOptions(options);
    },
  );

  return null;
};
