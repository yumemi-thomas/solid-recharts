// Ported from recharts 3.8.1 src/polar/defaultPolarRadiusAxisProps.tsx (commit 7a23854).
//
// DEVIATION: typed only `as const` for now (PolarRadiusAxis component deferred);
// when it lands its `Props` pins these via `satisfies`. Values byte-identical to
// recharts. Consumed by polarAxisSelectors' implicitRadiusAxis.
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";

export const defaultPolarRadiusAxisProps = {
  allowDataOverflow: false,
  allowDecimals: false,
  allowDuplicatedCategory: true,
  angle: 0,
  axisLine: true,
  includeHidden: false,
  hide: false,
  niceTicks: "auto",
  label: false,
  orientation: "right",
  radiusAxisId: 0,
  reversed: false,
  scale: "auto",
  stroke: "#ccc",
  tick: true,
  tickCount: 5,
  tickLine: true,
  type: "auto",
  zIndex: DefaultZIndexes.axis,
} as const;
