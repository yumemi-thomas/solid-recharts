// Ported from recharts 3.8.1 src/state/ReportMainChartProps.tsx (commit 7a23854).
//
// Solid deviations: `memo(..., propsAreEqual)` is dropped (Solid doesn't
// re-render; the comparator has no equivalent); `useAppDispatch` + action
// creators → `useAppStore().actions`; `useEffect` → two-arg `createEffect`.
import { createEffect } from "solid-js";
import type { JSX } from "@solidjs/web";
import { LayoutType, Margin } from "../util/types";
import { useIsPanorama } from "../context/PanoramaContext";
import { useAppStore } from "./hooks";

/** Props accepted only on the main chart (not the Brush panorama). */
interface MainChartProps {
  layout: LayoutType;
  margin: Partial<Margin>;
}

export const ReportMainChartProps = (props: MainChartProps): JSX.Element => {
  const store = useAppStore();
  // Skip in panorama: the root chart owns these, and Brush reads them from the
  // store, so they must stay stable to avoid a re-render loop.
  const isPanorama = useIsPanorama();

  createEffect(
    () => ({ layout: props.layout, margin: props.margin }),
    ({ layout, margin }) => {
      if (!isPanorama) {
        store?.actions.layout.setLayout(layout);
        store?.actions.layout.setMargin(margin);
      }
    },
  );

  return null;
};
