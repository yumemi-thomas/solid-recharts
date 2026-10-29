# Solid 2.0 dev diagnostics (code catalog)

Generated from the `diagnostics.json` that ships inside `solid-js@2.0.0-rc.19` (`node_modules/solid-js/diagnostics.json`);
regenerate it when bumping Solid. The prose reference (every code's message, rationale and fix) is the
`reactivity-diagnostics` skill that ships in the same package — read it when a code fires:

- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` — code → repair map
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md` — how to verify code with `captureArtifact` / budgets
- Upstream RFC: <https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/08-dev-diagnostics.md>

Severity: `error` throws in dev; `warn` logs; `info` is advisory (structured channel only — assertion helpers
count it, the console does not print it). Codes whose trigger says "(attribution enabled)" only fire while the
attribution engine runs (`captureArtifact` with attribution on, `attribution.enable()`, or the Vite plugin's
performance tracks); the rest fire from the core / renderer.

## Observing diagnostics programmatically

In dev and observe builds `OBSERVE` (exported by `solid-js` and `@solidjs/signals`; `undefined` in production)
carries the channels. `DEV.diagnostics` from the betas is gone.

```ts
import { OBSERVE } from "solid-js";

// Every finding, as it happens (second argument: the live node, when the emitter located one).
const off = OBSERVE.diagnostics.subscribe((event, subject) => {
  console.log(`[${event.severity}] ${event.code}: ${event.message}`, event.ownerPath);
});

// A scoped capture (what tests use).
const capture = OBSERVE.diagnostics.capture();
// ... run the code under test ...
const events = capture.stop(); // DiagnosticEvent[]
```

Prefer `@solidjs/diagnostics` over the raw channel: `captureArtifact(scenario)` folds diagnostics, re-run
attribution and records into one artifact, with `expectNoDiagnostics` / `expectRerunBudget` / `expectNoWaste` /
`assertBudgetFile` and vitest matchers (`toHaveNoDiagnostics`, …) on top. In this repo see
`.claude/skills/testing/SKILL.md`.

Each `DiagnosticEvent` carries `code`, `kind`, `severity`, `message`, `ownerPath` (root-first component/computation
labels), `nodeName`, `loc` (`file:line:col`), and a `data` object specific to the code.

## Code catalog

### strict-read

#### `STRICT_READ_UNTRACKED`

- **Severity:** warn · **Kind:** strict-read
- **Fires when:** Untracked reactive read in component/effect body.
- **Repair:** A reactive value was read outside any tracking scope (e.g. destructured props or a signal called in the component body).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/strict-read-untracked>

### async

#### `ASYNC_OUTSIDE_LOADING_BOUNDARY`

- **Severity:** warn · **Kind:** async
- **Fires when:** Async computation outside Loading boundary (non-halting; root mount is deferred).
- **Repair:** On the client, an async value was read outside a Loading boundary during mounting.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/async-outside-loading-boundary>

#### `LOADING_ON_OUTSIDE_HOLD`

- **Severity:** warn · **Kind:** async
- **Fires when:** `<Loading on>` changed but its data is also read outside the boundary and holds the frame: the fallback can never be seen.
- **Repair:** `on` re-armed a Loading boundary, but a source it is waiting on is also read outside the boundary and holds the frame.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/loading-on-outside-hold>

#### `PENDING_ASYNC_FORBIDDEN_SCOPE`

- **Severity:** warn · **Kind:** async
- **Fires when:** Pending async read in trackedEffect/onSettled.
- **Repair:** A pending async value was read inside `createTrackedEffect` or `onSettled`, which cannot suspend — it throws.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/pending-async-forbidden-scope>

#### `PENDING_ASYNC_UNTRACKED_READ`

- **Severity:** error · **Kind:** async
- **Fires when:** Reading pending async outside tracking scope.
- **Repair:** Same shape as above but the value was a pending async computation, so there is nothing to read yet at all.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/pending-async-untracked-read>

#### `UNTRACKED_READ_AFTER_AWAIT`

- **Severity:** warn · **Kind:** async
- **Fires when:** Async computation first read a signal/memo/store key after an `await`; never a dependency (dev; V8 engines only).
- **Repair:** An async computation read a signal, memo, or store property for the first time after an `await`.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/untracked-read-after-await>

### write

#### `ACTION_CALLED_IN_OWNED_SCOPE`

- **Severity:** error · **Kind:** write
- **Fires when:** `action()` invoked from a component body or computation.
- **Repair:** An action was invoked during a component body or computation.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/action-called-in-owned-scope>

#### `ASYNC_STORE_SETTER`

- **Severity:** error · **Kind:** write
- **Fires when:** Store setter callback returned a Promise (setters are synchronous transactions).
- **Repair:** A store setter callback returned a Promise — `setStore(async d => …)`, or a sync arrow whose helper is async.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/async-store-setter>

#### `INVALID_AFFECTS_TARGET`

- **Severity:** error · **Kind:** write
- **Fires when:** `affects()` given a key path, or a key on an accessor.
- **Repair:** `affects()` expects a Solid source accessor or store node, with at most one optional key (keys only valid on store targets).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/invalid-affects-target>

#### `INVALID_REFRESH_TARGET`

- **Severity:** error · **Kind:** write
- **Fires when:** `refresh()` target is not a source accessor or refreshable store.
- **Repair:** `refresh()` expects a Solid source accessor or refreshable store — not a wrapper function or a derived property read.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/invalid-refresh-target>

#### `REACTIVE_WRITE_IN_OWNED_SCOPE`

- **Severity:** error · **Kind:** write
- **Fires when:** Reactive write/invalidation inside component/computation.
- **Repair:** A signal/store write (or `refresh()`) executed during an owned scope — a component body or a computation.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/reactive-write-in-owned-scope>

#### `SERVER_WRITE`

- **Severity:** warn · **Kind:** write
- **Fires when:** Signal/store/optimistic setter ran during a server render; inert, will throw (dev; once per category).
- **Repair:** A signal, store or optimistic setter ran during a server render.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/server-write>

#### `STORE_WRITE_OUTSIDE_SETTER`

- **Severity:** warn · **Kind:** write
- **Fires when:** Store proxy written, deleted from, or defined on outside its setter; the write is ignored (once per store object and key).
- **Repair:** A store proxy was written, deleted from, or had a property defined on it outside its setter — `store.n = 5`, `store.items.push(x)`, `delete store.user` — and the write was ignored.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/store-write-outside-setter>

### lifecycle

#### `CLEANUP_IN_FORBIDDEN_SCOPE`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** `onCleanup` inside trackedEffect/onSettled.
- **Repair:** `onCleanup` inside `createTrackedEffect` or `onSettled` is not supported — return a cleanup function from the callback instead.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/cleanup-in-forbidden-scope>

#### `FLUSH_IN_EFFECT_CALLBACK`

- **Severity:** warn · **Kind:** lifecycle
- **Fires when:** `flush()` from an effect callback (no-op; the drain is already running).
- **Repair:** `flush()` was called inside an effect callback, where it is a no-op (the flush running effects is already in progress).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/flush-in-effect-callback>

#### `MISSING_EFFECT_FN`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** `createEffect` called without the effect function.
- **Repair:** `createEffect(compute)` with a single argument is not supported.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/missing-effect-fn>

#### `NO_OWNER_BOUNDARY`

- **Severity:** warn · **Kind:** lifecycle
- **Fires when:** Boundary created without owner.
- **Repair:** A boundary was created outside any reactive context.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/no-owner-boundary>

#### `NO_OWNER_CLEANUP`

- **Severity:** warn · **Kind:** lifecycle
- **Fires when:** `onCleanup` called without owner.
- **Repair:** `onCleanup` was called outside a reactive context; the callback will never run.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/no-owner-cleanup>

#### `NO_OWNER_EFFECT`

- **Severity:** warn · **Kind:** lifecycle
- **Fires when:** Effect created without reactive owner.
- **Repair:** An effect was created outside any reactive context (no root, no component).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/no-owner-effect>

#### `ON_FLUSH_IN_OWNED_SCOPE`

- **Severity:** warn · **Kind:** lifecycle
- **Fires when:** `onFlush` called in a component body or computation (meant for event handlers and effect callbacks).
- **Repair:** `onFlush` was called in a component body or a computation; it is meant for event handlers and effect callbacks.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/on-flush-in-owned-scope>

#### `PRIMITIVE_IN_EFFECT_CALLBACK`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** Memo, effect, or root created inside an effect callback or its cleanup, where there is no ambient owner (throws).
- **Repair:** A memo, effect, or root was created without an owner inside an effect callback or its cleanup.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/primitive-in-effect-callback>

#### `PRIMITIVE_IN_FORBIDDEN_SCOPE`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** Reactive primitive created inside trackedEffect/onSettled.
- **Repair:** Reactive primitives cannot be created inside `createTrackedEffect` or owner-backed `onSettled`.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/primitive-in-forbidden-scope>

#### `SETTLED_CLEANUP_UNOWNED`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** `onSettled` returned a cleanup in an unowned (out-of-band) scope.
- **Repair:** `onSettled` returned a cleanup while running in an unowned scope, so the cleanup cannot be honored.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/settled-cleanup-unowned>

#### `SETTLE_WALK_UNINITIALIZED_SOURCE`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** Internal: settle walk reached a source that never produced a value (reported).
- **Repair:** The runtime tried to settle a source before it produced a value or an error.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/settle-walk-uninitialized-source>

#### `SYNC_NODE_RECEIVED_ASYNC`

- **Severity:** error · **Kind:** lifecycle
- **Fires when:** `sync: true` computation returned a Promise / AsyncIterable.
- **Repair:** A computed/effect created with `sync: true` returned a Promise or AsyncIterable; the value would be stored as-is, never awaited, in production.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/sync-node-received-async>

### owner

#### `RUN_WITH_DISPOSED_OWNER`

- **Severity:** warn · **Kind:** owner
- **Fires when:** `runWithOwner` with disposed owner.
- **Repair:** `runWithOwner` received an owner that was already disposed; anything created inside leaks.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/run-with-disposed-owner>

### error

#### `INVARIANT_VIOLATION`

- **Severity:** error · **Kind:** error
- **Fires when:** Internal consistency check failed (throws under `__TEST__`, reported in dev).
- **Repair:** The reactive system contradicted itself — an internal bug, not user error.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/invariant-violation>

#### `REACTIVITY_HALTED`

- **Severity:** error · **Kind:** error
- **Fires when:** Uncaught error escaped every boundary; scheduling stopped (reported, cause to `reportError`).
- **Repair:** An earlier uncaught error halted the reactive system; subsequent updates are ignored.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/reactivity-halted>

### graph

#### `HUGE_FAN_IN`

- **Severity:** warn · **Kind:** graph
- **Fires when:** One recompute tracked 2000 sources (always on).
- **Repair:** The always-on backstop: one computation tracked 2000 or more sources in a single pass, so it re-runs when any of them change.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/huge-fan-in>

#### `HUGE_FAN_OUT`

- **Severity:** warn · **Kind:** graph
- **Fires when:** One change reached 2000 live subscribers (always on), or 250 — `fanOut` — on a stamped root write (attribution enabled).
- **Repair:** One value has very many subscribers, so a single change re-runs all of them (`data.count`).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/huge-fan-out>

### perf

#### `ASYNC_WATERFALL`

- **Severity:** info/warn · **Kind:** perf
- **Fires when:** 2+/3+ sequential async flights, origin-proven (attribution enabled).
- **Repair:** Async flights ran in sequence when they might have run in parallel: each named flight provably could not start until the previous one resolved, and each took real time (the per-link durations are in the message/data).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/async-waterfall>

#### `EFFECT_RELAY_TEAR`

- **Severity:** info/warn · **Kind:** perf
- **Fires when:** Reader ran twice for one root change because an effect relayed it; `warn` when derivable or repeated (attribution enabled).
- **Repair:** Derived state kept in sync by an effect: `createEffect(() => f(a()), v => setS(v))`.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/effect-relay-tear>

#### `EFFECT_WRITES_OWN_SOURCE`

- **Severity:** info/warn · **Kind:** perf
- **Fires when:** Effect's write provably feeds back into its own inputs; `info` for multi-effect rings (attribution enabled).
- **Repair:** An effect re-ran because of a write it made itself: its callback wrote a value that its own inputs depend on (directly, or through the memos the message names), so the flush settled in two passes and the screen rendered the pre-write value in between.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/effect-writes-own-source>

#### `GRAPH_GROWTH`

- **Severity:** warn · **Kind:** perf
- **Fires when:** The live graph and what outlived each navigation climbed at a route's settle on 3 visits to 1.25× — something each visit leaves behind (attribution enabled).
- **Repair:** The live graph, counted when each navigation settles, got bigger on every one of the last `data.history.length` visits to `data.route`, and so did the part of it that outlived each of those navigations (`data.survived`, beside `data.history`: what was alive as this or an earlier navigation began and still is) — something each visit creates is never disposed.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/graph-growth>

#### `HOT_SCOPE_FANOUT`

- **Severity:** warn · **Kind:** perf
- **Fires when:** 5+/50+/500+ scopes hot from one root cause (attribution enabled).
- **Repair:** Many scopes went hot from ONE root cause (named in the message) — the aggregate form of HOT_SCOPE_RERUNS, emitted so a single culprit doesn't produce one warning per victim.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/hot-scope-fanout>

#### `HOT_SCOPE_RERUNS`

- **Severity:** warn · **Kind:** perf
- **Fires when:** 120+ re-runs of one scope in 1s (attribution enabled).
- **Repair:** A scope re-ran far more often than any UI cadence justifies — a hot signal (often per-frame or per-event) is leaking into it.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/hot-scope-reruns>

#### `HOT_SCOPE_TIME`

- **Severity:** warn · **Kind:** perf
- **Fires when:** 8ms+ self-time in one scope in 1s (attribution enabled).
- **Repair:** A scope's summed compute time blew its per-window budget — a few-but-expensive scope that run counts miss.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/hot-scope-time>

#### `IMMUTABLE_UPDATE_IN_STORE`

- **Severity:** warn · **Kind:** perf
- **Fires when:** Store container replaced by a mostly-identical copy (attribution enabled).
- **Repair:** A store setter replaced a container with a fresh object/array whose leaves are mostly the same values: `draft.user = { ...draft.user, name }`, `draft.items = [...draft.items, x]`, `draft.items = draft.items.filter(…)`.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/immutable-update-in-store>

#### `UNSTABLE_LIST_IDENTITY`

- **Severity:** warn · **Kind:** perf
- **Fires when:** `mapArray`/`For` recreated rows for equivalent items (attribution enabled).
- **Repair:** A `mapArray`/`<For>` update disposed and recreated most rows while the entering items were field-for-field equivalent to the ones they replaced: a re-fetch (or a spread-copy, see above) handed back fresh objects for the same records, and identity keying treated each as a new row — DOM, state, focus, and scroll position thrown away and rebuilt.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/unstable-list-identity>

#### `UNSTABLE_MEMO_OUTPUT`

- **Severity:** warn · **Kind:** perf
- **Fires when:** Memo returned a new-but-equivalent container 4+ runs running (attribution enabled).
- **Repair:** A memo keeps producing referentially-new but shallowly-equivalent objects/arrays, so its equality gate never closes and every subscriber re-runs on every upstream change.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/unstable-memo-output>

#### `WASTED_RECOMPUTE`

- **Severity:** warn · **Kind:** perf
- **Fires when:** 80%+ of a scope's 5+ runs in a second produced an unchanged value for 2ms+ of compute — inputs change, result does not (attribution enabled).
- **Repair:** The mirror of `UNSTABLE_MEMO_OUTPUT`: this scope's equality gate closes almost every time.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/wasted-recompute>

#### `WIDE_SCOPE_DEPS`

- **Severity:** warn · **Kind:** perf
- **Fires when:** Scope subscribed to 200+ sources (attribution cost checks on).
- **Repair:** Attribution engine cost checks only: a scope is subscribed to 200 or more sources (it re-warns on 50% further growth).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/wide-scope-deps>

### responsiveness

#### `ABANDONED_FLIGHTS`

- **Severity:** warn · **Kind:** responsiveness
- **Fires when:** One async source abandoned 3+ flights in 1s, each superseded before landing — the request-per-keystroke signature (attribution enabled).
- **Repair:** One async source started flight after flight and threw most of the answers away: `data.abandoned` flights in `data.windowMs` were each superseded by the next before landing.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/abandoned-flights>

#### `FALLBACK_FLASH`

- **Severity:** info · **Kind:** responsiveness
- **Fires when:** A `Loading` fallback showed for under 150ms — feedback for a wait too short to need it (attribution enabled).
- **Repair:** A `Loading` fallback appeared and vanished inside 150ms (`data.shownMs`): the data was nearly there, and the spinner read as a flicker.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/fallback-flash>

#### `LONG_HOLD`

- **Severity:** info/warn · **Kind:** responsiveness
- **Fires when:** Acknowledged hold whose tail (last input → commit) ran 500ms+/1000ms+ (attribution enabled).
- **Repair:** The hold WAS acknowledged — an `isPending()` spinner, a `latest()` header, an optimistic value — and still ran on: the time from the user's last input to the commit (`data.tailMs`; `holdMs` is the whole wait when input kept arriving) reached `longHolds.infoMs` (default 500ms), `warn` from `longHolds.warnMs` (default 1000ms, where the user loses the thread).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/long-hold>

#### `OPTIMISTIC_REVERTED`

- **Severity:** info · **Kind:** responsiveness
- **Fires when:** An optimistic value the screen showed was replaced by a different one — reverted at settle, or superseded by the truth (attribution enabled).
- **Repair:** An optimistic value the screen showed was replaced by a different one: the person saw the guess, then the correction.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/optimistic-reverted>

#### `SILENT_HOLD`

- **Severity:** info/warn · **Kind:** responsiveness
- **Fires when:** Write held 100ms+/200ms+ by pending async with no on-screen acknowledgement (attribution enabled).
- **Repair:** A write landed on async work, so the runtime held it (and everything derived from it) until the data came back — that hold is correct; it is what keeps the screen from tearing.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/silent-hold>

#### `STACKED_HOLDS`

- **Severity:** warn · **Kind:** responsiveness
- **Fires when:** 3+ interactions were waiting in one hold when it committed — repeats piled behind the same source (attribution enabled).
- **Repair:** `data.interactions` interactions were waiting in the same hold when it committed: the person clicked or typed again while the first answer was in the air, and the runtime folded every repeat into one wait on the same source (`data.blockers`).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/stacked-holds>

#### `UNTRACKED_ASYNC_HANDLER`

- **Severity:** info/warn · **Kind:** responsiveness
- **Fires when:** Handler awaited 100ms+/200ms+ past its frame with no write before the `await` and no `action()`: a dead click no hold could judge (attribution enabled).
- **Repair:** The dead click that is not a hold.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/untracked-async-handler>

### ssr

#### `ASYNC_MEMO_ELEMENT`

- **Severity:** error · **Kind:** ssr
- **Fires when:** An async memo landed on rendered output (JSX, a boundary), which cannot serialize for hydration; the memo rejects (observe + dev; rejects in every tier).
- **Repair:** An async memo (or async iterable source) resolved, on the server, to rendered output — JSX, a component's result, a `<Loading>`/`<Errored>` boundary.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/async-memo-element>

#### `DYNAMIC_ASYNC_COMPONENT`

- **Severity:** error · **Kind:** ssr
- **Fires when:** An async `dynamic()` source landed on a client component function, which cannot serialize for adoption; the memo rejects (observe + dev; rejects in every tier).
- **Repair:** An async `dynamic()` source resolved to a client component function.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/dynamic-async-component>

#### `FRAME_MARKER_CORRUPTED`

- **Severity:** error · **Kind:** ssr
- **Fires when:** Frame slot range missing its end marker on the client — nesting or an HTML rewriter (observe + dev).
- **Repair:** (Client.) A frame's slot start marker has no end marker among its siblings: invalid HTML nesting split the range when the browser parsed it (a block element inside `<p>`, a `<tr>` outside a table), or a CDN/minifier stripped the comment.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/frame-marker-corrupted>

#### `LAZY_ASSET_UNMAPPED`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** `lazy()` component's client assets could not be resolved for the page (dev).
- **Repair:** A `lazy()` component's client chunk could not be resolved for the page (`data.reason`: the resolver threw, or the module has no `$$moduleUrl`), so it is not preloaded and loads late during hydration.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/lazy-asset-unmapped>

#### `REVEAL_IN_RENDER_TO_STRING`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** Nested `<Reveal>` with collapsed/together under `renderToString` (dev).
- **Repair:** Nested `<Reveal>` with `collapsed`/`together` needs a stream to coordinate on; `renderToString` has none.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/reveal-in-render-to-string>

#### `SERVER_ERROR_SANITIZED`

- **Severity:** error/info · **Kind:** ssr
- **Fires when:** Error replaced with the generic Error on the wire — `data.source` `"server-function"` (`error`) or `"ssr"` (`info`); `data.error` is the original (observe + dev).
- **Repair:** The production wire replaced an error with the generic `Error`; `data.error` is the original, `data.wire` what the client got, and `data.source` says which road:
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/server-error-sanitized>

#### `SSR_BOUNDARY_WATERFALL`

- **Severity:** info/warn · **Kind:** ssr
- **Fires when:** A `<Loading>` boundary needed 3+/4+ render passes — 2+/3+ sequential async waits (dev).
- **Repair:** A `<Loading>` boundary rendered in `data.passes` passes — discovery, then one per wait — and each pass past the first is a read that could only start once the previous pass's async answered: `passes - 1` sequential waits, `data.sequentialMs` end to end.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-boundary-waterfall>

#### `SSR_CLIENT_CONTENT_MASKED`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** Client-only content in a `<Loading>` surfaced only after a server wait; the server's work was discarded (dev).
- **Repair:** A `<Loading>` boundary's content turned out to be client-only (a `ssrSource: "client"` read) but only after `data.passes - 1` real server waits: an async read on an earlier pass masked it.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-client-content-masked>

#### `SSR_LIVE_HOLE_LATCHED`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** A live hole that shipped its markers was closed by the impurity gate on re-run and stopped updating (dev).
- **Repair:** A live markup hole (or attribute) in a server component shipped its markers and then stopped updating: re-running it created a reactive scope still waiting on async work (`data.cause: "owners"`), so the runtime closed it and the client keeps the markup it last received.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-live-hole-latched>

#### `SSR_RENDER_ERROR_CONTAINED`

- **Severity:** error · **Kind:** ssr
- **Fires when:** Server render error routed by a boundary: `data.handling` fallback / client / failed (observe + dev).
- **Repair:** A component threw during a server render and a boundary routed the error; `data.handling` says how.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-render-error-contained>

#### `SSR_STREAM_ABANDONED`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** Response stream cancelled or sink failed with fragments pending (observe + dev).
- **Repair:** The client went away (`data.reason: "consumer"`), the sink failed (`"sink"`), or the request's `signal` aborted (`"signal"` — `renderToStream`'s `signal` option, how a frame-stream response learns its reader is gone) while `data.pendingFragments` were still rendering; the render was torn down.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-stream-abandoned>

