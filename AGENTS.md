# AGENTS.md — solid-recharts

A port of **recharts** (reference pinned at **v3.10.1**) to **SolidJS 2.0** with behavior parity
and stronger types. The port is complete; work here is maintenance, upstream syncs, and features.
**READ THIS BEFORE WRITING ANY CODE.**

## Parity discipline (every change touching ported behavior)

1. **Ensure the reference exists:** `pnpm run ref:verify`. If it fails, `pnpm run ref:setup`.
   Real recharts source lives at `vendor/recharts-reference/` (pinned commit
   `ffb918798051ef040bb7f9922d3850c9c189f39f` = v3.10.1). `pnpm test` will refuse to run without it.
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
- Before writing or debugging any test, read `.claude/skills/testing/SKILL.md` (diagnostics
  discipline + update budgets + `@solidjs/testing-library` harness).
- **Diagnostics are a hard gate.** `test/setup.ts` wraps every test in `@solidjs/diagnostics`'
  `captureArtifact` and fails it on any Solid diagnostic that isn't allowlisted in
  `test/utils/diagnostics-allowlist.ts` (global list empty; per-spec entries need a justification).
  Hot paths have checked-in re-run/waste budgets (`test/performance/budgets.json`); the Playwright
  gate asserts no diagnostics in a real browser too.

## Props

Match recharts props **exactly**, except this **closed** list of framework-idiomatic deviations:
`className` → `class`; React `style` object → Solid `JSX.CSSProperties`; event props become Solid
delegated handlers; `forwardRef` → `ref` prop; `children` typed as `JSX.Element`. **No other prop
renames or restructuring.**

## SolidJS 2.0

This is a **Solid 2.0 (release candidate, verified at `2.0.0-rc.19`)** codebase. **Before writing ANY Solid
code, read `.claude/skills/solidjs-2/SKILL.md`.**
Patterns from React or Solid 1.x are bugs here. Highest-frequency rules: two-arg
`createEffect(compute, apply)`; never destructure `props` (pass through, read `props.x` in JSX); props
are values, not accessors; no `batch()`; `class` not `classList`/`className`; store APIs from `solid-js`,
JSX/`render` from `@solidjs/web`; `tsconfig` `jsxImportSource: "@solidjs/web"`. Never call `flush()` from
inside an effect callback (it is a no-op that trips `FLUSH_IN_EFFECT_CALLBACK`).

The Solid 2 lint rules (`eslint-plugin-solid` `v2-strict`, run by Oxlint as a JS plugin) are part of
`vp check` with **zero findings**. A per-line `eslint-disable-next-line <rule> -- <reason>` needs a
reason; no file- or rule-wide disables. One-time reads of props are written `untrack(() => props.x)`
(or a getter argument to a `use*` hook), so the intent is visible.

## Toolchain — Vite+

This project uses **Vite+** (`vp`, 1.x), VoidZero's unified toolchain (it wraps Vite, Vitest 5, Oxlint,
Oxfmt), with **pnpm 12**. Commands: `vp test run`, `vp check`, `vp lint`, `vp build`. `vite`/`vitest` are
remapped to the Vite+ engines via `overrides` in pnpm-workspace.yaml. Config lives in the single root
`vite.config.ts`; `vp` resolves it from the working directory, so run from the repo root (the library's
`pnpm test` script passes `--config ../../vite.config.ts`). The Solid compiler plugin is
`@solidjs/vite-plugin` (renamed from `vite-plugin-solid`). Treat toolchain breakage as a bug to report,
not a reason to weaken tests. Exception: `app/docs` is deliberately **outside** the workspace on real
`vite@8` (TanStack Start SSR breaks on the vite-plus engine); it has its own lockfile — plain
`pnpm install` inside `app/docs`. The docs app imports the library's raw **source** through an alias, so
every package the library imports (`d3-scale`, `d3-shape`, …) must also be a dependency of
`app/docs/package.json` (and its lockfile): Vercel installs the docs workspace alone, and a build inside the
repo cannot notice a missing one because those imports resolve from the repo root's `node_modules`.

## Types

No `any`. No `as` assertions. `unknown` only behind guards. Sole sanctioned loosening:
`dataKey = string | number | ((entry: T) => unknown)` resolved via `getValueByDataKey` (returns
`unknown`, consumed behind `isNumber`/`isNumOrStr`) with a **dev-only invariant** on non-resolution.

## Gates before you're done

- `pnpm test` — full jsdom suite (includes the reference pretest gate).
- `vp check --fix` — format + lint (type-aware, Solid v2-strict) across the workspace.
- `pnpm -r typecheck`.
- `npx playwright test` — real-browser rendering gate (`e2e/`); jsdom green ≠ browser green,
  especially for Portal/zIndex work. It also asserts no Solid diagnostics via the
  `@solidjs/diagnostics` browser bridge.
- `pnpm run docs:isolated` — builds the docs app in a copy that has none of the monorepo's
  `node_modules` (frozen lockfile, like Vercel). A plain `pnpm install && pnpm build` inside `app/docs`
  also has to pass, but it cannot see a missing docs dependency.
