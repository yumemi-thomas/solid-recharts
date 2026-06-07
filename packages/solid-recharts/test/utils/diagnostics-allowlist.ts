// Diagnostic codes accepted globally as informational, not errors.
//
// Adding to this list requires a justification in the PR/commit describing
// the false-positive or informational status of the code, with reference to
// the Solid 2.0 diagnostics reference
// (.claude/skills/solidjs-2/references/diagnostics.md) or the recharts
// behavior being matched. The default is zero tolerance — this list is the
// only escape hatch and it should stay short.

export const GLOBALLY_ACCEPTED_DIAGNOSTICS = [
  // Non-halting informational. Fires when an async value is read outside a
  // <Loading> boundary; the runtime defers root mount until settled. The
  // permissive default is fine per the 2.0 diagnostics reference, and our
  // chart examples don't always wrap async reads in <Loading>.
  "ASYNC_OUTSIDE_LOADING_BOUNDARY",
] as const;

export type AcceptedDiagnostic = (typeof GLOBALLY_ACCEPTED_DIAGNOSTICS)[number];
