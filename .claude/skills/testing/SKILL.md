---
name: testing
description: Use this skill whenever you write, run, or debug tests in the solid-recharts repo — porting a recharts spec, adding a `.spec.ts(x)` file, choosing render/query helpers, or interpreting a test failure. Covers the two pillars of this repo's test setup — (1) the Solid 2.0 **diagnostics discipline** (`expectClean`/`expectOnly`, `DEV.diagnostics`, dev-mode wiring) where any unexpected reactive-graph diagnostic fails the test, and (2) the vendored **@solid-recharts/testing-library** package (`render`, `renderHook`, `renderRef`, `testEffect`, `screen`, `fireEvent`, `waitFor`, byRole/byText queries). Trigger on `expectClean`, `expectOnly`, `DEV.diagnostics`, `STRICT_READ_UNTRACKED`, `SIGNAL_WRITE_IN_OWNED_SCOPE`, `NO_OWNER_EFFECT`, `vp test`, `renderHook`, `testEffect`, "why is my test failing with a diagnostic", or "how do I test a Solid component/hook here".
---

# Testing in solid-recharts

This repo ports **recharts 3.8.1** to **SolidJS 2.0**. Two things make its test setup
non-obvious; read this before writing or debugging a test.

1. **Diagnostics discipline** — every Solid 2.0 reactive-graph diagnostic that fires during a
   test is treated as a failure, not console noise.
2. **A vendored testing library** — the official `@solidjs/testing-library` still targets Solid
   1.x, so we ship our own Solid-2.0 port as the `@solid-recharts/testing-library` workspace
   package.

## TL;DR

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "../helper/render";
import { expectClean } from "../utils/diagnostics";

it("renders a tick label", async () => {
  await expectClean(() => {
    render(() => (
      <Surface width={100} height={100}>
        <Dot cx={5} cy={5} r={2} />
      </Surface>
    ));
    expect(screen.getByText("…")).toBeInTheDocument();
  });
});
```

- Import render/query/event helpers from **`test/helper/render`** (a thin re-export of the
  package) — one swap point for when the upstream package ships on npm.
- Import `expectClean` / `expectOnly` from **`test/utils/diagnostics`**.
- Wrap the body of behavioral tests in `expectClean(...)` by default.
- Run with `vp test run` (CI) or `vp test` (watch). `pnpm test` adds a `pretest` gate that
  refuses to run until the recharts reference is vendored (`pnpm run ref:setup`).

---

## 1. Diagnostics discipline

Solid 2.0 ships a structured diagnostics system that catches common reactive-graph mistakes in
dev (broken reactivity, writes in owned scopes, untracked async reads, lifecycle misuse). The
full code reference is in `.claude/skills/solidjs-2/references/diagnostics.md`.

**The rule: every diagnostic is signal, not noise — tests fail on unexpected ones.** This matters
because AI-generated (and hand-written) code tends to ignore `console.warn` — it looks like
"works anyway" output. But a `STRICT_READ_UNTRACKED` warning means a piece of reactivity is
broken: a future state change won't propagate. The test passes while the state is static and the
bug only surfaces the first time the state changes. Failing on the diagnostic catches the broken
pattern at authoring time.

### Two severities

- **Errors throw** — `SIGNAL_WRITE_IN_OWNED_SCOPE`, `CLEANUP_IN_FORBIDDEN_SCOPE`,
  `PRIMITIVE_IN_FORBIDDEN_SCOPE`, `PENDING_ASYNC_UNTRACKED_READ`, etc. A test that triggers one
  fails by virtue of the throw. Zero tolerance is enforced for free.
- **Warnings only log** — `STRICT_READ_UNTRACKED`, `NO_OWNER_EFFECT`, `NO_OWNER_CLEANUP`,
  `NO_OWNER_BOUNDARY`, `RUN_WITH_DISPOSED_OWNER`, `ASYNC_OUTSIDE_LOADING_BOUNDARY`, etc.
  `expectClean` is what turns these into a failure.

### The helpers (`test/utils/diagnostics.ts`)

Both wrap the code under test in `DEV.diagnostics.capture()` and filter out allowlisted codes
before asserting.

```ts
// Default for behavioral tests: assert NO unexpected diagnostic fired.
await expectClean(() => {
  /* render + assertions */
});

