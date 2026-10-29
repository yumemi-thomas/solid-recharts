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
  // HUGE_FAN_IN is the runtime's always-on backstop for a computation that
  // tracks >= 2000 sources in one pass. The axis/tick computations read every
  // datum's category through the chart-data store proxy (two tracked sources per
  // datum: array slot + field), so a chart of ~1000 categories crosses it. This
  // stress spec renders 1000-category and extreme-sparsity charts on purpose
  // (it ports recharts' "reduce component tree size proportionally to sparsity"
  // cases verbatim); every other spec stays under the threshold and stays
  // guarded. Narrowing the per-datum reads is a library follow-up, not a reason
  // to shrink the ported scenario.
  "test/cartesian/Bar.zeroDimensionFiltering.spec.tsx": ["HUGE_FAN_IN"],

  // The budget spec captures with the attribution engine on, which adds the
  // engine-only cost findings to the channel the global guard also listens to.
  // Two of them are known properties of this port's design and are pinned
  // per scenario in test/performance/budgets.json (anything else still fails):
  //  - IMMUTABLE_UPDATE_IN_STORE: slices replace the object along a written path
  //    (CONTEXT.md "Slice immutability contract"), which the engine reads as a
  //    spread-copy update of `store.settings` / `store.axisInteraction`.
  //  - WIDE_SCOPE_DEPS: a computation that evaluates a memoized selector chain
  //    tracks every slice property read along it (> 200 sources).
  "test/performance/chartBudgets.spec.tsx": ["IMMUTABLE_UPDATE_IN_STORE", "WIDE_SCOPE_DEPS"],
};

export function acceptedDiagnosticsFor(specFile: string): DiagnosticCode[] {
  return [...GLOBALLY_ACCEPTED_DIAGNOSTICS, ...(SPEC_ACCEPTED_DIAGNOSTICS[specFile] ?? [])];
}
