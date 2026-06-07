// Ported from recharts 3.8.1 src/util/isWellBehavedNumber.ts (commit 7a23854).
// Pure util — no framework surface — so behavior is byte-identical to recharts.

export function isWellBehavedNumber(n: unknown): n is number {
  return Number.isFinite(n);
}

export function isPositiveNumber(n: unknown): n is number {
  return typeof n === "number" && n > 0 && Number.isFinite(n);
}
