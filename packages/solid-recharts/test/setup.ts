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
// Registers the `expect(artifact).toHaveNoDiagnostics()` family of matchers.
import "@solidjs/diagnostics/vitest";
import "./helper/expectFunctionReturning";
import { afterEach, aroundEach, expect, vi } from "vitest";
import { captureArtifact } from "@solidjs/diagnostics";
import { cleanup } from "@solidjs/testing-library";
import { acceptedDiagnosticsFor } from "./utils/diagnostics-allowlist";

// GLOBAL DIAGNOSTICS GUARD — always on, every test, no opt-out.
//
// The diagnostics discipline is zero-tolerance: any non-allowlisted Solid 2.0
// diagnostic is a bug — a STRICT_READ_UNTRACKED warning means a future state
// change silently won't propagate. Error-severity diagnostics already throw;
// warn-severity ones (STRICT_READ_UNTRACKED, NO_OWNER_EFFECT, …) only LOG, so
// without this guard they slip through every test silently.
//
// `aroundEach` wraps the test AND its `afterEach` hooks, so everything the test
// does — including the unmount in the `afterEach` below — happens inside one
// `captureArtifact` window. `attribution: false` keeps this to the diagnostics
// channel (no per-run bookkeeping across ~5400 tests) and `autoFlush: false`
// leaves the reactive queue exactly as the test left it. The only escape hatch
// is the allowlist in test/utils/diagnostics-allowlist.ts.
aroundEach(async (runTest, { task }) => {
  const { artifact } = await captureArtifact(() => runTest(), {
    scenario: task.name,
    attribution: false,
    autoFlush: false,
  });
  expect(artifact).toHaveNoDiagnostics({ allow: acceptedDiagnosticsFor(task.file.name) });
});

afterEach(() => {
  // Unmount first so cleanup-time diagnostics (e.g. onCleanup misuse) are caught.
  cleanup();
  vi.clearAllTimers();
});
