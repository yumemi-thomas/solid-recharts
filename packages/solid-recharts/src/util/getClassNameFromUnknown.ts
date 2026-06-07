// Ported from recharts 3.8.1 src/util/getClassNameFromUnknown.tsx (commit 7a23854).
// No JSX → `.ts` here (the reference file's `.tsx` extension is incidental).
export function getClassNameFromUnknown(u: unknown): string {
  if (u && typeof u === "object" && "className" in u && typeof u.className === "string") {
    return u.className;
  }
  return "";
}
