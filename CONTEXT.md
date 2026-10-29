# solid-recharts

A SolidJS 2.0 port of recharts: same public API and rendering behaviour as upstream recharts 3.10, re-implemented on Solid's fine-grained reactivity instead of React + Redux.

## Language

### Chart state

**Store**:
The per-chart state container (`{ state, actions }`) composed from slices; every chart instance owns exactly one.
_Avoid_: Redux store, context (for this concept)

**Slice**:
One named region of store state plus the actions that write it (e.g. `tooltip`, `graphicalItems`). The only place writes happen.
_Avoid_: reducer

**Slice immutability contract**:
The write discipline every slice follows: a write replaces the object(s) along the written path rather than mutating them in place, so a changed value always has a new reference.
_Avoid_: immer semantics, path-copy (as a term)

**Opaque data**:
A data array a slice stores frozen (`toOpaqueArray`), so the store returns it unwrapped and reading its rows is untracked: readers subscribe to the array's reference, not to every row and field. Used for the chart `data` and each graphical item's own `data`; a reactive input is read once at the boundary with `trackData` (`deep()`).
_Avoid_: raw data, frozen data

**Selector**:
A plain function from root state (plus primitive args) to a derived value. Always callable outside a reactive scope.

**Input selector**:
A selector used as an argument extractor for a combiner; it must read every path segment from root state to the value it extracts.

**Combiner**:
A pure function over extracted input values that computes a derived value. Never reads store state directly.
_Avoid_: compute function, deriver

**Selector graph**:
The shared, per-store memoization of composed selectors: each wrapped selector recomputes only when an input selector's result reference changes, and all consumers share the cached result.
_Avoid_: reselect (as a name for ours), selector cache

**Store registration** (the register-while-mounted idiom):
How a graphical item, axis, reference element, or tooltip/legend entry adds its settings to the store while mounted and removes them on unmount. Concentrated in `registerInStore`: the caller supplies a compute thunk (returning `undefined` to skip the tick — store absent, panorama, unresolved axis type) plus `{ add, replace, remove }` store actions; the effect shape, reference-based prev-tracking, and owner-free cleanup live behind that one interface.
_Avoid_: effect-dispatch component, Set\* component (as the general term)

**Keyed collection**:
A store-held set of settings keyed by an id, exposing add / replace / remove. Two representations: an **array** (graphical items, reference elements, legend payload, tooltip entries) whose writes reassign the whole array to a new reference (`createCollectionActions`), and a **record** `Record<id, …>` (the x/y/z cartesian axes) whose writes mutate the draft in place to keep the map's reference stable (`axisCollection`, local to `cartesianAxisSlice`). Both honour the [[store-proxy-reference-identity]] rules of the Slice immutability contract; the array helper must do its current-array read inside `setState`, never in the caller's scope.
_Avoid_: list, dictionary (as the term)

### Chart anatomy

**Graphical item**:
A data-bound series component (Bar, Line, Area, Scatter, Pie, Radar, RadialBar, Funnel) that registers itself in the store and renders shapes.
_Avoid_: series component, chart child

**Panorama**:
The miniature mirror of the chart rendered inside a Brush; axes resolve against the panorama range instead of the plot area.
_Avoid_: mini-map, brush preview
