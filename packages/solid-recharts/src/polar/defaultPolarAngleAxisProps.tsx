// Ported from recharts 3.8.1 src/polar/defaultPolarAngleAxisProps.tsx (commit 7a23854).
//
// DEVIATION: recharts types this `as const satisfies Props` (Props from
// PolarAngleAxis). The PolarAngleAxis component is deferred to a follow-up, so
// for now the object is typed only `as const`; when the component lands its
// `Props` will pin these via `satisfies`. The values are byte-identical to
// recharts. Consumed by polarAxisSelectors' implicitAngleAxis (and, later, the
// component's default-props merge).
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";

export const defaultPolarAngleAxisProps = {
  allowDecimals: false,
  allowDuplicatedCategory: true, // see recharts note: false breaks Radar tooltip sync
  allowDataOverflow: false,
  angle: 0,
  angleAxisId: 0,
  axisLine: true,
  axisLineType: "polygon",
  cx: 0,
  cy: 0,
  hide: false,
  includeHidden: false,
  label: false,
  niceTicks: "auto",
  orientation: "outer",
  reversed: false,
  scale: "auto",
  tick: true,
  tickLine: true,
  tickSize: 8,
  type: "auto",
  zIndex: DefaultZIndexes.axis,
} as const;
