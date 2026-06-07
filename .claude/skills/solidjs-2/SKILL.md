---
name: solidjs-2
description: Use this skill whenever the user is working with SolidJS 2.0 (the "next" branch, `@solidjs/*` packages, beta docs) — writing, migrating, reviewing, or debugging Solid code. Also trigger when the user mentions migrating from Solid 1.x, or uses 1.x API names (`createResource`, `Suspense`, `SuspenseList`, `Index`, `batch`, `createComputed`, `classList`, `use:` directives, `mergeProps`, `splitProps`, `unwrap`, `ErrorBoundary`, `Context.Provider`, `onMount`, `produce`, `createMutable`, `startTransition`, `createDynamic`, `createSelector`) — every one has been renamed, split, or removed in 2.0. Also trigger on 2.0 API names (`Loading`, `Errored`, `Reveal`, `Repeat`, `keyed={false}`, `createProjection`, `createOptimistic`, `action`, `isPending`, `refresh`, `snapshot`, `flush`, `onSettled`, `ownedWrite`, `dynamic`, `@solidjs/web`, `jsxImportSource`, `merge`, `omit`, `deep`, `reconcile`). Consult this skill before answering Solid questions so you give current API advice instead of stale 1.x patterns from training.
---

# SolidJS 2.0

Solid 2.0 is currently **beta** (the `next` branch of `solidjs/solid`). It is a **significant breaking change** from 1.x, not an incremental update — most common APIs have been renamed, split, or removed. If you have Solid knowledge from training, assume it's 1.x and verify against this skill before answering.

> **Two priors are dominant bug sources here:** React and Solid 1.x. Distrust pattern-matching from either. When in doubt, derive from the rules in "Mental model" below; the right answer in 2.0 is rarely a one-liner translation of either prior.

The source-of-truth docs are 9 RFCs plus a one-page `CHEATSHEET.md` that ships inside the `solid-js` npm package (users will sometimes find it as `node_modules/solid-js/CHEATSHEET.md` in their project). The full contents are mirrored in `references/` — read them whenever you need detail beyond what's in this file.

## When to read what

Don't dump references into context preemptively. Pull the one that matches the question.

- **Any Solid 2.0 question** — this file first. The "Import map", "Mental model", and "Common pitfalls" sections below cover ~80% of what comes up.
- **One-page authoritative API summary, with the canonical "AI footgun list"** — `references/cheatsheet.md`. If the question is "what's the right shape for X in 2.0", this is usually faster than reading the RFC.
- **Side-by-side 1.x → 2.0 migration** — `references/migration.md` (canonical beta tester guide; the most useful single doc when porting an app).
- **Effects, batching, `flush`, `onSettled`, `lazy` memos, `unobserved`, `createRenderEffect`, `EffectBundle` error handling, stores in the compute phase, strict-read/owned-write rules** — `references/reactivity.md`.
- **Ownership, `createRoot` parent-disposal, `runWithOwner(null)`, context-as-provider, `ContextNotFoundError`, function-form `createSignal` / `createStore`** — `references/signals-context.md`.
- **`For`, `Repeat`, `Show`, `Switch`, `Loading`, `Errored`, `Reveal` (full `order` / nesting matrix and SSR caveats), `dynamic` factory** — `references/control-flow.md`.
- **Stores, draft setters, `createProjection`, `reconcile` (draft-first usage), `snapshot` vs `deep`, `merge` / `omit`, `storePath`** — `references/stores.md`.
- **Async data, `isPending`, `latest`, `refresh`, `isRefreshing`, `resolve`, replacing `createResource`, `Loading on={}` prop** — `references/async.md`.
- **Mutations: `action` (generator), `createOptimistic`, `createOptimisticStore`** — `references/actions.md`.
- **DOM attributes, `class` (object/array), boolean handling, root-owned event delegation, `ref` directive factories** — `references/dom.md`.
- **TypeScript/JSX configuration: `jsxImportSource: "@solidjs/web"`, `Element` from `solid-js`, where `JSX` is imported from** — `references/typescript-jsx.md`.
- **Dev warnings/errors and their diagnostic codes (severity matters — some warn, some throw)** — `references/diagnostics.md`.

