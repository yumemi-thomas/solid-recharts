// Ported from recharts 3.8.1 src/animation/util.ts (commit 7a23854).
// Pure utils — no framework surface — so behavior is byte-identical to recharts.
// Deviations from the reference are limited to satisfying this repo's type
// discipline (no `any` / no non-null `!`).

/*
 * @description: convert camel case to dash case
 * string => string
 */
export const getDashCase = (name: string) => name.replace(/([A-Z])/g, (v) => `-${v.toLowerCase()}`);

export const getTransitionVal = (
  props: ReadonlyArray<string>,
  duration: string | number,
  easing: string,
): string => props.map((prop) => `${getDashCase(prop)} ${duration}ms ${easing}`).join(",");

/**
 * Finds the intersection of keys between two objects
 * @param {object} preObj previous object
 * @param {object} nextObj next object
 * @returns an array of keys that exist in both objects
 */
export const getIntersectionKeys = (
  preObj: Record<string, unknown>,
  nextObj: Record<string, unknown>,
): string[] =>
  [Object.keys(preObj), Object.keys(nextObj)].reduce((a, b) => a.filter((c) => b.includes(c)));

/**
 * Maps an object to another object
 * @param {function} fn function to map
 * @param {object} obj object to map
 * @returns mapped object
 */
export const mapObject = <V, R>(
  fn: (key: string, value: V | undefined) => R,
  obj: Record<string, V>,
): Record<string, R> => {
  const result: Record<string, R> = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn(key, obj[key]);
  }
  return result;
};
