# Recharts v3.9.0 — port delta

> ## STATUS UPDATE (2026-07-11): v3.9.0 COMPLETE, target bumped to v3.9.2
>
> The "destructive engine swap" listed as remaining below is **DONE**: the old engine
> (`AnimationManager`/`configUpdate`/`useAnimationManager`/`createDefaultAnimationManager`)
> is deleted, all 8 graphical items run on `AnimatedItems`/`AnimationController`,
> `JavascriptAnimate`/`CSSTransitionAnimate` internals are on the new handles,
> `animationInterpolateFn`/`animationMatchBy` + `ShapeAnimationProps` are plumbed, and
> `LineDrawShape`/`AreaRevealShape`/`useAnimatedLineLength` are live defaults.
>
> The vendored reference is now pinned at **v3.9.2** (`b3451050c0`). The v3.9.0→v3.9.2
> behavioral delta being ported:
>
> 1. Legend icon aria-label omits null value (#7501) — DONE
> 2. getNiceTickValues trailing-duplicate-tick dedup, allowDecimals=false (#7482) — DONE
> 3. Sankey exponential depth-traversal guard (#7479) — DONE
> 4. Sankey skipped-depth link/node collision resolution (#7471) — DONE
> 5. Per-graphical-item `formatter` prop → tooltip entry settings (#7287) — DONE
> 6. YAxis explicit-ticks domain fallback on empty data (#7362) — DONE (the 3 `it.fails`
>    desired-behavior cases in YAxis.7362.derivedDomain now pass for real; full 13-case suite)
> 7. Barrel gaps vs 3.9.0 — DONE: 12 type exports added (tick-content prop aliases,
>    TextProps, DefaultLegend/TooltipContentProps, LabelListProps(+WithPosition),
>    SankeyNodeOptions, TooltipValueType, PieShape, TreemapContentType); 3 animation
>    specs ported (useAnimationStartSnapshot — with a SRC fix arming the initial cycle
>    for upstream parity; AnimationController.typed; PieWithLegend.animation).
>    Deliberately NOT exported: `Customized`/`CustomizedProps` (skip-stub — React
>    cloneElement shim) and `InternalRadarProps` (props-first handler type; the port
>    uses DOM-event handlers).
>
> **v3.9.2 PARITY: COMPLETE.** Suite 5300 passed / 0 failed (326 files), vp check clean.
>
> N/A: Scatter hover O(1) perf (#7133 — Solid is already fine-grained),
> `graphicalItemIdentity` (#7518 — dead preparatory code, unexported upstream),
> d3-shape bump (www-only).

> ## STATUS (corrected after implementation)
>
> **Important base-version correction:** the port's base is recharts `7a23854d84`
> (= v3.8.1 **+138 commits of main**), not the v3.8.1 tag. The sections below were
> written against `v3.8.1..v3.9.0` and therefore OVER-COUNT. The true delta is
> `7a23854d84..v3.9.0`, and **every discrete fix/feature in §3 and §4 was already
> in-base and already implemented** (Treemap nodeInset/nodeGap, ResponsiveContainer
> passthrough, Sankey/Funnel NaN guards, falsy tooltip name, Bar originalDataIndex +
> Math.round, all-zero stacked bars, PieChart legend dataKey, Legend resize, axis
> padding under clip). The only genuine delta is the **animation engine** (§1).
>
> **Done (suite 5296 passed, lint clean):**
>
> - beta.14→15 Portal patch removed.
> - Animation FOUNDATION ported + verified (62 new tests): `easing.ts` v3.9 API
>   (`createEasingFunction`, baked `createSpringEasing`, `ProgressEasingFn`) **alongside**
>   the retained legacy stepper so the old engine keeps running; `matchBy`,
>   `AnimationHandle`, `AnimationController(+Impl)`, `useAnimationController`.
> - Public API: matchBy exports, `JavascriptAnimation`/`CSSTransitionAnimation`,
>   controller/timeout types, `AnimationControllerProvider`, `ShapeAnimationProps`,
>   `interpolate`, layout hooks (already present). Ported the 3 standalone foundation specs.
>
> **Remaining (the destructive engine swap):** `useAnimationStartSnapshot` + `AnimatedItems`
> (Solid); swap `JavascriptAnimate`/`CSSTransitionAnimate` internals onto the new engine and
> delete `AnimationManager`/`configUpdate`/`createDefaultAnimationManager`/`useAnimationManager`;
> migrate ~20 animation specs from `AnimationManagerContext`+`MockProgressAnimationManager`
> to `AnimationControllerProvider`+mock controller; per-consumer `AnimatedItems` adoption +
> `animationInterpolateFn`/`animationMatchBy`; new shapes `LineDrawShape`/`useAnimatedLineLength`/`AreaRevealShape`.

Reference (`vendor/recharts-reference`) bumped **v3.8.1 → v3.9.0** (HEAD `8c1cce7259`).
61 commits between; ~45 are dependabot/storybook/chore bumps with no port impact. What
follows is everything in `src/` + `test/` that changes library behavior we mirror.

Headline: **v3.9.0 is an animation-system overhaul.** "All animations are now fully
customizable." The rest is a handful of small, independent features and bug fixes.

---

## 1. Animation system rewrite — the big one (HIGH effort)

3.9.0 **replaced** the animation engine. Crucially, **our port is built on the OLD
(pre-3.9.0) modules**, several of which upstream just deleted:

| Our port has (old, pre-3.9.0)                     | 3.9.0 status |
| ------------------------------------------------- | ------------ |
| `src/animation/AnimationManager.ts`               | **deleted**  |
| `src/animation/configUpdate.ts`                   | **deleted**  |
| `src/animation/useAnimationManager.tsx`           | **deleted**  |
| `src/animation/createDefaultAnimationManager.tsx` | **deleted**  |
| `src/animation/util.ts`                           | **deleted**  |

New modules added upstream (need Solid equivalents):

- `animation/AnimationHandle.ts` — exports `JavascriptAnimation`, `CSSTransitionAnimation`, type `AnimationHandle`
- `animation/AnimationController.ts` + `AnimationControllerImpl.ts` — `AnimationController`, `OnAnimationStateUpdate`
- `animation/useAnimationController.tsx` — `AnimationControllerProvider` (injectable controller, used by tests)
- `animation/AnimatedItems.tsx` — `AnimationInterpolateFn`; per-item interpolation driver
- `animation/matchBy.ts` — `matchByIndex`, `matchByDataKey`, `matchAppend`; types `AnimationItem`, `AnimationMatchBy`, `AnimationMatchByProp`
- `animation/useAnimationStartSnapshot.ts` — captures the from-state at animation start
- `animation/easing.ts` — reworked; now exports `EasingInput` (supersedes `AnimationTiming`, kept as deprecated alias)
- `animation/timeoutController.ts` — now exports `TimeoutController`, `CancelableTimeout`

Every animated graphical item was rewritten on top of this:
`Line.tsx` (510 lines churned), `Scatter.tsx`, `Pie.tsx`, `Radar.tsx`, `RadialBar.tsx`,
plus `util/DataUtils.ts`, `util/ScatterUtils.tsx`, `util/RadialBarUtils.tsx`,
`util/FunnelUtils.tsx`, `util/BarUtils.tsx`, `util/ActiveShapeUtils.tsx`.

**New animation props (additive — existing `animationBegin`/`animationDuration`/
`animationEasing`/`isAnimationActive` are unchanged):**

- `animationInterpolateFn` — custom interpolation per data point
- `animationMatchBy` — how points are matched across data updates (index / dataKey / append) to drive enter/exit/morph
- `ShapeAnimationProps` forwarded to custom shapes: `animationElapsedTime`, `isAnimating`, `isEntrance`

**New components / shapes:**

- `LineDrawShape` (`cartesian/LineDrawShape.tsx`) + `cartesian/useAnimatedLineLength.ts` — the "draw the line on" reveal
- `AreaRevealShape` (`cartesian/AreaRevealShape.tsx`) — area reveal animation

**New tests defining the target behavior** (large): `test/animation/RechartsAnimation.spec.ts`,
`AnimationControllerImpl.spec.ts`, `matchBy.spec.ts`, `useAnimationStartSnapshot.spec.ts`,
`useAnimatedLineLength.spec.ts`, plus heavily expanded `Line/Area/Scatter/Pie/Radar/RadialBar.animation.spec`.
Upstream deleted `AnimationManager.spec.ts` and `configUpdate.spec.ts` (the old engine's tests).

> Port implication: this is the same `prevPoints`/data-change tween machinery we already
> hand-ported once for Solid, but the upstream architecture underneath it changed shape.
> We can either keep our existing Solid animation layer and only adopt the new _props_
> (`animationInterpolateFn`, `animationMatchBy`) + new shapes, or re-port onto the new
> controller/handle design for closer parity. The former is far cheaper.

---

## 2. New public API surface (LOW effort — exports + types)

`src/index.ts` additions to mirror in our barrel:

- `interpolate` (from `util/DataUtils`) — now public & documented
- Animation exports listed in §1 (`matchByIndex`/`matchByDataKey`/`matchAppend`,
  `JavascriptAnimation`, `CSSTransitionAnimation`, `AnimationControllerProvider`, and the types)
- Layout: `useChartLayout`, `useCartesianChartLayout`, `usePolarChartLayout` hooks; types
  `CartesianLayout`, `PolarLayout`, `LayoutType`
- `AreaRevealShape`/`AreaRevealShapeProps`, `LineDrawShape`/`LineDrawShapeProps`
- `LinePointItem` (from Line), `AreaPointItem` (from areaSelectors)

`ActiveShape` type widened: function form now receives `(props, index?)` and returns
`ReactNode`; element form is `Partial<PropsType> & SVGProps`. Worth aligning our
`ActiveShape` typing (behavioral impact is minor; mostly typing).

---

## 3. Independent features (MEDIUM — each standalone)

- **Treemap `nodeInset` + `nodeGap`** (`src/chart/Treemap.tsx`) — padding/gap between
  nodes via `insetRect`/`applyGapToChildren`. New layout props. _(Treemap animation was
  already our one deferred item; this is layout, separate.)_
- **`ResponsiveContainer` HTML attribute passthrough** (#7168) — forward arbitrary HTML
  attrs to the container div.
- **PieChart legend payload includes `dataKey`** (#7488-era) — legend items carry `dataKey`.
- **Chart layout hooks/types exposed** — see §2 (the hooks already exist internally; this
  is mostly making them public + the layout type unions).

---

## 4. Bug fixes to port (LOW–MEDIUM — discrete, testable)

- **Falsy custom names preserved** — tooltip `name` of `0` or `""` no longer dropped.
- **Stacked bars render when all values are 0** (we already handle empty-data; verify the all-zero stacked case).
- **Sankey & Funnel guard against NaN positions with zero values** (`Sankey.tsx`, `util/FunnelUtils.tsx`).
- **XAxis/YAxis `padding` respected under clipping masks.**
- **Bar tooltip dispatch uses `originalDataIndex`** (#7273) — correct index after data filtering.
- **Legend prevents overlap with chart on container resize** (#7201).
- **Bar positioning uses `Math.round`** (not bitwise truncation) — sub-pixel geometry; may shift golden snapshots.
- **`Rectangle`/`Trapezoid`/`Curve` Shape-prop refactor** (#7349) — spread → separate prop object for tree-shaking; mostly internal, but check our shape prop plumbing/snapshots.
- Percent-format validation tightened; TS6 deprecation cleanups (N/A to us).

---

## Suggested order

1. **Cheap wins first** (§3 features + §4 fixes): Treemap nodeInset/nodeGap, ResponsiveContainer passthrough, PieChart legend dataKey, falsy tooltip name, Sankey/Funnel NaN guards, Bar originalDataIndex, axis-padding-under-clip, Legend resize overlap. Each is small and independently testable against the new vendored specs.
2. **`interpolate` export + layout hooks/types** (§2) — trivial barrel additions.
3. **Animation props** (`animationInterpolateFn`, `animationMatchBy`, `ShapeAnimationProps`) + `LineDrawShape`/`AreaRevealShape` — adopt the props/shapes onto our existing Solid animation layer.
4. **(Optional) full animation-engine re-port** onto the new controller/handle/matchBy design — only if we want byte-level parity with the new `*.animation.spec` suites.
