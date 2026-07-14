// Solid port of recharts 3.8.1 test/helper/expectAxisTicks.ts `ExpectAxisDomain`.
//
// recharts mounts this inside the chart via `<Customized component={<ExpectAxisDomain .../>} />`
// to read the axis scale from the store and assert its domain. There is no `Customized`
// in this Solid port, and a plain child of the chart already has the store context, so
// callers render `<ExpectAxisDomain ... />` directly as a chart child. The selector returns
// an Accessor; we spy its `.domain()` via an effect so the assert fires per settle (the
// caller checks the LAST call, mirroring recharts' per-render assert).
import { createEffect } from "solid-js";
import { useAppSelector } from "../../src/state/hooks";
import { selectAxisScale } from "../../src/state/selectors/axisSelectors";
import type { AxisId } from "../../src/state/cartesianAxisSlice";

export function ExpectAxisDomain(props: {
  axisType: "xAxis" | "yAxis";
  axisId?: AxisId;
  assert: (domainFromStore: ReadonlyArray<unknown> | undefined) => void;
}): null {
  const scale = useAppSelector((state) =>
    selectAxisScale(state, props.axisType, props.axisId ?? 0, false),
  );
  createEffect(() => {
    const value = (() => scale()?.domain())();
    ((domain) => props.assert(domain))(value);
  });
  return null;
}
