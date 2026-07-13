# Value-memoized selector graph + slice immutability contract

Status: accepted (revises the "no reselect at all" reading of ADR-0001)

Replacing reselect with per-consumer `createMemo` over plain selector functions (ADR-0001) lost _shared_ memoization: every consumer re-ran the full selector chain, so a live tooltip rebuilt the O(series×points) tooltip-axis chain ~10× per mousemove frame and a data update rebuilt the scale chain once per series. We restore upstream's caching contract with a hand-rolled `createSelector` (no dependency): cache nodes keyed per store (WeakMap on root state) and per primitive args, invalidated by input-selector reference comparison, with upstream's result-equality checks. A selector is wrapped iff upstream wraps it — verifiable against `vendor/`.

Reference-based invalidation is only sound if writes change references, so every slice adopts the **slice immutability contract**: nested writes replace objects along the written path (upstream's Redux/immer semantics) instead of Solid-style in-place mutation. Combiners run untracked; tracking flows solely through input-selector reads, which is sound under the contract.

## Known constraint: input selectors must read to the leaf, never return a slice root

A Solid store's **slice-root proxy has a permanently stable reference** — `state.chartData` is the same object before and after `setChartData`, because slices write their fields in place and Solid never swaps the root proxy (unlike Redux, which returns a fresh slice object per action). Two consequences for any wrapped selector:

1. An input selector that returns a whole slice root (e.g. `selectChartDataWithIndexes = state => state.chartData`) can never change reference, so reference-equality caching treats it as forever-unchanged and serves stale results.
2. Because the combiner runs untracked, the input selectors are the _only_ tracked reads. An input that reads only the root (not its leaves) also fails to subscribe to content changes.

So every input selector feeding a wrapped combiner must bottom out in **leaves** — primitives, or arrays/objects the slice replaces wholesale (`state.chartData.chartData` is replaced by `setChartData`, so its reference does change). Composite roots like `ChartDataState` must be split into per-leaf inputs or projected into a fresh object. This diverges from upstream's input shapes (upstream passes whole slice objects, which is safe under Redux) and makes the wrapping materially larger than a mechanical 1:1 mirror of upstream's `createSelector` calls. The public API and behavior stay identical; only the selector _internals_ diverge.

**Status of the wrapping:** landed and verified (full suite green). The leaf-input restructuring was applied to `dataSelectors` (`selectChartDataWithIndexes` / `selectChartDataAndAlwaysIgnoreIndexes` project from leaves), unblocking the full cartesian axis spine:

- applied-values sub-chain: `selectAxisPredicate`, `selectCartesianItemsSettings`, `selectCartesianGraphicalItemsData`, `selectAnyCartesianItemsUsesChartData`, `selectDisplayedData`, `selectAllAppliedValues`;
- stack + domain: `selectCartesianItemsSettingsExceptStacked`, `selectStackedCartesianItemsSettings`, `selectDisplayedStackedData`, `selectStackGroups`, `selectDomainOfStackGroups`, `selectNumericTicksDomain`, `selectNumericalDomain`, `selectAxisDomain`;
- scale + ticks: `selectRealScaleType`, `selectNiceTicks`, `selectAxisDomainIncludingNiceTicks`, `selectCheckedAxisDomain`, `selectConfiguredScale`, `selectAxisScale`, `selectAxisInverseScale`, `selectAxisRangeWithReverse`, `selectAxisRange` (identity wrapper with content-equality — the range tuple is rebuilt fresh each call), `selectCategoricalDomain`, `selectDuplicateDomain`, `selectTicksOfGraphicalItem`.

The regression gate (`test/state/selectors/selectorMemoization.spec.tsx`) proves the whole domain→scale→ticks chain is shared, stays stable across a tooltip/mousemove interaction (both axes), and invalidates on a data change.

**Two selectors deliberately left plain**, because they read a dynamically-keyed slice _record_ and iterate its entries — wrapping would move that iteration untracked and lose reactivity (an ErrorBar registering after first compute went unnoticed → stale domain): `selectDomainOfAllAppliedNumericalValuesIncludingErrorValues` (reads `selectAllErrorBarSettings` = the `errorBars` root) and `selectReferenceElementsDomain`. Their wrapped consumer `selectNumericalDomain` (with `numberDomainEqualityCheck`) still stabilizes the domain reference downstream.

**Remaining follow-up:** the tooltip-axis chain in `tooltipSelectors` (`selectTooltipAxisTicks`, `selectTooltipAxisScale`, `selectTooltipAxisDomain`, …). It now sits on the cached axis spine, so its expensive work is already shared; wrapping the tooltip-specific selectors is a smaller optional increment (the interaction-dependent parts — payload/index/coordinate — must stay live).

## Considered options

- **Per-store Solid `createMemo` node graph** — rejected: selectors stop being plain functions, breaking the value-spec test surface and ownerless call sites (middleware), and owner-scoped nodes are exactly the terrain of this repo's past NO_OWNER bugs. Performance difference vs value memoization is marginal (cache hits are cheap reference-compare walks).
- **reselect as a dependency** — rejected: ~2 KB gzip and a dependency for a subset we can hand-roll; keeps ADR-0001's no-Redux-runtime stance intact.
- **Per-slice version counters for invalidation** — rejected: sound but coarse; any tooltip write would invalidate all tooltip-derived caches, giving back most of the win.
- **Leaf-extracting input selectors over in-place writes** — rejected: no global invariant; a future in-place write to any object-typed input silently reintroduces stale caches.
