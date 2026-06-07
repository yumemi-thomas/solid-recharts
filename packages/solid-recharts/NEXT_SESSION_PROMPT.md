# Session goal: grow the test suite (and fix what it surfaces)

You are continuing a faithful port of **recharts 3.8.1 → SolidJS 2.0** living at
`/Users/thomas/Downloads/solid-recharts/packages/solid-recharts`. The feature port is ~80%
complete; **test coverage is the gap** — ~1217 cases vs recharts' ~3658 (~33%). Your job this
session is to **port reference specs into the Solid suite**, and **fix any real port bugs the
new tests surface**. Quality over volume: every test must be faithful and must pass for the
right reason.

## The reference

recharts 3.8.1 source + tests are checked out at:

- `/Users/thomas/Documents/Github/recharts-reference/src`
- `/Users/thomas/Documents/Github/recharts-reference/test`

Port the reference spec's _intent and exact assertions_ (golden numbers, geometry, counts),
adapting only the React→Solid mechanics.

## Non-negotiable conventions (these OVERRIDE defaults)

1. **Gate after EVERY change**: `vp check --fix` (lint/format/type — must end at _0 errors_;
   10 warnings is the known steady-state baseline) AND `vp test run` (must stay fully green).
   Do NOT use `npx vitest` — use `vp test run <pattern>`.
2. **No `any`, no `as`, no non-null `!` in src, no `@ts-expect-error`.** The lint is
   type-aware and WILL catch these (it already caught a bad test this project). Use typed
   coercion / helpers instead.
3. **Faithful porting.** If a feature is genuinely deferred in the port (check the file's
   header comment), don't assert it — write a _subset_ spec mirroring the existing ported
   specs' style, and note in the spec header which reference assertions you omitted and why.
   If the spec fails because the **port has a real bug or missing-but-claimed feature, FIX the
   port** (faithfully to recharts), don't weaken the test.
4. **Document deviations** in spec/source header comments (the codebase does this consistently
   — match the surrounding style, comment density, and naming).

## Solid 2.0 gotchas that WILL bite (all learned the hard way — see memory)

- A global guard in `test/setup.ts` **fails any test on a non-allowlisted Solid diagnostic**
  (STRICT_READ_UNTRACKED etc). Common fixes:
  - Don't read a reactive/accessor value directly in `<Show when={...}>` static children —
    use the accessor-child form `<Show when={obj()}>{(v) => ...}</Show>` with a TRUTHY object
    `when`, OR a plain **ternary** in JSX for a captured non-reactive const (a
    `<Show when={capturedConst}>` still trips STRICT_READ).
  - Bake values into `<For>`-item descriptors; don't render recursive hierarchies via
    components that read reactive `props.*`.
- **`mouseenter`/`mouseleave` do NOT bubble.** Item handlers live on the wrapping node
  `<Layer>` — `fireEvent.mouseEnter` the Layer `g`, not the inner shape.
- **Bar item-hover tooltip needs `<Tooltip shared={false}>`** (shared tooltips use the
  axis/mouse path, not item-enter).
- Solid 2.0 **defers propagation to a flush boundary**: after a sync signal set, a memo read
  in the same tick is stale until `flush()`. Tests call `flush()` after render and after
  `fireEvent`. Use local values (not re-read memos) inside event handlers.
- Test wrappers: use `props.children`, never destructure `{children}` (breaks the store).

## Exact commands

```
cd /Users/thomas/Downloads/solid-recharts/packages/solid-recharts
vp test run <Name>      # run one spec (substring match), e.g. vp test run ChartUtils
vp test run             # full suite (currently 1217 passing / 115 files)
vp check --fix          # the gate (0 errors / 10 warnings = clean)
```

## Prioritized worklist (port in this order — fastest/safest first)

**Tier 1 — pure-function specs (no DOM, no flake, highest value).** These pin exact numeric
behavior of code we already ship but barely test. Reference paths under `…/recharts-reference/test/`:

- `util/ChartUtils.spec.tsx`, `util/BarUtils.spec.tsx`, `util/DataUtils.spec.ts` (extend ours)
- `util/round.spec.ts`, `util/isWellBehavedNumber.spec.ts`, `util/getRelativeCoordinate.spec.ts`
- `util/ChartUtils/{truncateByDomain,getStackedData,getCateCoordinateOfLine}.spec.*`
- `util/scale/{getNiceTickValues,arithmetic,createCategoricalInverse}.spec.ts`
- `util/cursor/{getCursorRectangle,getCursorPoints,getRadialCursorPoints}.spec.ts`
- `util/payload/getUniqPayload.spec.ts`, `util/tooltip/translate.spec.ts`
- `util/CartesianUtils/{CartesianUtils,rectWithPoints}.spec.ts`, `util/PolarUtils.spec.ts`
- `util/resolveDefaultProps.spec.tsx` (NB: our port uses Solid `merge`, not resolveDefaultProps
  — adapt or skip with a note), `util/isDomainSpecifiedByUser.spec.ts`, `util/TickUtils.spec.ts`
- Also untested port units with NO ref-named spec but clearly testable: `src/util/getSliced.ts`,
  `getEveryNth.ts`, `getActiveCoordinate.ts`, `YAxisUtils.ts`, `getRadiusAndStrokeWidthFromDot.ts`,
  `ReduceCSSCalc.ts` — write fresh unit specs from the port's behavior + reference src.

**Tier 2 — state selectors (test through the store; medium effort).**
`state/selectors/*.spec.tsx` — `dataSelectors`, `axisSelectors`, `legendSelectors`,
`lineSelectors`, `pieSelectors`, `scatterSelectors`, `radialBarSelectors`, `selectChartOffset`,
`combiners/combineActiveTooltipIndex`. Use the existing `test/helper/render` + store patterns.

**Tier 3 — component/integration specs (deepen behavior).**
`component/{Text,Label,LabelList,Legend,DefaultTooltipContent,Cursor,ResponsiveContainer}.spec.tsx`,
`cartesian/{Area,Line,Bar/Bar,Scatter,CartesianAxis,CartesianGrid,ErrorBar,Brush}.spec.tsx`,
`polar/{Pie/Pie,Radar,RadialBar/RadialBar,PolarGrid,PolarAngleAxis,PolarRadiusAxis}.spec.tsx`,
`chart/{ComposedChart,RadarChart,ScatterChart,CategoricalChart}.spec.tsx`. These are big in the
reference — port the parity-critical subset and document omissions (the existing `*.spec.tsx`
headers show the house style).

## Working rhythm

1. Pick the next worklist item. Read the reference spec + the port's source.
2. Port the spec into the mirrored path under `test/` (match existing naming/structure).
3. `vp test run <Name>`. If it fails: decide — port bug (fix src faithfully) vs deferred feature
   (subset the spec + document). Never weaken a test to hide a real gap.
4. `vp check --fix`. Confirm 0 errors.
5. Periodically run the full `vp test run` to catch cross-file regressions.
6. Update `MEMORY.md` + a memory file when you learn something non-obvious or finish a cluster.

## Context to load first

Read the memory index at
`/Users/thomas/.claude/projects/-Users-thomas-Downloads-solid-recharts/memory/MEMORY.md` and the
files it points to (especially `expectclean-or-diagnostics-silent.md`,
`solid2-reactivity-timing.md`, `root-config-and-lint.md`, `custom-shape-render-props.md`) — they
encode the gate, the diagnostic guard, and the reactivity rules above.

Start with **Tier 1** and report progress in batches (files ported, tests added, any port bugs
fixed). Keep the suite green the whole way.
