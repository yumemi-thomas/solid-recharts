// Ported from recharts 3.8.1 src/util/DataUtils.ts (grown incrementally as
// consumers need more; the full 53-case spec ports when this is completed).
import { get } from "./objectPath";
import { NonEmptyArray, Percent } from "./types";
import { round } from "./round";

let idCounter = 0;

export const uniqueId = (prefix?: string): string => {
  const id = ++idCounter;

  return `${prefix || ""}${id}`;
};

export const mathSign = (value: number): number => {
  if (value === 0) {
    return 0;
  }
  if (value > 0) {
    return 1;
  }

  return -1;
};

export const isNan = (value: unknown): boolean => typeof value === "number" && Number.isNaN(value);

export const isNumber = (value: unknown): value is number =>
  (typeof value === "number" || value instanceof Number) && !isNan(Number(value));

export const isNumOrStr = (value: unknown): value is number | string =>
  isNumber(value) || typeof value === "string";

export const isNullish = (value: unknown): value is null | undefined =>
  value === null || typeof value === "undefined";

export function noop(): undefined {}

export function interpolate(start: number | null | undefined, end: number, t: number): number;
export function interpolate(start: number | null | undefined, end: null, t: number): null;
export function interpolate(start: number | null | undefined, end: undefined, t: number): undefined;
export function interpolate(
  start: number | null | undefined,
  end: number | null,
  t: number,
): number | null;
export function interpolate(
  start: number | null | undefined,
  end: number | undefined,
  t: number,
): number | undefined;
export function interpolate(
  start: number | null | undefined,
  end: number | null | undefined,
  t: number,
): number | null | undefined;
export function interpolate(
  start: number | null | undefined,
  end: number | null | undefined,
  t: number,
): number | null | undefined {
  if (isNumber(start) && isNumber(end)) {
    return round(start + t * (end - start));
  }
  return end;
}

export const upperFirst = (value: string): string => {
  if (isNullish(value)) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

export const isPercent = (value: string | number | undefined): value is Percent =>
  typeof value === "string" && value.length > 1 && value.indexOf("%") === value.length - 1;

export const hasDuplicate = (ary: ReadonlyArray<unknown>): boolean => {
  if (!Array.isArray(ary)) {
    return false;
  }

  const len = ary.length;
  const cache: Record<string, boolean> = {};

  for (let i = 0; i < len; i++) {
    if (!cache[String(ary[i])]) {
      cache[String(ary[i])] = true;
    } else {
      return true;
    }
  }

  return false;
};

export function findEntryInArray<T>(
  ary: ReadonlyArray<T>,
  specifiedKey: number | string | ((entry: T) => unknown),
  specifiedValue: unknown,
): T | undefined {
  if (!ary || !ary.length) {
    return undefined;
  }

  return ary.find(
    (entry) =>
      entry &&
      (typeof specifiedKey === "function" ? specifiedKey(entry) : get(entry, specifiedKey)) ===
        specifiedValue,
  );
}

type LinearRegressionResult = {
  xmin: number;
  xmax: number;
  a: number;
  b: number;
};

/**
 * The least square linear regression
 * @param {Array} data The array of points
 * @returns {Object} The domain of x, and the parameter of linear function
 */
export const getLinearRegression = (
  data: NonEmptyArray<{ cx?: number; cy?: number }>,
): LinearRegressionResult => {
  const len = data.length;
  let xsum = 0;
  let ysum = 0;
  let xysum = 0;
  let xxsum = 0;
  let xmin = Infinity;
  let xmax = -Infinity;
  let xcurrent = 0;
  let ycurrent = 0;

  for (let i = 0; i < len; i++) {
    xcurrent = data[i]?.cx || 0;
    ycurrent = data[i]?.cy || 0;

    xsum += xcurrent;
    ysum += ycurrent;
    xysum += xcurrent * ycurrent;
    xxsum += xcurrent * xcurrent;
    xmin = Math.min(xmin, xcurrent);
    xmax = Math.max(xmax, xcurrent);
  }

  const a =
    len * xxsum !== xsum * xsum ? (len * xysum - xsum * ysum) / (len * xxsum - xsum * xsum) : 0;

  return {
    xmin,
    xmax,
    a,
    b: (ysum - a * xsum) / len,
  };
};

/**
 * Checks if the value is not null nor undefined.
 * @param value The value to check
 * @returns true if the value is not null nor undefined
 */
export function isNotNil<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export const getPercentValue = (
  percent: number | string | undefined,
  totalValue: number | undefined,
  defaultValue = 0,
  validate = false,
): number => {
  if (!isNumber(percent) && typeof percent !== "string") {
    return defaultValue;
  }

  let value: number;

  if (isPercent(percent)) {
    if (totalValue == null) {
      return defaultValue;
    }
    const index = percent.indexOf("%");
    // `isPercent` narrows `percent` to the `${number}%` template type (a string),
    // so `.slice` works without recharts' `as string` assertion.
    value = (totalValue * parseFloat(percent.slice(0, index))) / 100;
  } else {
    value = +percent;
  }

  if (isNan(value)) {
    value = defaultValue;
  }

  if (validate && totalValue != null && value > totalValue) {
    value = totalValue;
  }

  return value;
};
