// Shared helpers for the Solid 2.0 diagnostics guard.
//
// Solid 2.0 ships a structured diagnostics system that catches common
// reactive-graph mistakes in dev (broken reactivity, writes in owned scopes,
// untracked reads of async/strict values, lifecycle misuse). The full
// reference is in `.claude/skills/solidjs-2/references/diagnostics.md`.
//
// Workflow rule: **every diagnostic event is signal, not noise — tests fail on
// unexpected ones.** AI-generated code in particular tends to ignore console
// warnings because "stuff works anyway", but a `STRICT_READ_UNTRACKED` warning
// means a future state change won't propagate: the test passes while the state
// is static and the bug only surfaces later.
//
//   - Error-severity diagnostics (SIGNAL_WRITE_IN_OWNED_SCOPE,
//     CLEANUP_IN_FORBIDDEN_SCOPE, …) throw, so a test that triggers one fails by
//     virtue of the throw — zero tolerance is enforced for free.
//   - Warning-severity diagnostics (STRICT_READ_UNTRACKED, NO_OWNER_EFFECT, …)
//     only log; the GLOBAL guard in `test/setup.ts` turns them into failures.
//
// Enforcement is global and unconditional (`test/setup.ts` subscribes for every
// test) — there is intentionally no opt-in `expectClean`/`expectОnly` wrapper:
// we check always. This module just exposes the event shape + the filtering /
// formatting the guard uses; the allowlist (`./diagnostics-allowlist.ts`) is the
// only escape hatch and it should stay short.

import { GLOBALLY_ACCEPTED_DIAGNOSTICS } from "./diagnostics-allowlist";

// `DEV.diagnostics.subscribe()` events. We narrow the shape structurally so
// tests can read fields without importing internal types from `@solidjs/signals`
// (keeps this test-only and re-syncs trivially if the upstream type moves).
export interface DiagnosticEvent {
  readonly sequence: number;
  readonly code: string;
  readonly kind: string;
  readonly severity: "warn" | "error";
  readonly message: string;
  readonly ownerName?: string;
  readonly nodeName?: string;
  readonly data?: Record<string, unknown>;
}

export function isAllowedDiagnostic(code: string): boolean {
  for (const c of GLOBALLY_ACCEPTED_DIAGNOSTICS) {
    if (code === c) return true;
  }
  return false;
}

export function describeDiagnosticEvents(events: readonly DiagnosticEvent[]): string {
  return events
    .map((e) => {
      const owner = e.ownerName ?? "<unknown>";
      const node = e.nodeName === undefined ? "" : ` node=${e.nodeName}`;
      const data = e.data === undefined ? "" : ` data=${JSON.stringify(e.data)}`;
      return `  [${e.severity}] ${e.code} at ${owner}${node}${data}: ${e.message}`;
    })
    .join("\n");
}
