# Positional `_unused` args on panorama-aware input selectors are intentional

Status: accepted (records a decision that follows from ADR-0002)

Some input selectors carry positional filler parameters and appear in near-identical numbered variants — most visibly `selectChartDataWithIndexesIfNotInPanoramaPosition3(state, _unused1, isPanorama)` and `…Position4(state, _unused1, _unused2, isPanorama)` in `dataSelectors.ts`. An architecture review flagged this as a leaky seam: the memoization plumbing (arg positions) surfacing in the public selector shape. This ADR records why it stays.

## Why the positions are load-bearing

Our hand-rolled `createSelector` (ADR-0002) caches per **primitive arg tuple** and invokes **every input selector with the full positional arg list** the wrapped selector was called with. So an input selector that needs `isPanorama` must read it from whatever index the _consuming chain_ places it at:

- a per-item chain called `select…(state, xAxisId, yAxisId, isPanorama)` → `isPanorama` is arg index 3 → `Position4`;
- a chain called `select…(state, axisId, isPanorama)` → arg index 2 → `Position3`.

The `_unused` parameters are placeholders that walk `isPanorama` to the correct index for each arity. They are not accidental — they are how a shared leaf input participates in chains of different arities under positional caching.

## Options considered for "hiding" it

- **Named args into `createSelector`** — rejected: reworks the core memoization primitive settled in ADR-0002; the positional cache key is the whole mechanism.
- **Reorder every chain so `isPanorama` sits at a fixed index** — rejected: cascades across ~6 selector files on the axis spine (`axis/data/bar/area/line/scatter` selectors) for zero behavior change; exactly the high-risk/no-gain refactor the "faithful, no behavior change" constraint exists to prevent.
- **A named-arg adapter in front of the numbered variants** — rejected: it cannot change what `createSelector` passes the inner input selectors, so the positional read (and therefore the variants) would remain underneath.

## Decision

Keep the positional input selectors and their numbered variants. They are a direct, correct consequence of ADR-0002's positional memoization. Future architecture reviews should not re-suggest "hiding the positional-arg leak" — it is intentional, not incidental. Naming stays descriptive (`…Position3` / `…Position4`) so the required arity is explicit at the call site.
