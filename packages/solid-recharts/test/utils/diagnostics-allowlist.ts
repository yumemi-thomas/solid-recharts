// Diagnostic codes the global guard (test/setup.ts) tolerates.
//
// The discipline is zero tolerance: any Solid 2.0 diagnostic fired during a
// test fails it. Adding to either list requires a justification here (and in
// the PR/commit) describing the false-positive or informational status of the
// code, with reference to the `reactivity-diagnostics` skill shipped in
// `solid-js` (mirrored by .claude/skills/solidjs-2/references/diagnostics.md)
// or the recharts behavior being matched. Prefer the per-spec list: it keeps
// the exemption next to the one scenario that needs it.

import type { DiagnosticCode } from "@solidjs/diagnostics";

// Codes accepted in every test. Empty on purpose — keep it that way.
// (`ASYNC_OUTSIDE_LOADING_BOUNDARY`, accepted before the rc.19 migration, never
// fires in this suite: the library has no async reads.)
export const GLOBALLY_ACCEPTED_DIAGNOSTICS: DiagnosticCode[] = [];

// Spec file (path relative to the library package) -> extra accepted codes.
const SPEC_ACCEPTED_DIAGNOSTICS: Record<string, DiagnosticCode[]> = {
  // The budget spec captures with the attribution engine on, which adds the
  // engine-only cost findings to the channel the global guard also listens to.
  // The two that remain are properties of this port's design, recorded in ADR-0002
  // ("Diagnostics") and pinned per scenario in test/performance/budgets.json, which
  // lists the exact codes each scenario may emit (anything else still fails):
  //  - IMMUTABLE_UPDATE_IN_STORE: slices replace the object along a written path
  //    (the slice immutability contract), which the engine reads as a spread-copy
  //    update of `store.settings` (the Tooltip registering) / `store.axisInteraction`
  //    (a hover that moved). No-op writes no longer count: they keep their reference.
  //  - WIDE_SCOPE_DEPS: the tooltip payload chain reads ~230 slice leaves (axes,
  //    items, layout, interaction), independent of the number of data points.
  //  - EFFECT_RELAY_TEAR (Scatter, Pie, Sankey mount): their tooltip entry /
  //    computed data is derived from the registered item and reaches the store from
  //    an effect one flush later (ADR-0002, "Diagnostics").
  //  - HUGE_FAN_IN (1000-bar chart only): a `<Show>` per conditionally rendered row
  //    costs 2-4 tracked sources in the layer's insertion; 500+ rows cross the
  //    runtime's 2000-source backstop.
  "test/performance/chartBudgets.spec.tsx": [
    "IMMUTABLE_UPDATE_IN_STORE",
    "WIDE_SCOPE_DEPS",
    "EFFECT_RELAY_TEAR",
    "HUGE_FAN_IN",
  ],
};

export function acceptedDiagnosticsFor(specFile: string): DiagnosticCode[] {
  return [...GLOBALLY_ACCEPTED_DIAGNOSTICS, ...(SPEC_ACCEPTED_DIAGNOSTICS[specFile] ?? [])];
}
