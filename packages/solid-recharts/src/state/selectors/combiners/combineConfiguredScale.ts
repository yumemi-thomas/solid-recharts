// Ported from recharts 3.8.1 src/state/selectors/combiners/combineConfiguredScale.ts
// (commit 7a23854).
//
// Deviation: the reference does the dynamic d3-scale lookup through
// `d3Scales as Record<string, unknown>` and then calls the looked-up value
// (`scales[name]()`). Both the `as` and the call-of-unknown are banned here, so
// we spread the namespace into a plain record and narrow each candidate to a
// scale factory through a user-defined type guard before calling it. Behavior is
// identical (unknown names / non-function exports → `undefined`).
import * as d3Scales from "d3-scale";
import {
  CategoricalDomain,
  CategoricalDomainItem,
  D3ScaleType,
  NumberDomain,
  RechartsScaleType,
} from "../../../util/types";
import { CustomScaleDefinition } from "../../../util/scale/CustomScaleDefinition";
import { BaseCartesianAxis } from "../../cartesianAxisSlice";
import { AxisRange } from "../axisSelectors";
import { upperFirst } from "../../../util/DataUtils";

const d3ScaleRecord: Record<string, unknown> = { ...d3Scales };

type ScaleFactory<Domain extends CategoricalDomainItem> = () => CustomScaleDefinition<Domain>;

function isScaleFactory<Domain extends CategoricalDomainItem>(
  value: unknown,
): value is ScaleFactory<Domain> {
  return typeof value === "function";
}

function getD3ScaleFromType<Domain extends CategoricalDomainItem = CategoricalDomainItem>(
  realScaleType: D3ScaleType | RechartsScaleType,
): CustomScaleDefinition<Domain> | undefined {
  const direct = d3ScaleRecord[realScaleType];
  if (isScaleFactory<Domain>(direct)) {
    return direct();
  }
  const name = `scale${upperFirst(realScaleType)}`;
  const named = d3ScaleRecord[name];
  if (isScaleFactory<Domain>(named)) {
    return named();
  }
  return undefined;
}

/**
 * Converts an external scale definition into an internal RechartsScale
 * definition.
 * @param scale custom function scale — if you have the `string` from outside,
 *   use `combineRealScaleType` first to validate it.
 * @param axisDomain
 * @param axisRange
 */
export function combineConfiguredScaleInternal(
  scale:
    | CustomScaleDefinition
    | CustomScaleDefinition<string>
    | CustomScaleDefinition<number>
    | CustomScaleDefinition<Date>,
  axisDomain: ReadonlyArray<CategoricalDomainItem>,
  axisRange: AxisRange,
): CustomScaleDefinition;
export function combineConfiguredScaleInternal(
  scale: D3ScaleType | RechartsScaleType,
  axisDomain: ReadonlyArray<CategoricalDomainItem>,
  axisRange: AxisRange,
): CustomScaleDefinition;
export function combineConfiguredScaleInternal(
  scale: D3ScaleType | RechartsScaleType | undefined,
  axisDomain: ReadonlyArray<CategoricalDomainItem>,
  axisRange: AxisRange,
): CustomScaleDefinition | undefined;
export function combineConfiguredScaleInternal(
  scale: undefined,
  axisDomain: ReadonlyArray<CategoricalDomainItem>,
  axisRange: AxisRange,
): undefined;
export function combineConfiguredScaleInternal<
  Domain extends CategoricalDomainItem = CategoricalDomainItem,
>(
  scale: D3ScaleType | RechartsScaleType | CustomScaleDefinition<Domain> | undefined,
  axisDomain: ReadonlyArray<Domain>,
  axisRange: AxisRange,
): CustomScaleDefinition<Domain> | undefined;
export function combineConfiguredScaleInternal<
  Domain extends CategoricalDomainItem = CategoricalDomainItem,
>(
  scale: D3ScaleType | RechartsScaleType | CustomScaleDefinition<Domain> | undefined,
  axisDomain: ReadonlyArray<Domain>,
  axisRange: AxisRange,
): CustomScaleDefinition<Domain> | undefined {
  if (typeof scale === "function") {
    return scale.copy().domain(axisDomain).range(axisRange);
  }
  if (scale == null) {
    return undefined;
  }
  const d3ScaleFunction: CustomScaleDefinition<Domain> | undefined = getD3ScaleFromType(scale);
  if (d3ScaleFunction == null) {
    return undefined;
  }
  d3ScaleFunction.domain(axisDomain).range(axisRange);
  return d3ScaleFunction;
}

export function combineConfiguredScale(
  axis: BaseCartesianAxis,
  realScaleType: D3ScaleType | RechartsScaleType | undefined,
  axisDomain: NumberDomain | CategoricalDomain | undefined,
  axisRange: AxisRange | undefined,
): CustomScaleDefinition | undefined {
  if (axisDomain == null || axisRange == null) {
    return undefined;
  }
  if (typeof axis.scale === "function") {
    return combineConfiguredScaleInternal(axis.scale, axisDomain, axisRange);
  }
  return combineConfiguredScaleInternal(realScaleType, axisDomain, axisRange);
}
