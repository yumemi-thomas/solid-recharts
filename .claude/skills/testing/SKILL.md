---
name: testing
description: Use this skill whenever you write, run, or debug tests in the solid-recharts repo — porting a recharts spec, adding a `.spec.ts(x)` file, choosing render/query helpers, adding a re-run budget, or interpreting a test failure. Covers the three pillars of this repo's test setup — (1) the Solid 2.0 **diagnostics discipline** built on `@solidjs/diagnostics` (the global zero-tolerance guard in `test/setup.ts`, `captureArtifact`, `toHaveNoDiagnostics`, the per-spec allowlist), (2) **update-granularity budgets** (`expectRerunBudget`/`expectNoWaste`/`assertBudgetFile`, `test/performance/budgets.json`) plus the browser bridge used by the Playwright gate, and (3) **@solidjs/testing-library** (`render`, `renderHook`, `renderRef`, `testEffect`, `screen`, `fireEvent`, `waitFor`). Trigger on `captureArtifact`, `expectNoDiagnostics`, `toHaveNoDiagnostics`, `expectRerunBudget`, `OBSERVE.diagnostics`, `STRICT_READ_UNTRACKED`, `FLUSH_IN_EFFECT_CALLBACK`, `HUGE_FAN_IN`, `vp test`, `renderHook`, `testEffect`, "why is my test failing with a diagnostic", or "how do I test a Solid component/hook here".
---

# Testing in solid-recharts

This repo ports **recharts** (reference pinned at v3.10.1) to **SolidJS 2.0** (release candidate,
verified at `2.0.0-rc.19`). Three things make its test setup non-obvious; read this before writing
or debugging a test.

1. **Diagnostics discipline** — every Solid 2.0 reactive-graph diagnostic that fires during a test
   is a failure, not console noise. Implemented with **`@solidjs/diagnostics`**.
2. **Budgets** — hot paths (tooltip hover, data updates) have checked-in caps on re-runs and wasted
   recomputes, measured with the same package.
3. **@solidjs/testing-library** — the official Solid 2.0 testing library; specs import it directly.

## TL;DR

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";

