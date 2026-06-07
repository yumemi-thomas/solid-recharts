// Ported from recharts 3.8.1 src/state/selectors/combiners/combineActiveTooltipIndex.ts.
// Deviation: `DataKey<unknown>` instead of `DataKey<any>`.
import { TooltipIndex, TooltipInteractionState } from "../../tooltipSlice";
import { ChartData } from "../../chartDataSlice";
import { isWellBehavedNumber } from "../../../util/isWellBehavedNumber";
import { CategoricalDomain, DataKey, NumberDomain } from "../../../util/types";
import { getValueByDataKey } from "../../../util/ChartUtils";
import { isWellFormedNumberDomain } from "../../../util/isDomainSpecifiedByUser";

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (value instanceof Date) {
    const numericValue = value.valueOf();
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isValueWithinNumberDomain(value: unknown, domain: NumberDomain): boolean {
  const numericValue = toFiniteNumber(value);
  const lowerBound = domain[0];
  const upperBound = domain[1];

  if (numericValue === undefined) {
    return false;
  }

  const min = Math.min(lowerBound, upperBound);
  const max = Math.max(lowerBound, upperBound);
  return numericValue >= min && numericValue <= max;
}

function isValueWithinDomain(
  entry: unknown,
  axisDataKey: DataKey<unknown> | undefined,
  domain: NumberDomain | CategoricalDomain | undefined,
): boolean {
  if (domain == null || axisDataKey == null) {
    return true;
  }

  const value = getValueByDataKey(entry, axisDataKey);
  if (value == null) {
    return true;
  }

  if (!isWellFormedNumberDomain(domain)) {
    return true;
  }

  return isValueWithinNumberDomain(value, domain);
}

export const combineActiveTooltipIndex = (
  tooltipInteraction: TooltipInteractionState | undefined,
  chartData: ChartData,
  axisDataKey?: DataKey<unknown>,
  domain?: NumberDomain | CategoricalDomain,
): TooltipIndex | null => {
  const desiredIndex: TooltipIndex | undefined = tooltipInteraction?.index;
  if (desiredIndex == null) {
    return null;
  }

  const indexAsNumber = Number(desiredIndex);
  if (!isWellBehavedNumber(indexAsNumber)) {
    // Charts like Sankey and Treemap do not support numerical indexes.
    return desiredIndex;
  }

  const lowerLimit = 0;
  let upperLimit: number = +Infinity;

  if (chartData.length > 0) {
    upperLimit = chartData.length - 1;
  }

  const clampedIndex = Math.max(lowerLimit, Math.min(indexAsNumber, upperLimit));
  const entry = chartData[clampedIndex];

  if (entry == null) {
    return String(clampedIndex);
  }

  if (!isValueWithinDomain(entry, axisDataKey, domain)) {
    return null;
  }

  return String(clampedIndex);
};