## Import map (memorize this)

The single biggest source of "code looks 2.0-ish but doesn't compile" is wrong import paths.

```ts
// 1.x                                       →  2.0
import { ... } from "solid-js/web";          //  "@solidjs/web"
import { ... } from "solid-js/store";        //  "solid-js"            ← store APIs moved into core
import h from "solid-js/h";                  //  "@solidjs/h"
import html from "solid-js/html";            //  "@solidjs/html"
import { createRenderer } from "solid-js/universal"; // "@solidjs/universal"
import type { JSX } from "solid-js";         //  "@solidjs/web"        ← JSX namespace moved to renderer
```

`createStore`, `createProjection`, `reconcile`, `snapshot`, `storePath`, `merge`, `omit`, `deep`, etc. are all exported from `solid-js` directly. Do not import from `solid-js/store` — that subpath is gone.

`tsconfig.json` for web projects must set `"jsxImportSource": "@solidjs/web"` (not `"solid-js"`). `solid-js/jsx-runtime` and `solid-js/jsx-dev-runtime` no longer exist. See `references/typescript-jsx.md`.

## Mental model (the things that are actually different)

### 1. Writes are batched on microtasks — reads don't see your set until after flush

```js
const [count, setCount] = createSignal(0);
setCount(1);
count(); // still 0
flush();
count(); // 1
```

`batch()` is gone because everything is batched. Use `flush()` only when you need to observe a DOM update or signal value synchronously (tests, focus management, imperative interop). Application code rarely needs it; tests that assert on signal values right after a setter do (`setCount(1); flush(); expect(count()).toBe(1)`).

`flush(fn)` also accepts a callback — writes inside drain before the call returns and don't leave a queued microtask behind. Useful at imperative boundaries.

### 2. `createEffect` is split into (compute, apply)

The compute function runs in the tracking phase and returns a value. The apply function runs after flush, receives that value, does the side effect, optionally returns cleanup. This is the single biggest day-to-day change. The old single-callback form is gone — using it is an error.

```js
// 1.x
createEffect(() => {
  const id = setInterval(() => console.log(name()), 1000);
  onCleanup(() => clearInterval(id));
});

// 2.0
createEffect(
  () => name(), // compute: tracks deps
  (value) => {
    // apply: side effect, runs untracked
    const id = setInterval(() => console.log(value), 1000);
    return () => clearInterval(id); // cleanup returned from apply
  },
);
```

Things to know:

- Compute receives `prev` (undefined on first run). For an initial value, use a default parameter: `(prev = 0) => ...`. The 1.x `initialValue` second argument is **gone**.
- `createMemo`'s second argument is now `options`, not an initial value.
- The `on()` helper is gone — the compute phase **is** the explicit dependency list. `{ defer: true }` is an option on `createEffect` itself.
- For error handling, pass `{ effect, error }` as the second argument instead of a bare apply function. The error handler receives `(err, cleanup)`. See `references/reactivity.md`.
- The apply phase runs untracked. **Reading store properties in the apply phase warns** (`STRICT_READ_UNTRACKED`); extract the data in the compute phase or use `deep(store)`.

### 3. Writes inside reactive scopes throw; top-level reactive reads warn

Writing to a signal inside `createEffect`'s compute phase, inside `createMemo`, or in a component body throws `SIGNAL_WRITE_IN_OWNED_SCOPE` in dev. Writes belong in event handlers, `onSettled`, action callbacks, or `untrack` blocks. **Derive values instead of writing them back:**

```js
// ❌ throws in dev
createMemo(() => setDoubled(count() * 2));

// ✅ derive
const doubled = createMemo(() => count() * 2);
```

