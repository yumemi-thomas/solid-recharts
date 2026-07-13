// Ported from recharts 3.8.1 src/context/ErrorBarContext.tsx (commit 7a23854).
//
// The graphical item provides its data + a point formatter + axis ids via this
// context; ErrorBar consumes it to draw whiskers, and ReportErrorBarSettings
// registers the error bar in the store (so axes can extend their domain).
//
// Solid deviations: context value carries an `Accessor` (Solid context is fixed
// at provide-time; the accessor keeps `data` reactive). useEffect add/replace +
// cleanup remove → createEffect + onCleanup. useGraphicalItemId provides the id.
import { createContext, useContext } from "solid-js";
import type { Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import { AxisId } from "../state/cartesianAxisSlice";
import type { ErrorBarDataPointFormatter } from "../cartesian/ErrorBar";
import type { ErrorBarsSettings } from "../state/errorBarSlice";
import { useAppStore } from "../state/hooks";
import { useGraphicalItemId } from "./RegisterGraphicalItemId";
import { registerInStore } from "../state/registerInStore";

export interface ErrorBarContextValue {
  data: ReadonlyArray<unknown> | undefined;
  xAxisId: AxisId;
  yAxisId: AxisId;
  dataPointFormatter: ErrorBarDataPointFormatter;
  errorBarOffset: number;
}

const initialContextState: ErrorBarContextValue = {
  data: [],
  xAxisId: 0,
  yAxisId: 0,
  dataPointFormatter: () => ({ x: 0, y: 0, value: 0 }),
  errorBarOffset: 0,
};

const ErrorBarContext = createContext<Accessor<ErrorBarContextValue>>(() => initialContextState);

export function SetErrorBarContext(
  props: ErrorBarContextValue & { children: JSX.Element },
): JSX.Element {
  const value = (): ErrorBarContextValue => ({
    data: props.data,
    xAxisId: props.xAxisId,
    yAxisId: props.yAxisId,
    dataPointFormatter: props.dataPointFormatter,
    errorBarOffset: props.errorBarOffset,
  });
  return <ErrorBarContext value={value}>{props.children}</ErrorBarContext>;
}

export const useErrorBarContext = (): Accessor<ErrorBarContextValue> => useContext(ErrorBarContext);

/**
 * Registers an ErrorBar's settings in the store under its graphical item's id,
 * so the corresponding axis can extend its domain to fit the error values.
 */
export function ReportErrorBarSettings(props: ErrorBarsSettings): JSX.Element {
  const store = useAppStore();
  const graphicalItemId = useGraphicalItemId();

  if (store != null && graphicalItemId != null) {
    registerInStore<ErrorBarsSettings>(
      () => ({ dataKey: props.dataKey, direction: props.direction }),
      {
        add: (next) =>
          store.actions.errorBars.addErrorBar({ itemId: graphicalItemId, errorBar: next }),
        replace: (prev, next) =>
          store.actions.errorBars.replaceErrorBar({ itemId: graphicalItemId, prev, next }),
        remove: (prev) =>
          store.actions.errorBars.removeErrorBar({ itemId: graphicalItemId, errorBar: prev }),
      },
    );
  }

  return null;
}
