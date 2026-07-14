# AGENTS.md — solid-recharts

A port of **recharts** (reference pinned at **v3.9.2**) to **SolidJS 1.x** with behavior parity
and stronger types. The port is complete; work here is maintenance, upstream syncs, and features.
**READ THIS BEFORE WRITING ANY CODE.**

## Parity discipline (every change touching ported behavior)

1. **Ensure the reference exists:** `pnpm run ref:verify`. If it fails, `pnpm run ref:setup`.
   Real recharts source lives at `vendor/recharts-reference/` (pinned commit
   `b3451050c027a23957ffa50a2665c9119df21e47` = v3.9.2). `pnpm test` will refuse to run without it.
2. **Read the REAL source** for the unit: `vendor/recharts-reference/src/<path>`.
3. **Read the REAL spec:** `vendor/recharts-reference/test/<path>`.
4. **Cite them in your message** (file path + line range). If you cannot cite the real
   source/spec you just read, you skipped steps 2–3 — STOP and do them.

**NEVER implement from memory of recharts.** Memory reconstructs the OLD recharts 2.x
`cloneElement`/context architecture. recharts 3.x is Redux/selector-based (here: Solid-native
stores/projections mirroring the same selector graph). That mismatch is the #1 cause of drift.

## Tests

- The recharts test suite is the specification. When porting or syncing a unit, port **every**
  `test()` case from its real spec (not a sample).
  - Tier A (DOM/behavioral): assertions **byte-identical**; change only the harness.
  - Tier B (state-internal): equivalent tests, expectations **anchored to recharts** (golden capture).
- **Red first.** Implement the minimum that goes green.
- Use the Solid 1-compatible `@solidjs/testing-library` harness. Solid 2 structured diagnostics
  and `flush()` conventions do not apply on this branch.

## Props

Match recharts props **exactly**, except this **closed** list of framework-idiomatic deviations:
`className` → `class`; React `style` object → Solid `JSX.CSSProperties`; event props become Solid
delegated handlers; `forwardRef` → `ref` prop; `children` typed as `JSX.Element`. **No other prop
renames or restructuring.**

## SolidJS 1.x

This branch targets **Solid 1.9+**. Use single-callback `createEffect`, `onMount`/`onCleanup`,
`batch()` only for deliberate atomic updates, stores from `solid-js/store`, DOM APIs from
`solid-js/web`, and `jsxImportSource: "solid-js"`. Context providers use `.Provider`; index-keyed
lists use `<Index>`. Never destructure reactive props: pass `props` through and read `props.x`
inside JSX or a tracked computation.

## Toolchain — Vite+

This project uses **Vite+** (`vp`), VoidZero's unified toolchain (it wraps Vite, Vitest, Oxlint, Oxfmt).
Commands: `vp test`, `vp check`, `vp lint`, `vp build`. `vite`/`vitest` are remapped to the Vite+ engines
via `overrides` in pnpm-workspace.yaml. Config lives in the single root `vite.config.ts`. Vite+ is in
technical preview — pin versions and treat breakage as a toolchain bug to report, not a reason to
weaken tests. Exception: `app/docs` is deliberately **outside** the workspace on real `vite@8`
(TanStack Start SSR breaks on the vite-plus engine); it has its own lockfile — plain `pnpm install`
inside `app/docs`.

## Types

No `any`. No `as` assertions. `unknown` only behind guards. Sole sanctioned loosening:
`dataKey = string | number | ((entry: T) => unknown)` resolved via `getValueByDataKey` (returns
`unknown`, consumed behind `isNumber`/`isNumOrStr`) with a **dev-only invariant** on non-resolution.

## Gates before you're done

- `pnpm test` — full jsdom suite (includes the reference pretest gate).
- `vp check --fix` — format + lint (type-aware) across the workspace.
- `pnpm -r typecheck`.
- `npx playwright test` — real-browser rendering gate (`e2e/`); jsdom green ≠ browser green,
  especially for Portal/zIndex work.
