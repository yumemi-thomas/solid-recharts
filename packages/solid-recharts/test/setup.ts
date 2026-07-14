// Test setup. Runs once before any test file.

import "@testing-library/jest-dom/vitest";
import "./helper/expectFunctionReturning";
import { cleanup } from "@solidjs/testing-library";
import { afterEach, vi } from "vitest";

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

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});