// For tests that DELIBERATELY verify a misuse produces the right diagnostic.
// Asserts ONLY these codes fired, and each fired at least once.
await expectOnly(["STRICT_READ_UNTRACKED"], () => {
  /* the wrong pattern */
});
```

A behavioral test that doesn't wrap its body in `expectClean` is **missing the assertion** — add
it unless there's a reason not to.

### The allowlist (`test/utils/diagnostics-allowlist.ts`)

`GLOBALLY_ACCEPTED_DIAGNOSTICS` holds codes accepted as informational (currently only
`ASYNC_OUTSIDE_LOADING_BOUNDARY`). Both helpers filter these out. **Adding a code requires a
justification** in the commit/PR referencing the diagnostics reference or the recharts behavior
being matched — the default is zero tolerance and the list should stay short.

### Why it works / wiring (don't break this)

Diagnostics only fire in Solid's **dev build** (`dist/dev.js`), selected by the `development`
export condition. `packages/solid-recharts/vite.config.ts` sets:

```ts
resolve: { conditions: ['development', 'browser'] },  // selects dist/dev.js (not the SSR build)
define: { _SOLID_DEV_: 'true', __DEV__: 'true' },      // richer diagnostics (owner names, graph hooks)
```

and `test/setup.ts` sets `globalThis._SOLID_DEV_ / __DEV__ = true` belt-and-suspenders. If you
ever see _zero_ diagnostics where you expect them, check these first — the SSR build (`node`
condition) strips reactivity and emits nothing.

---

## 2. @solid-recharts/testing-library

A vendored Solid 2.0 port of `@solidjs/testing-library` (`next` branch). Lives at
`packages/solid-testing-library/`; `solid-recharts` depends on it as `workspace:*` and re-exports
it through `test/helper/render.ts`. It re-exports everything from `@testing-library/dom`
(`screen`, `fireEvent`, `waitFor`, `within`, all `getBy*/queryBy*/findBy*` queries) plus the
Solid-specific helpers below.

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
await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
```

### `renderHook` — hooks / primitives

```ts
const { result, owner, cleanup } = renderHook(useOffset, { initialProps: [opts], wrapper });
expect(result.width).toBe(100);
```

`initialProps` is the **argument array** passed to the hook. A `wrapper` must **always** return
`props.children`.

### `renderRef` — ref handlers (directives are gone in 2.0)

Solid 2.0 removed directives; test ref callbacks instead:

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

Note: our copy's error handler calls the error **accessor** (`fail(err())`), matching upstream —
`createErrorBoundary`'s fallback receives `Accessor<unknown>`, not a value. (This was a fix vs.
the original vendor; don't revert it to `fail(err)`.)

### Async queries are rarely needed

Solid's reactivity is near-instantaneous, so prefer sync `getBy*`. Reach for `findBy*` / `waitFor`
only for genuinely async behavior — transitions, `<Loading>`/Suspense, resources, router
navigation.

### Re-syncing the vendor

Keep `packages/solid-testing-library/src/{index,types}.ts` as close to
[upstream `next`](https://github.com/solidjs/solid-testing-library/tree/next) as the 2.0 API
allows so a future re-sync (or swap to the published npm package) stays mechanical. Known
intentional deltas from upstream: long JSDoc trimmed; `renderRef`/`RenderRefOptions` generics
simplified (dropped unused type params); `testEffect` error handler kept as `fail(err())`.

---

## TDD workflow (per AGENTS.md)

- Port **every** `test()` case from the unit's real recharts spec
  (`vendor/recharts-reference/test/<path>`), not a sample. Track status in `TESTS.md`
  (`pending → ported-red → green`).
- **Red first.** Author the spec before the implementation; implement the minimum to go green.
- Tier A (DOM/behavioral): assertions byte-identical, change only the harness. Tier B
  (state-internal): equivalent tests, expectations golden-anchored to recharts.
- Spec files are `test/**/*.spec.ts?(x)`. `vitest` globals are on (`describe/it/expect` need no
  import, but importing them is fine and clearer).

## Commands

| command                             | what it does                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| `pnpm test`                         | full run — includes the `pretest` reference gate                      |
| `pnpm run ref:setup` / `ref:verify` | clone/verify the pinned recharts reference the gate requires          |
| `vp test run [pattern]`             | run once (from `packages/solid-recharts/`), bypasses the pretest gate |
| `vp test`                           | watch mode                                                            |
| `pnpm typecheck`                    | `tsc --noEmit` across the workspace                                   |
