# solid-recharts — port methodology (north star)

A SolidJS 2.0 port of **recharts 3.8.1** with stronger types and **absolute behavior parity**.

## Locked decisions

- **Reference is pinned.** Target recharts **3.8.1**, vendored read-only at `vendor/recharts-reference/`. Every unit is ported from real source — never from memory. (Recharts 3.x is a Redux-Toolkit app internally; reconstructing it from memory rebuilds the wrong 2.x `cloneElement` architecture. That is the drift trap.)
- **State the Solid way.** The internal Redux/reselect layer is reimplemented with `createStore` + `createProjection`, mirroring recharts' selector graph **one node per memo/projection** (same edges → same seams → less drift). Framework-agnostic math deps stay (`victory-vendor`/d3, `decimal.js-light`, `es-toolkit`, `clsx`, `tiny-invariant`) so numbers are bit-identical; only `@reduxjs/toolkit` / `react-redux` / `use-sync-external-store` are replaced.
- **Same public API.** Named components (`LineChart`, `Line`, `XAxis`, …) are the surface; `createCartesianChart`/`createPolarChart` stay internal plumbing, as in recharts.
- **Types.** No `any`. No `as` assertions. `unknown` only behind guards. The single sanctioned loosening is `dataKey`: `string | number | ((entry: T) => unknown)`, resolved through `getValueByDataKey` (returns `unknown`, consumed behind `isNumber`/`isNumOrStr`) with a **dev-only invariant** when a key fails to resolve against non-empty data.

## The anti-drift rule

**The recharts test suite is the specification. Every Solid test is a port of a real recharts test; authoring a test not derived from recharts is forbidden.** Expected values are lifted from recharts (or captured by running it), never produced by our implementation.

Two tiers:

- **Tier A — behavioral/DOM tests** (most of `test/chart`, `test/cartesian`, `test/component`, `test/shape`, `test/polar`). Render → assert on observable SVG. Framework-independent. Port mechanically; **assertions byte-identical**. Harness changes only: `@testing-library/react` → local Solid render shim, drop `import React`, `render(() => <…/>)` thunk.
- **Tier B — state-internal tests** (`test/state/*`, ~49 specs). Can't port mechanically once RTK is gone. Each becomes an _equivalent test_: scenario re-expressed against the Solid store/projection API, **expected values anchored to recharts** via a golden-capture harness (a script that drives real recharts and dumps selector/derived outputs to JSON fixtures). Every equivalent test carries a provenance header: `// equiv of test/state/<file>:<line>`.

## Per-unit TDD loop (depth-first; a unit is fully covered before moving on)

1. Read the real source **and** the real spec from `vendor/recharts-reference/`.
2. Port **every** `test()` case (not a sample) — Tier A verbatim, Tier B as equivalent tests.
3. Run **red**.
4. Implement the minimum Solid code that goes **green** (e.g. Dot wires no events because its spec never tests firing).
5. Keep the original recharts spec beside the port so a reviewer can confirm only the harness changed.

## Port order (dependency order, leaves first)

`util` → `shape` → state slices/projections (+ golden harness) → state bindings → `container`/`chart` → `cartesian`/`polar`/`component`.

## Toolchain (proven green)

- `solid-js@2.0.0-beta.14`, `@solidjs/web@2.0.0-beta.14`, `vite-plugin-solid@3.0.0-next.5`, `vitest` + `jsdom`.
- `tsconfig`: `jsxImportSource: "@solidjs/web"`, `strict`, `noUncheckedIndexedAccess`.
- **`@solidjs/testing-library@0.8.10` is NOT 2.0-ready** (its `solid-js` peer excludes 2.0 prereleases; it imports the removed `solid-js/web` path). `test/helper/render.ts` is a minimal shim over `@solidjs/web` with the same `render`/`cleanup`/`container` surface — swap it for the official lib once it supports 2.0.

## Status

- ✅ Toolchain green. Slice proven: `Dot` + `Surface`, 5/5 ported assertions pass, `tsc` clean, zero `any`/`as`.
- ⏭️ Next: build the Tier-B golden-capture harness against vendored recharts; port `tooltipSlice` → `createStore`/projection with one equivalent test green.
