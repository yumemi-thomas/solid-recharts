// Ported from recharts 3.8.1 test/util/usePrefersReducedMotion.spec.ts.
// Harness changes only: renderHook from the local Solid shim; the hook returns
// an Accessor, so the value is read via `result()` where React wrote
// `result.current`. Assertions/mocks are otherwise byte-identical.
import { test } from "vitest";
import { renderHook } from "../helper/render";

import { usePrefersReducedMotion } from "../../src/util/usePrefersReducedMotion";
import { Global } from "../../src/util/Global";

test("prefers-reduced-motion query is not supported", () => {
  vi.spyOn(Global, "isSsr", "get").mockReturnValue(false);
  const { result } = renderHook(() => usePrefersReducedMotion());

  expect(result()).toBe(false);
});

test("prefers-reduced-motion query is supported and matches", () => {
  vi.spyOn(Global, "isSsr", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const { result } = renderHook(() => usePrefersReducedMotion());

  expect(result()).toBe(true);
});

test("prefers-reduced-motion query is supported and does not match", () => {
  vi.spyOn(Global, "isSsr", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const { result } = renderHook(() => usePrefersReducedMotion());

  expect(result()).toBe(false);
});

test("in SSR should return false", () => {
  vi.spyOn(Global, "isSsr", "get").mockReturnValue(true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { result } = renderHook(() => usePrefersReducedMotion());

  expect(result()).toBe(false);
});