#### `SSR_SUBTREE_ABANDONED`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** A failed fragment's pending descendants were discarded (observe + dev).
- **Repair:** A fragment failed with descendants still pending, and their work (fetches, serialized values — the counts are in `data`) was thrown away; the client rebuilds the subtree.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-subtree-abandoned>

#### `SSR_UNDECLARED_LIVE_SOURCE`

- **Severity:** warn · **Kind:** ssr
- **Fires when:** A document render is still pumping an async iterable in server-component scope 5s in — declare the function `live(...)` or bound the source (dev).
- **Repair:** A server component rendered into a document read an async iterable that was still producing `data.afterMs` (5s) later: an undeclared unbounded source pumps into the document and holds it open for as long as it produces.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/ssr-undeclared-live-source>

### head

#### `HEAD_TAG_INVALID`

- **Severity:** warn · **Kind:** head
- **Fires when:** `useHead` registration the render could not honor; `data.reason` names the rule (dev).
- **Repair:** A `useHead` registration the render could not honor; `data.reason` names the rule.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/head-tag-invalid>

#### `LATE_HEADER_WRITE`

- **Severity:** error · **Kind:** head
- **Fires when:** Response header written after the head was sent; dropped (observe + dev; dev throws).
- **Repair:** A response header was written after the head was sent; the write was dropped (dev throws instead).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/late-header-write>