it("renders a tick label", () => {
  render(() => (
    <Surface width={100} height={100}>
      <Dot cx={5} cy={5} r={2} />
    </Surface>
  ));
  expect(screen.getByText("…")).toBeInTheDocument();
});
// No diagnostics boilerplate: test/setup.ts guards EVERY test automatically.
```

- Import render/query/event helpers from **`@solidjs/testing-library`**.
- You do **not** wrap tests in anything to get the diagnostics check — it is global and unconditional.
- Run from the **repo root**: `vp test run [pattern]` (CI mode) or `vp test watch`. `pnpm test` runs
  the library package's script (`vp test run --config ../../vite.config.ts`, plus a `pretest` gate
  that refuses to run until the recharts reference is vendored: `pnpm run ref:setup`).
  vite-plus 1.x resolves its config from the working directory, so inside `packages/solid-recharts/`
  pass `--config ../../vite.config.ts` yourself.

---

## 1. Diagnostics discipline

Solid 2.0's dev build emits structured diagnostics with stable codes for reactive-graph mistakes
(untracked reads, writes in owned scopes, lifecycle misuse, `flush()` in an effect callback, …). The
code catalog is `.claude/skills/solidjs-2/references/diagnostics.md`; the repair guide for each code
ships in the package: `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`.

**The rule: every diagnostic is signal, not noise — tests fail on unexpected ones.** A
`STRICT_READ_UNTRACKED` warning means a piece of reactivity is broken: a future state change won't
propagate. The test passes while the state is static and the bug only surfaces the first time the
state changes. Failing on the diagnostic catches it at authoring time.

### The global guard (`test/setup.ts`)

`aroundEach` wraps every test (and its `afterEach` hooks, so the unmount is included) in
`captureArtifact(…, { attribution: false })` and then asserts
`expect(artifact).toHaveNoDiagnostics({ allow })`. A failing test prints the offending events —
code, message, `ownerPath` (root-first component chain) and `loc` (`file:line:col`).

- Error-severity codes (`REACTIVE_WRITE_IN_OWNED_SCOPE`, `CLEANUP_IN_FORBIDDEN_SCOPE`, …) throw
  from the runtime anyway; warn-severity ones (`STRICT_READ_UNTRACKED`, `NO_OWNER_EFFECT`,
  `FLUSH_IN_EFFECT_CALLBACK`, …) only log — the guard is what fails the test.
- Diagnostics only exist in Solid's **dev** build. `@solidjs/vite-plugin` selects it under vitest;
  if you ever see _zero_ diagnostics where you expect them, check that you are not importing the
  SSR/production build. The old `_SOLID_DEV_` / `__DEV__` globals no longer exist.
- `@solidjs/testing-library` and `@solidjs/diagnostics` are inlined by vitest
  (`test.server.deps.inline` in `vite.config.ts`) so they share the app's `solid-js` /
  `@solidjs/signals` instance — an externalized copy would load Node's SSR build ("Client-only API
  called on the server side") and a second signals graph the diagnostics never hear from.

### The allowlist (`test/utils/diagnostics-allowlist.ts`)

`GLOBALLY_ACCEPTED_DIAGNOSTICS` is **empty** — keep it that way. `SPEC_ACCEPTED_DIAGNOSTICS` maps a
spec file to extra accepted codes, each with a justification (currently: `HUGE_FAN_IN` for the
1000-category sparsity stress spec, and the two engine-only findings the budget spec pins). **Adding
a code requires a justification in the commit/PR** that references the diagnostics catalog or the
recharts behavior being matched. Prefer fixing the code under test.

### Testing that a misuse produces a diagnostic

Use `captureArtifact` directly and the positive matcher:

```ts
import { captureArtifact } from "@solidjs/diagnostics";
const { artifact } = await captureArtifact(() => render(() => <Bad />), { attribution: false });
expect(artifact).toHaveDiagnostic("STRICT_READ_UNTRACKED");
```

The global guard will also see that event, so such a spec needs an allowlist entry for the code.

---

## 2. Update-granularity budgets

`test/performance/chartBudgets.spec.tsx` captures hot-path scenarios (mount, mouse-enter,
mouse-move between points, mouse-leave, data update, for a `LineChart` and a `BarChart`, each at 5
and 50 data points) with attribution **on** and asserts each against its entry in
`test/performance/budgets.json` via `assertBudgetFile`:

| field           | meaning                                                         |
| --------------- | --------------------------------------------------------------- |
| `maxReruns`     | total re-runs the scenario may cause                            |
| `maxWastedRuns` | re-runs that recomputed to an unchanged value (`expectNoWaste`) |
| `scopes`        | per-scope caps by name (`tooltipActive`, `finalPayload`, …)     |
| `allow`         | diagnostic codes tolerated for that scenario                    |

The numbers are **measured**, not aspirational: reactive-graph counts are deterministic and (as the
two data sizes show) independent of the number of points. A change that adds re-runs to a hot path
fails the spec; to accept it, update the JSON in the same commit and say why. A known cost is pinned
in the spec header (`mouse-move-same-point`). To add a scenario: write it in `capture()`, run once
with generous caps, read the real numbers from the failure/`artifact.attribution`, then set the
caps to those numbers.

Name memos/effects (`{ name: "…" }`) you want to budget: attribution is only as readable as the
names in it.

### Real browser (Playwright)

`app/dev/src/main.tsx` installs `@solidjs/diagnostics/browser` (dev only) and `e2e/rendering.e2e.ts`
drives it with `captureBrowserArtifact` from `@solidjs/diagnostics/playwright`: each chart is mounted
**inside** the capture window (by clicking its gallery tab on the landing page) and
`expectNoDiagnostics(artifact)` runs on the result — the same assertion the jsdom guard uses. The
dev playground's Vite plugin runs with `diagnostics: false` and `performanceTracks: false` so the
only engine in play is the one the capture itself turns on. Run it with `npx playwright test`
(needs `pnpm` on PATH for the web server command and Chromium installed).

---

## 3. @solidjs/testing-library

The official Solid 2.0 testing library (`@solidjs/testing-library@1.0.0-rc.x`; peers
`solid-js >=2.0.0-0`). It re-exports everything from `@testing-library/dom` (`screen`, `fireEvent`,
`waitFor`, `within`, all `getBy*/queryBy*/findBy*` queries) plus the Solid-specific helpers below.

Guiding principle (from upstream): **the more your tests resemble the way the software is used,
the more confidence they give.** Prefer role/text queries over test-ids; assert on rendered DOM.

### `render` — components

`render` takes a **function returning a component**, not the component itself:

```tsx
const { container, unmount, getByText } = render(() => <App />, { wrapper: ChartProvider });
const button = getByText("Accept");
```

Options: `container`, `baseElement` (default `document.body`), `queries`, `hydrate`, `wrapper`
(a component returning `props.children`). Result: `container`, `baseElement`, `asFragment()`,
`debug()`, `unmount()`, plus bound queries.

**There is no `rerender`.** Solid doesn't re-render — it runs side effects from reactive state
changes. To drive a component across states, render once with a signal and update the signal:

```tsx
const [n, setN] = createSignal(0);
render(() => <Counter value={n()} />);
setN(1); // component reacts; no rerender call
flush(); // setters are batched: flush before asserting synchronously
expect(screen.getByText("1")).toBeInTheDocument();
```

### Writes are batched: `flush()`

Signal **and store** writes are not visible to reads until the batch flushes — including a read of
the same store right after writing it, outside any reactive scope. Tests that write and then
assert synchronously need `flush()` (the first thing to try when "the state didn't change"). In
**library code**, never call `flush()` from inside an effect callback (`FLUSH_IN_EFFECT_CALLBACK`);
event handlers and observers (ResizeObserver, …) are the legitimate places.

### Reading accessors in tests

The callback body of `<For>` / `<Show>` / `<Match>` is an owner, not a tracking scope: read an
item/index accessor in JSX (or a memo/effect), not at the top of the callback
(`STRICT_READ_UNTRACKED`). Custom render props handed to the library are called inside the
library's reactive scopes; a test that only inspects the values it receives can wrap the read in
`untrack(() => props.x)` to say so.

### `renderHook` — hooks / primitives

```ts
const { result, owner, cleanup } = renderHook(useOffset, { initialProps: [opts], wrapper });
expect(result.width).toBe(100);
```

`initialProps` is the **argument array** passed to the hook. A `wrapper` must **always** return
`props.children`.

### `renderRef` — ref handlers (directives are gone in 2.0)

```ts
const { asFragment } = renderRef(addDataValue(data), { targetElement: "div" });
```

### `testEffect` — async effect scaffold

Resolves when `done(result)` is called; rejects if the effect throws. Uses Solid 2.0's two-arg
`createEffect(compute, effect)`.

```ts
await testEffect<number>((done) => {
  const [v, setV] = createSignal(0);
  createEffect(
    () => v(),
    (value) => {
      if (value === 0) setV(1);
      else if (value === 1) done(value);
    },
  );
});
```

### Async queries are rarely needed

Solid's reactivity is near-instantaneous, so prefer sync `getBy*`. Reach for `findBy*` / `waitFor`
only for genuinely async behavior — transitions, `<Loading>`, router navigation.

---

## TDD workflow (per AGENTS.md)

- Port **every** `test()` case from the unit's real recharts spec
  (`vendor/recharts-reference/test/<path>`), not a sample.
- **Red first.** Author the spec before the implementation; implement the minimum to go green.
- Tier A (DOM/behavioral): assertions byte-identical, change only the harness. Tier B
  (state-internal): equivalent tests, expectations golden-anchored to recharts.
- Spec files are `test/**/*.spec.ts?(x)`. `vitest` globals are on (`describe/it/expect` need no
  import, but importing them is fine and clearer).
- Specs are linted with the Solid 2 rule set too (`vp check`): array `.map()` children are
  `solid/prefer-for` findings — use `<For>` (the library resolves `<For>`-rendered `<Cell>`s); a
  per-line `eslint-disable-next-line <rule> -- <reason>` is fine where the ported test deliberately
  exercises the non-idiomatic form.

## Commands

| command                             | what it does                                                 |
| ----------------------------------- | ------------------------------------------------------------ |
| `pnpm test`                         | full run — includes the `pretest` reference gate             |
| `pnpm run ref:setup` / `ref:verify` | clone/verify the pinned recharts reference the gate requires |
| `vp test run [pattern]`             | run once from the repo root, bypasses the pretest gate       |
| `vp test watch [pattern]`           | watch mode                                                   |
| `vp check --fix`                    | format + lint (type-aware, Solid v2-strict) + type check     |
| `pnpm -r typecheck`                 | `tsc --noEmit` across the workspace                          |
| `npx playwright test`               | real-browser rendering + a11y gate (`e2e/`)                  |
