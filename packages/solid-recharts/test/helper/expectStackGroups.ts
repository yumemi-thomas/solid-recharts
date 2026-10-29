// Ported from recharts 3.8.1 test/helper/expectStackGroups.ts (commit 7a23854).
import { expect } from "vitest";
import { StackDataPoint, StackSeries } from "../../src/util/stacks/stackTypes";
import { MaybeStackedGraphicalItem } from "../../src/state/types/StackedGraphicalItem";

interface SyncExpectationResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

export type ExpectedStackedDataSeries = ReadonlyArray<StackDataPoint>;

/*
 * Almost the same type as StackData, but with the data
 * being just an array of arrays of objects instead of a d3-stack object.
 */
export type ExpectedStackedData = ReadonlyArray<ExpectedStackedDataSeries>;

function seriesPointToTuple(seriesPoint: StackDataPoint): StackDataPoint {
  return [seriesPoint[0], seriesPoint[1]];
}

const actualSeriesToExpectedSeries = (
  s: ReadonlyArray<StackDataPoint>,
): ExpectedStackedDataSeries => {
  const array: Array<StackDataPoint> = [];
  s.forEach((item) => {
    array.push(seriesPointToTuple(item));
  });
  return array;
};

function seriesToArray(series: ReadonlyArray<ReadonlyArray<StackDataPoint>>): ExpectedStackedData {
  return series.map(actualSeriesToExpectedSeries);
}

/**
 * Comparing stack data for equality.
 * d3-stack adds static properties to arrays that confuse vitest's default matcher.
 */
export function expectStackedData(
  received: ExpectedStackedData,
  expected: ExpectedStackedData,
): void {
  if (!Array.isArray(received)) {
    throw new Error(`stackedData error: expected ${String(received)} to be an array`);
  }
  expect(seriesToArray(received)).toEqual(expected);
}

export function expectStackedSeries(
  received: ExpectedStackedDataSeries,
  expected: ExpectedStackedDataSeries,
): void {
  if (!Array.isArray(received)) {
    throw new Error(`stackedSeries error: expected ${String(received)} to be an array`);
  }
  expect(actualSeriesToExpectedSeries(received)).toEqual(expected);
}

function rechartsStackedDataMatcher(
  received: ExpectedStackedData,
  expected: ExpectedStackedData,
): SyncExpectationResult {
  try {
    expectStackedData(received, expected);
    return {
      pass: true,
      message: () => "Expected stack groups to not match",
    };
  } catch (e) {
    return {
      pass: false,
      message: () => (e instanceof Error ? e.message : String(e)),
    };
  }
}

function rechartsStackedSeriesMatcher(
  received: ExpectedStackedDataSeries,
  expected: ExpectedStackedDataSeries,
): SyncExpectationResult {
  try {
    expectStackedSeries(received, expected);
    return {
      pass: true,
      message: () => "Expected stack series to not match",
    };
  } catch (e) {
    return {
      pass: false,
      message: () => (e instanceof Error ? e.message : String(e)),
    };
  }
}

function rechartsStackedSeriesPointMatcher(
  received: StackDataPoint,
  expected: StackDataPoint,
): SyncExpectationResult {
  try {
    if (!Array.isArray(received)) {
      throw new Error(`stackedSeriesPoint error: expected ${String(received)} to be an array`);
    }
    expect(seriesPointToTuple(received)).toEqual(expected);
    return {
      pass: true,
      message: () => "Expected stack series point to not match",
    };
  } catch (e) {
    return {
      pass: false,
      message: () => (e instanceof Error ? e.message : String(e)),
    };
  }
}

expect.extend({
  toBeRechartsStackedData: rechartsStackedDataMatcher,
  toBeRechartsStackedSeries: rechartsStackedSeriesMatcher,
  toBeRechartsStackedSeriesPoint: rechartsStackedSeriesPointMatcher,
});

declare module "vitest" {
  interface AsymmetricMatchersContaining {
    toBeRechartsStackedData: (
      expectedStackedData: ExpectedStackedData,
    ) => ReadonlyArray<StackSeries>;
    toBeRechartsStackedSeries: (expectedStackedSeries: ExpectedStackedDataSeries) => StackSeries;
    toBeRechartsStackedSeriesPoint: (expectedStackedSeriesPoint: StackDataPoint) => StackDataPoint;
  }
}

/**
 * Vitest helpers are typed to return `any` which disables type checking in the whole test if used.
 */
export function expectGraphicalItemSettings(
  expected: MaybeStackedGraphicalItem,
): MaybeStackedGraphicalItem {
  return expect.objectContaining(expected);
}
