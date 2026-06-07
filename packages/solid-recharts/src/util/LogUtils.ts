// Ported from recharts 3.8.1 src/util/LogUtils.ts (commit 7a23854).
// Pure util — no framework surface — behavior is byte-identical to recharts.

/* eslint no-console: 0 */
const isDev = process.env.NODE_ENV !== "production";

export const warn = (condition: boolean, format: string, ...args: unknown[]): void => {
  if (isDev && typeof console !== "undefined" && console.warn) {
    if (format === undefined) {
      console.warn("LogUtils requires an error message argument");
    }

    if (!condition) {
      if (format === undefined) {
        console.warn(
          "Minified exception occurred; use the non-minified dev environment " +
            "for the full error message and additional helpful warnings.",
        );
      } else {
        let argIndex = 0;

        console.warn(format.replace(/%s/g, () => String(args[argIndex++])));
      }
    }
  }
};
