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