Reading a signal or prop at the **top level of a component body** (before JSX) warns `STRICT_READ_UNTRACKED` — the read won't track. This includes **destructuring props**:

```jsx
// ❌ warns — destructuring freezes the value
function Bad({ title }) {
  return <h1>{title}</h1>;
}

// ❌ warns — top-level read in component body
function AlsoBad(props) {
  const t = props.title;
  return <h1>{t}</h1>;
}

// ✅ read inside JSX, or in a memo/effect
function Good(props) {
  return <h1>{props.title}</h1>;
}
```

**Never destructure `props`** in 2.0 components. Always pass `props` through and read `props.x` inside JSX or a reactive scope. The same rule applies to control-flow function children (Show/Match/For callbacks) — reactive reads done in the callback body don't track, only reads inside the returned JSX do.

If you genuinely need an internal signal that's written from owned scope (rare — usually element refs, internal flags, or intentionally in-scope writes), opt in narrowly: `createSignal(initial, { ownedWrite: true })`. This is **not** a general escape hatch for app state. Misusing it on app state to silence dev errors will produce feedback loops that 1.x would have caught for you.

### 4. Props are values, not accessors — and don't destructure

This is the single most common AI-generated bug in Solid (1.x and 2.0). Two rules, same underlying model:

```jsx
const [count, setCount] = createSignal(0);

// At the call site: pass the VALUE. Call accessors at the JSX boundary.
<Counter value={count()} />     // ✅
<Counter value={count} />       // ❌ child receives a function, not a number

// In the child: read via props.x. The property access is what tracks.
function Counter(props) {
  return <div>{props.value}</div>;     // ✅ re-reads on each render
}
function Counter({ value }) {          // ❌ destructure unwraps once; reactivity is dead
  return <div>{value}</div>;
}
```

If you genuinely need to forward a getter (rare — render props, lazy slots), pass `getValue={() => count()}` and document it. Default to values.

Helpers: `merge(...)` (replaces `mergeProps`) and `omit(props, ...keys)` (replaces `splitProps`). **`undefined` is a real value in `merge`** — it overrides, not "skip this key".

### 5. Async is a first-class property of computations — no `createResource`

Any computation (`createMemo`, derived store, projection) can return a Promise or AsyncIterable. Consumers read the accessor normally; if pending, the graph suspends up to the nearest `<Loading>` boundary.

```jsx
// 1.x
const [user] = createResource(id, fetchUser);

// 2.0
const user = createMemo(() => fetchUser(id()));

<Loading fallback={<Spinner />}>
  <Profile user={user()} />
</Loading>;
```

`resource.loading` / `.error` / `refetch` / `mutate` map to:

| 1.x resource feature              | 2.0 replacement                                                  |
| --------------------------------- | ---------------------------------------------------------------- |
| `resource.loading` (initial)      | `<Loading>` boundary                                             |
| `resource.loading` (revalidation) | `isPending(() => resource())`                                    |
| `resource.error`                  | `<Errored>` boundary or effect `error` option (no inline branch) |
| `resource.refetch()`              | `refresh(resource)` or `refresh(() => expr)`                     |
| `resource.mutate()`               | `createOptimisticStore` + `action`                               |

Key behaviors:

