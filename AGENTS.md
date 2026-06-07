# AGENTS.md — solid-recharts

Porting **recharts 3.8.1** to **SolidJS 2.0** with behavior parity and stronger types.
**READ THIS BEFORE WRITING ANY CODE.**

## MANDATORY pre-implementation ritual (every unit, no exceptions)

Before implementing ANY file you MUST:

1. **Ensure the reference exists:** `pnpm run ref:verify`. If it fails, `pnpm run ref:setup`.
   Real recharts 3.8.1 source lives at `vendor/recharts-reference/` (pinned commit
   `7a23854d847ad21aaeec6cd446fe2a37a7edb8c1`). `pnpm test` will refuse to run without it.
2. **Read the REAL source** for the unit: `vendor/recharts-reference/src/<path>`.
3. **Read the REAL spec:** `vendor/recharts-reference/test/<path>`.
4. **Cite them in your message** (file path + line range). If you cannot cite the real
   source/spec you just read, you skipped steps 2–3 — STOP and do them.

**NEVER implement from memory of recharts.** Memory reconstructs the OLD recharts 2.x
`cloneElement`/context architecture. recharts 3.x is Redux/selector-based. That mismatch is
the #1 cause of behavior drift, and is why a previous attempt failed.

## TDD loop

- Port **every** `test()` case from the unit's real spec (not a sample).
  - Tier A (DOM/behavioral): assertions **byte-identical**; change only the harness.
  - Tier B (state-internal): equivalent tests, expectations **anchored to recharts** (golden capture).
- **Red first.** Implement the minimum that goes green. Keep the recharts spec beside the port for diffing.
- **Timing:** the spec is authored before its implementation; leaves go red→green per unit, core slices port the whole spec up front and go green incrementally as the vertical slice fills. Do NOT bulk-port all specs up front. Track completeness in `TESTS.md` (every spec: `pending → ported-red → green`); update the row when you port a unit.

## Build order

Follow `PORT_ORDER.md` (generated from the real import graph). Build the **Tier-0 leaf primitives & utils first**. The **Tier-2 core is one 210-file runtime cycle** — port it feature-vertically, not file-by-file (see PORT_ORDER.md).

## Props

Match recharts props **exactly**, except this **closed** list of framework-idiomatic deviations:
`className` → `class`; React `style` object → Solid `JSX.CSSProperties`; event props become Solid
delegated handlers; `forwardRef` → `ref` prop; `children` typed as `JSX.Element`. **No other prop
renames or restructuring.**

## SolidJS 2.0

This is a **Solid 2.0 (beta)** codebase. **Before writing ANY Solid code, read `.claude/skills/solidjs-2/SKILL.md`.**
Patterns from React or Solid 1.x are bugs here. Highest-frequency rules: two-arg
`createEffect(compute, apply)`; never destructure `props` (pass through, read `props.x` in JSX); props
are values, not accessors; no `batch()`; `class` not `classList`/`className`; store APIs from `solid-js`,
JSX/`render` from `@solidjs/web`; `tsconfig` `jsxImportSource: "@solidjs/web"`.

## Toolchain — Vite+

This project uses **Vite+** (`vp`), VoidZero's unified toolchain (it wraps Vite, Vitest, Oxlint, Oxfmt).
Commands: `vp test`, `vp check`, `vp lint`, `vp build`. `vite`/`vitest` are remapped to the Vite+ engines
via `overrides` in package.json. Config lives in the single root `vite.config.ts`. Vite+ is in technical
preview — pin versions and treat breakage as a toolchain bug to report, not a reason to weaken tests.

## Types

No `any`. No `as` assertions. `unknown` only behind guards. Sole sanctioned loosening:
`dataKey = string | number | ((entry: T) => unknown)` resolved via `getValueByDataKey` (returns
`unknown`, consumed behind `isNumber`/`isNumOrStr`) with a **dev-only invariant** on non-resolution.
