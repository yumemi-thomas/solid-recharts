// Ported from recharts 3.8.1 src/util/round.ts (commit 7a23854).
// Pure math — no framework surface — so behavior is byte-identical to recharts.

// if you go lower than 3, wild wild things happen during rendering
const defaultRoundPrecision = 4;

export function round(num: number, roundPrecision: number = defaultRoundPrecision): number {
  const factor = 10 ** roundPrecision;
  const rounded = Math.round(num * factor) / factor;
  if (Object.is(rounded, -0)) {
    return 0;
  }
  return rounded;
}

/**
 * This function will accept a string template literal and for each
 * variable placeholder, it will round the value to avoid long float numbers in
 * the SVG path which might cause rendering issues in some browsers.
 */
export function roundTemplateLiteral(
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<number | string>
): string {
  return strings.reduce((result, string, i) => {
    const value = values[i - 1];
    if (typeof value === "string") {
      return result + value + string;
    }
    if (value !== undefined) {
      return result + round(value) + string;
    }
    return result + string;
  }, "");
}