- **`Loading` covers branch readiness.** Once content has rendered, revalidation keeps it visible (no flash back to spinner). For "refreshing…" indicators, use `isPending(() => expr)`. The expression you pass to `isPending` is **read**, so put it under the same boundary as the data it tracks.
- **`<Loading on={key}>`** — re-shows fallback when `key` changes and async is pending. Useful for route/key transitions where you do want a spinner across the swap.
- **Reading async outside a Loading boundary warns** (`ASYNC_OUTSIDE_LOADING_BOUNDARY`) but is **non-halting** — the runtime defers the root mount until pending async settles, then attaches atomically. Add `<Loading>` only when you want a visible fallback.
- **Async errors flow to `<Errored>`** (or `createEffect`'s `error` option). There is no `resource.error` inline branch in 2.0; that 1.x split bypassed `ErrorBoundary` and SSR couldn't see it.

### 6. Stores: draft-first setters; `reconcile` lives inside the setter

```js
const [store, setStore] = createStore({ user: { name: "A" }, list: [] });

// Draft-first (canonical) — mutate in place
setStore((s) => {
  s.user.name = "B";
  s.list.push("x");
});

// Return a value for shallow replacement (filter/remove most often)
setStore((s) => s.list.filter((x) => x !== "x"));

// Reconcile new data into a sub-tree (preserves identity by key)
setStore((s) => {
  reconcile(serverTodos, "id")(s.todos);
});
```

`produce` is the default — drop the import. `createMutable` / `modifyMutable` are removed; use `createStore` with draft setters (the difference: writes go through `setState`, so they participate in batching, transitions, and optimistic rollback).

For 1.x-style path setters as a compat helper: `setStore(storePath("user", "address", "city", "Paris"))`. Draft-first is the canonical form; `storePath` exists for migration ergonomics.

Function-form `createStore(fn, seed)` creates a **writable derived store** (mirroring `createSignal(fn)` for "writable memo"). `createProjection(fn, seed)` is the **readonly** derived store — returning a value from its derive function reconciles by `options.key` (default `"id"`).

For deep observation of a store in an effect, use `deep(store)` in the compute phase — it subscribes to every nested property and returns a plain (non-proxy) snapshot safe to use in the apply phase. `snapshot(store)` (replaces `unwrap`) is the **non-tracking** plain copy for serialization.

### 7. Effects, lifecycle, and component setup

`onMount` is gone. The replacement is `onSettled`: runs once after the current activity settles. It can return a cleanup function (replacing the 1.x `onMount` + `onCleanup` pair):

```js
onSettled(() => {
  measureLayout();
  const onResize = () => measureLayout();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
```

`onSettled` is **also** valid inside event handlers — it defers work until the triggered transition settles. For component-level setup-and-teardown, prefer `onSettled` with a returned cleanup over calling `onCleanup` directly. `onCleanup` is reserved for reactive cleanup inside computations.

Both `onSettled` and `createTrackedEffect` are **leaf owners**: you cannot create reactive primitives or call `onCleanup` inside them — return a cleanup function instead (`CLEANUP_IN_FORBIDDEN_SCOPE`). They also can't call `flush()`.

`createMemo` accepts a `{ lazy: true }` option that defers initial compute until first read **and** opts the memo into autodisposal when its subscriber count drops to zero — true compute-on-demand. Non-lazy owned memos live for their owner's lifetime and keep their cached value through transitions. `createSignal` and `createMemo` also accept an `unobserved` callback for tearing down external resources (subscriptions, sockets) when no one is listening.

### 8. Ownership and context

`createRoot` is **owned by its parent by default** — disposed when the parent disposes. The 1.x "create a forever-lived root accidentally" failure mode is gone. To detach explicitly: `runWithOwner(null, fn)`. Use this only for true module-scope singletons and external integrations.

**Context value is the provider.** No more `<Theme.Provider>`:

```jsx
const Theme = createContext("light");

<Theme value="dark">
  <Page />
</Theme>;
```

**Default-less `createContext<T>()` is now typed `Context<T>`** — `useContext(ctx)` returns `T` directly and throws `ContextNotFoundError` at runtime if no Provider is mounted. The 1.x boilerplate of writing `useTodos`-style wrappers that re-throw on `undefined` is no longer needed; delete them on migration:

```ts
// 1.x — wrapper exists purely to narrow T | undefined → T
const TodosContext = createContext<TodosCtx>();
const useTodos = () => {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("missing TodosContext.Provider");
  return ctx;
};

// 2.0 — direct call, no wrapper. Type is TodosCtx; throws if no Provider.
const TodosContext = createContext<TodosCtx>();
const [todos, { addTodo }] = useContext(TodosContext);
```

Use the **default form** `createContext<T>(defaultValue)` only for primitive fallbacks (theme, locale, frozen config). Anything carrying reactive state should be default-less so a missing Provider becomes a hard error at the boundary.

**For truly app-wide state, don't use Context** — a module-scope signal or store _is_ a global. Context is for scoping state to a subtree, which is why a Provider is mandatory in the default-less form.

### 9. Control flow: one `For`, plus `Repeat`

`Index` is gone. `For` covers all keying modes via the `keyed` prop, and the **callback shape depends on the keying mode**:

```jsx
// Default — keyed by identity. Item is raw, index is an accessor (rows can move).
<For each={items()}>
  {(item, i) => <Row item={item} index={i()} />}
</For>

// keyed={false} — Index replacement. Item is an accessor, index is a plain number.
<For each={items()} keyed={false}>
  {(item, i) => <Row item={item()} index={i} />}
</For>

// Custom key — both arguments are accessors (item can change while key stays).
<For each={items()} keyed={t => t.id} fallback={<Empty />}>
  {item => <Row todo={item()} />}
</For>
```

Use a **literal** `keyed` value with function children — dynamic boolean `keyed={cond()}` makes the callback shape ambiguous.

`<Repeat count={n} from={start?} fallback={...}>` renders a fixed count of rows with **no diffing**; `i` is a plain number, not an accessor. Primarily intended for store-backed lists (the store handles granular updates) and skeletons:

```jsx
<Repeat count={store.items.length}>{(i) => <Row name={store.items[i].name} />}</Repeat>
```

`<Show>` and `<Match>` function children: **non-keyed** receives an accessor (call it), **keyed** receives the raw narrowed value.

### 10. Mutations: actions + optimistic primitives

`startTransition` and `useTransition` are gone — transitions are built in. For mutations, wrap in `action()`:

```js
const [todos, setOptimisticTodos] = createOptimisticStore(() => api.list(), []);

const addTodo = action(function* (todo) {
  setOptimisticTodos((s) => {
    s.push(todo);
  }); // optimistic write
  yield api.add(todo); // async work in the transition
  refresh(todos); // re-derive
});
```

Action callbacks are generators (`function*`) or async generators (`async function*`). Yielding a Promise awaits it within the transition so optimistic writes stay applied until the server round-trip completes, then revert when the action settles. `createOptimistic` is the signal-shaped analogue for single values.

`refresh()` is the explicit recompute primitive. Two forms: `refresh(x)` requests recomputation for a derived signal/store/projection, and `refresh(() => expr)` re-runs the thunk and returns its value. `refresh` replaces `resource.refetch()`.

### 11. DOM: `class` replaces `classList`; HTML standards by default

```jsx
<div class="card" />
<div class={{ active: isActive(), disabled: isDisabled() }} />
<div class={["card", props.class, { active: isActive() }]} />
```

`classList` is removed; the object/array forms on `class` replace it. **Don't build class strings manually** with template literals or `.join(" ")` — the React/`classnames` reflex. The array+object form is the answer.

Built-in attributes are **lowercase** (`tabindex`, not `tabIndex`). Booleans are presence/absence (`<video muted={false} />` removes the attribute). The `attr:`, `bool:`, `on:`, and `oncapture:` namespaces are gone. Solid-managed events stay camelCase (`onClick`). For native listener options, use a ref callback:

```jsx
const on = (type, handler, options) => (el) => el.addEventListener(type, handler, options);
<button ref={on("click", handleClick, { capture: true })} />;
```

**Delegated events are now owned by render roots** — `render()` / `hydrate()` install delegated listeners on their root container and clean them up on dispose. No more document-global cleanup. This is friendlier to nested roots, Shadow DOM, and web components. If you were calling `clearDelegatedEvents()`, remove it and dispose the render root instead.

### 12. Directives: `ref={factory(options)}`

`use:` is gone. Directives compose through `ref`:

```jsx
<input ref={autofocus} />
<button ref={tooltip({ content: "Save" })} />
<button ref={[autofocus, tooltip({ content: "Save" })]} />
```

Two-phase factory pattern (recommended): setup runs in an owned scope (create primitives, subscriptions), apply runs in the returned callback (DOM writes only, no new primitives). See `references/dom.md`.

### 13. Polymorphic components: `dynamic` factory

`createDynamic(source, props)` is replaced by `dynamic(source)` — a `lazy`-style factory that returns a stable `Component<P>` whose identity is driven by a reactive (and optionally async) source. The `<Dynamic component={...}>` JSX wrapper still exists and is unchanged at the call site; it now delegates to `dynamic` internally.

```jsx
import { dynamic, Dynamic } from "@solidjs/web";

// Factory form (canonical) — captures component identity, composes with lazy/routing
const Active = dynamic(() => (isEditing() ? Editor : Viewer));
return <Active value={value()} />;

// Native tag swap
const Tag = dynamic(() => (multiline() ? "textarea" : "input"));
return <Tag value={value()} />;

// JSX-wrapper form — for inline swaps where you don't need to capture identity
<Dynamic component={isEditing() ? Editor : Viewer} value={value()} />;
```

The factory's `source` may return a Promise, so async dynamic components compose with `<Loading>` through the same `NotReadyError` flow as any other reactive read. Source evaluation is shared across all mounted instances of the returned component — one `dynamic(...)` reused in many places doesn't duplicate work.

### 14. Coordinating sibling `Loading` boundaries: `Reveal`

`Reveal` (rename of `SuspenseList`) controls when its descendant `Loading` fallbacks resolve. The shape changed from earlier 2.0 betas: an `order` prop with three values plus a sequential-only `collapsed` flag. The earlier boolean `together` prop is gone — it's now `order="together"`.

```jsx
// Default — siblings reveal in DOM order as each resolves
<Reveal>
  <Loading fallback={<S/>}><A/></Loading>
  <Loading fallback={<S/>}><B/></Loading>
</Reveal>

// All siblings wait for the slowest, then reveal at once
<Reveal order="together">
  <Loading fallback={<S/>}><Header/></Loading>
  <Loading fallback={<S/>}><Posts/></Loading>
</Reveal>

// Sequential-only: only the frontier shows a fallback; later boundaries render nothing until their turn
<Reveal collapsed>
  <Loading fallback={<S/>}><A/></Loading>
  <Loading fallback={<S/>}><B/></Loading>
</Reveal>
```

`order="natural"` is new in 2.0 and primarily useful for nested groups: the nested `Reveal` participates in its parent's ordering as one composite slot, and once the parent releases that slot each inner child reveals independently on its own data — when an inner group shouldn't coordinate internally but should still be one unit to the outer order.

The full nesting matrix (every combination of outer × inner `order`) and SSR caveats (`order="together"` and `collapsed` need streaming SSR — `renderToStream` or `renderToStringAsync`) are in `references/control-flow.md`.

## Common pitfalls (the high-frequency ones)

1. **Destructuring props** — warns and loses reactivity. Pass `props` through, read `props.x` inside JSX.
2. **Passing accessors instead of values** — `<X value={count} />` sends a function, not a number. Call accessors at the JSX boundary: `<X value={count()} />`.
3. **Writing signals in a component body or effect compute** — throws. Move writes to event handlers, `onSettled`, or actions. If truly an internal signal, `{ ownedWrite: true }` (narrowly).
4. **Single-callback `createEffect`** — gone. Use the two-arg `(compute, apply)` form.
5. **Forgetting accessors are accessors in `For keyed={false}`** — `item` is an accessor, not a value. Call it: `item()`. The keying mode determines the callback shape.
6. **Reading store proxies in the effect apply phase** — runs untracked; warns `STRICT_READ_UNTRACKED`. Extract the specific fields you need in compute, or use `deep(store)` for whole-store observation.
7. **Expecting reads to reflect writes immediately** — they don't until flush. In tests or imperative DOM code, call `flush()`.
8. **Using `initialValue` second argument** on `createEffect` / `createMemo` — gone. Use a default parameter on `prev`: `(prev = 0) => ...`. On `createMemo`, the second arg is `options`.
9. **Rendering async values without a `<Loading>` boundary** — no longer an error. Non-halting `ASYNC_OUTSIDE_LOADING_BOUNDARY` warning in dev; the runtime defers the root mount until pending async settles. Add `<Loading>` only when you want a visible fallback.
10. **Using `resource.loading` for "refreshing" UI** — there's no `resource` to ask. `isPending(() => expr)` is the 2.0 equivalent; `<Loading>` is for initial readiness, `<Loading on={key}>` for key-driven re-show.
11. **Keeping `<Context.Provider>`** — gone. The context itself is the provider: `<Theme value="dark">`.
12. **Writing `useTodos`-style throwing wrappers** — the default-less context throws on its own and is typed `T`. Delete the wrapper.
13. **Using `batch()`** — everything is already batched. Remove it. Use `flush()` only when you need synchronous application.
14. **Using `onCleanup` inside `onSettled` or `createTrackedEffect`** — throws `CLEANUP_IN_FORBIDDEN_SCOPE`. Return a cleanup function instead.
15. **Creating reactive primitives inside `onSettled` or `createTrackedEffect`** — throws. These are leaf owners.
16. **Importing `createStore` from `solid-js/store`** — that subpath is gone. Import from `solid-js`.
17. **Setting `"jsxImportSource": "solid-js"`** — won't resolve in 2.0; the JSX namespace moved. Use `"@solidjs/web"` for web, `"@solidjs/h"` for hyperscript.
18. **Manually building class strings with template literals or `.join(" ")`** — the React/`classnames` reflex. Use `class={["card", { active: isActive() }]}`.
19. **`<Show>` / `<Match>` accessor confusion** — non-keyed function children receive an accessor (call it); keyed children receive the raw value. They look almost identical at the call site, so check `keyed` before assuming.
20. **`Reveal together` prop** — gone in current beta. It's `order="together"` now. Earlier 2.0 beta material around the web still references the old shape.

## When you aren't sure

If you're writing non-trivial 2.0 code and you catch yourself reaching for memory of 1.x behavior — pause and check the matching reference file in `references/`. Those files are the full RFC text, authoritative and up-to-date, and they're what this skill is actually built on. They're the right place to find the exact behavior of a specific API, the motivation behind a design decision, or the complete list of options on a primitive.

`references/cheatsheet.md` is a good "first stop" when the question is "what's the shape of X in 2.0" — it's organized by topic and ends with an explicit "AI footgun list" of corrections-vs-1.x. The cheatsheet ships inside the `solid-js` npm package, so if the user has a 2.0 project on disk they may find it as `node_modules/solid-js/CHEATSHEET.md` and refer to it directly.

If the user is migrating an existing app, `references/migration.md` is the most useful single document to walk through — it's organized as 1.x → 2.0 before/after examples across every change area.

## Writing new projects

For now (2.0 is beta), the public `npm create solid` and `docs.solidjs.com/quick-start` flows still scaffold 1.x projects. 2.0 starter templates are tracked at [`solidjs/templates`](https://github.com/solidjs/templates) — the existing templates there target 1.x. If the user wants to build with 2.0 specifically, they'll be installing pre-release versions of `solid-js` and `@solidjs/web` from the `next` dist-tag, and they'll be operating without most community libraries being ported yet. Flag this tradeoff when relevant — for production work that doesn't specifically need 2.0, **1.x is still the stable choice**.
