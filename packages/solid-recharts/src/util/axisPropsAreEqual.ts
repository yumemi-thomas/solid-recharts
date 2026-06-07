// Ported from recharts 3.8.1 src/util/axisPropsAreEqual.ts (commit 7a23854).
import { AxisRange } from "../state/selectors/axisSelectors";
import { AxisDomain } from "./types";
import { propsAreEqual } from "./propsAreEqual";

function shortArraysAreEqual(
  arr1: AxisDomain | AxisRange | undefined,
  arr2: AxisDomain | AxisRange | undefined,
): boolean {
  if (arr1 === arr2) {
    return true;
  }

  if (Array.isArray(arr1) && arr1.length === 2 && Array.isArray(arr2) && arr2.length === 2) {
    return arr1[0] === arr2[0] && arr1[1] === arr2[1];
  }

  return false;
}

export function axisPropsAreEqual<
  T extends Record<string, unknown> & {
    domain?: AxisDomain;
    range?: AxisRange;
  },
>(prevProps: T, nextProps: T): boolean {
  if (prevProps === nextProps) {
    return true;
  }
  const { domain: prevDomain, range: prevRange, ...prevRest } = prevProps;
  const { domain: nextDomain, range: nextRange, ...nextRest } = nextProps;

  if (!shortArraysAreEqual(prevDomain, nextDomain)) {
    return false;
  }

  if (!shortArraysAreEqual(prevRange, nextRange)) {
    return false;
  }

  return propsAreEqual(prevRest, nextRest);
}
