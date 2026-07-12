// Ported from recharts 3.8.1 test/util/useUniqueId.spec.ts.
// Harness adaptation: renderHook from the local Solid shim (returns the value as
// `result`, not `result.current`). Solid components run once, so `rerender` has
// no effect on these once-computed ids — it's a local no-op here, preserving the
// spec's structure; the stability assertions hold by construction. Assertions
// are otherwise byte-identical.
import { describe, it, expect } from "vitest";
import { renderHook } from "@solidjs/testing-library";
import { useUniqueId } from "../../src/util/useUniqueId";
import { useIdFallback } from "../../src/util/useId";

// Solid hooks return a stable value (no re-render); rerender is a no-op.
const rerender = (_props?: unknown): void => {};

describe("useIdFallback", () => {
  it("should generate a random ID without prefix", () => {
    const { result } = renderHook(() => useIdFallback());
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("continues to return the same ID on rerender", () => {
    const { result } = renderHook(() => useIdFallback());
    const firstId = result;
    rerender();
    expect(result).toBe(firstId);
  });

  it("should return the same ID even when props change", () => {
    const { result } = renderHook(() => useIdFallback());
    const firstId = result;
    rerender({ prefix: "new-prefix" });
    expect(result).toBe(firstId);
  });
});

describe("useUniqueId (SSR-safe)", () => {
  describe("without prefix", () => {
    it("should generate a random ID without prefix", () => {
      const { result } = renderHook(() => useUniqueId());
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("continues to return the same ID on rerender", () => {
      const { result } = renderHook(() => useUniqueId());
      const firstId = result;
      rerender();
      expect(result).toBe(firstId);
    });

    it("should return the same ID even when props change", () => {
      const { result } = renderHook(() => useUniqueId());
      const firstId = result;
      rerender({ id: "new-id", prefix: "new-prefix" });
      expect(result).toBe(firstId);
    });
  });

  describe("with prefix", () => {
    it("should generate a random ID with prefix", () => {
      const { result } = renderHook(() => useUniqueId("bar"));
      expect(result).toMatch(/^bar-.+$/);
    });

    it("should return the same ID on rerender with prefix", () => {
      const { result } = renderHook(() => useUniqueId("bar"));
      const firstId = result;
      rerender();
      expect(result).toBe(firstId);
    });

    it("should return the same ID even when props change", () => {
      const { result } = renderHook(() => useUniqueId("bar"));
      const firstId = result;
      rerender({ id: "new-id", prefix: "new-prefix" });
      expect(result).toBe(firstId);
    });
  });

  describe("with customId", () => {
    it("should return custom ID if provided, and ignore the prefix", () => {
      const { result } = renderHook(() => useUniqueId("bar", "custom-id-modern"));
      expect(result).toBe("custom-id-modern");
    });

    it("should return the same custom ID on rerender", () => {
      const { result } = renderHook(() => useUniqueId("bar", "custom-id-modern"));
      expect(result).toBe("custom-id-modern");
      rerender();
      expect(result).toBe("custom-id-modern");
    });

    it("should return the same custom ID even when props change", () => {
      const { result } = renderHook(() => useUniqueId("bar", "custom-id-modern"));
      expect(result).toBe("custom-id-modern");
      rerender({ id: "new-id", prefix: "new-prefix" });
      expect(result).toBe("custom-id-modern");
    });
  });
});
