// Ported from recharts 3.8.1 test/helper/trim.ts.
/**
 * Trims a path `d` attribute for whitespace-insensitive comparison (the SVG spec
 * is whitespace-insensitive but vitest's comparator is not).
 */
export function trim(str: string | null | undefined): string | null | undefined {
  if (typeof str !== "string") {
    return str;
  }
  return str.replace(/^\s*/, "").replace(/\s*$/, "").replace(/\s+/g, " ");
}
