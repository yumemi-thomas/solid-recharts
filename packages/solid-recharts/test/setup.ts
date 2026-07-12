// Test setup. Runs once before any test file.
//
// Dev mode must be on for Solid 2.0 diagnostics to fire. The vite.config.ts
// `define` block already forces _SOLID_DEV_ / __DEV__ true, but we set them on
// globalThis here as belt-and-suspenders in case something is imported before
// vite's define plugin runs.

// @ts-expect-error — global injection for solid-js dev guards
globalThis._SOLID_DEV_ = true;
// @ts-expect-error — global injection for solid-js dev guards
globalThis.__DEV__ = true;

// Ported from vendor/recharts-reference/test/vitest.setup.ts — fake rAF/cAF so
// mouseEventsMiddleware throttleDelay:'raf' settles synchronously in tests. We ALSO
// fake `performance` so `performance.now()` shares the faked clock with the faked
// rAF timestamp: RequestAnimationFrameTimeoutController compares the rAF `now`
// against a `performance.now()` start time, and a real-vs-faked clock mismatch made
// CSS-transition animations reschedule rAF forever under `vi.runAllTimers()` (the
// 10000-timer infinite-loop guard). Aligning the clocks lets animated charts settle.
vi.useFakeTimers({
  toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
});

// @ts-expect-error — testing-library user-event checks the `jest` global
globalThis.jest = {
  advanceTimersByTime: vi.advanceTimersByTime,
};

import "@testing-library/jest-dom/vitest";
import "./helper/expectFunctionReturning";
import { afterEach, beforeEach, vi } from "vitest";
import { DEV } from "solid-js";
import { cleanup } from "./helper/render";
import {
  type DiagnosticEvent,
  describeDiagnosticEvents,
  isAllowedDiagnostic,
} from "./utils/diagnostics";

// GLOBAL DIAGNOSTICS GUARD — always on, every test, no opt-out.
//
// The diagnostics discipline (see test/utils/diagnostics.ts) is zero-tolerance:
// any non-allowlisted Solid 2.0 diagnostic is a bug — a STRICT_READ_UNTRACKED
// warning means a future state change silently won't propagate. Error-severity
// diagnostics already throw; warning-severity ones (STRICT_READ_UNTRACKED,
// NO_OWNER_EFFECT, …) only LOG, so without this guard they slip through every
// test silently.
//
// This subscribes for the duration of EACH test and fails the test in afterEach
// if any non-allowlisted diagnostic fired. The only escape hatch is the
// allowlist in test/utils/diagnostics-allowlist.ts.
let collected: DiagnosticEvent[] = [];
let unsubscribe: (() => void) | undefined;

beforeEach(() => {
  collected = [];
  if (DEV === undefined) {
    return;
  }
  unsubscribe = DEV.diagnostics.subscribe((event: DiagnosticEvent) => {
    if (!isAllowedDiagnostic(event.code)) {
      collected.push(event);
    }
  });
});

afterEach(() => {
  // Unmount first so cleanup-time diagnostics (e.g. onCleanup misuse) are caught.
  cleanup();
  vi.clearAllTimers();
  unsubscribe?.();
  unsubscribe = undefined;

  const events = collected;
  collected = [];

  if (events.length > 0) {
    throw new Error(
      `Test emitted ${events.length} unexpected Solid diagnostic(s). ` +
        `Fix the reactive-graph misuse (move untracked reads into a memo/JSX), ` +
        `or add the code to the allowlist with justification:\n${describeDiagnosticEvents(events)}`,
    );
  }
});
