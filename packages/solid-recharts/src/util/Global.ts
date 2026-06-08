// Ported from recharts 3.8.1 src/util/Global.ts (commit 7a23854).
// Pure constant object — no framework surface — so behavior is byte-identical to recharts.

const parseIsSsrByDefault = (): boolean =>
  !(
    typeof window !== "undefined" &&
    window.document &&
    typeof window.document.createElement === "function" &&
    window.setTimeout
  );

export const Global = {
  devToolsEnabled: process.env.NODE_ENV !== "production",
  isSsr: parseIsSsrByDefault(),
};