#### `PRELOAD_DESCRIPTOR_INVALID`

- **Severity:** warn · **Kind:** head
- **Fires when:** `registerAsset("preload")` descriptor broke a field rule; link dropped or field ignored (dev).
- **Repair:** A `registerAsset("preload")` descriptor broke a field rule (`data.field` names it — a missing `as`, a non-string `href`, a malformed `imagesrcset`) and the link was dropped or the field ignored.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/preload-descriptor-invalid>

### render

#### `LOWERCASE_EVENT_ATTRIBUTE`

- **Severity:** warn · **Kind:** render
- **Fires when:** A function was set on a lowercase `on*` (or `on:`) attribute, which is not an event handler in 2.0; use `onXxx` (dev; client).
- **Repair:** A function was set on an attribute whose name starts with `on` but is not an event handler (`data.name`): a lowercase `onclick`, or a leftover 1.x `on:click` passed through a spread (on a native element it is a compile error).
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/lowercase-event-attribute>

#### `UNCOMMITTED_INPUT_OVERWRITTEN`

- **Severity:** warn · **Kind:** render
- **Fires when:** A stateful property binding (`value`/`checked`/…) re-wrote an unchanged value over an edit the user never committed to the signal (dev; client).
- **Repair:** A stateful property binding (`value`/`checked` on an input, `value` on a textarea, `selected` on an option, `muted` on media) re-wrote the value it wrote last time over an edit the user made and never committed to the bound signal — the typed text (or toggled box) is lost.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/uncommitted-input-overwritten>

#### `UNRECOGNIZED_INSERT_VALUE`

- **Severity:** warn · **Kind:** render
- **Fires when:** Value at an insert position the renderer cannot render; skipped (dev; server and client).
- **Repair:** A value the renderer cannot render (a plain object, a symbol — `data.type`) sat at an insert position and was skipped, on either platform.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/unrecognized-insert-value>

#### `UNSCOPED_HOLE_ALLOCATED_IDS`

- **Severity:** warn · **Kind:** render
- **Fires when:** Unscoped hole was handed a function whose content took ids at a position the other side does not share; keys permute (dev).
- **Repair:** A JSX hole was handed a **function** (`data.name`) instead of a value — `const renderHead = () => props.header; <div>{renderHead}</div>` — and calling it built hydratable content.
- **Guide:** <https://v2.solidjs.com/reference/solid-js/diagnostics/unscoped-hole-allocated-ids>
