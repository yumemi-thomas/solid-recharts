// Unit spec for the register-while-mounted idiom (src/state/registerInStore.ts).
// No upstream counterpart — upstream hand-rolls two useLayoutEffects per site;
// this module concentrates the Solid-port equivalent, so this spec pins the
// contract every graphical item / axis / reference / tooltip / legend relies on.
//
// The interface is the test surface: (compute, {add, replace, remove}). These
// exercise it with spy handlers and a signal-driven compute — the same seam the
// 17 call sites cross. The global diagnostics guard in test/setup.ts additionally
// fails any of these on an unexpected reactive-graph diagnostic (e.g. a
// STRICT_READ_UNTRACKED, which would fire if the apply phase read a signal), so
// the add/replace cases double as a check that the two-arg createEffect shape
// keeps reactive reads in the compute phase only.
//
// Not asserted here: that removal runs owner-free (unregisterOnCleanup's
// runWithOwner(null), guarding SIGNAL_WRITE_IN_OWNED_SCOPE — a store write while a
// live parent disposes an owned child). That property IS exercised, just not in
// isolation: every graphical-item / axis component mount+unmount in the component
// suite writes to the real store on disposal, and the e2e suite covers real
// router/subtree teardown. A standalone unit attempt writes to a synthetic store
// during a disposal flush, which trips an unrelated test-harness scheduler
// artifact ("fn is not a function") rather than the diagnostic — so it would test
// the harness, not the contract.
import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { renderHook } from "@solidjs/testing-library";
import { registerInStore } from "../../src/state/registerInStore";

const makeHandlers = () => ({ add: vi.fn(), replace: vi.fn(), remove: vi.fn() });

describe("registerInStore", () => {
  it("calls add once on first registration", () => {
    const handlers = makeHandlers();
    renderHook(() => registerInStore(() => ({ id: "a" }), handlers));
    expect(handlers.add).toHaveBeenCalledTimes(1);
    expect(handlers.add).toHaveBeenCalledWith({ id: "a" });
    expect(handlers.replace).not.toHaveBeenCalled();
    expect(handlers.remove).not.toHaveBeenCalled();
  });

  it("calls replace(prev, next) when the computed settings change", () => {
    const handlers = makeHandlers();
    const { result: setN } = renderHook(() => {
      const [n, setN] = createSignal(1);
      registerInStore(() => ({ id: "a", n: n() }), handlers);
      return setN;
    });
    expect(handlers.add).toHaveBeenCalledWith({ id: "a", n: 1 });

    setN(2);
    expect(handlers.replace).toHaveBeenCalledTimes(1);
    expect(handlers.replace).toHaveBeenCalledWith({ id: "a", n: 1 }, { id: "a", n: 2 });
    // add fires exactly once, ever.
    expect(handlers.add).toHaveBeenCalledTimes(1);
  });

  it("skips the tick when compute returns undefined and preserves prev", () => {
    const handlers = makeHandlers();
    const { result: setOn } = renderHook(() => {
      const [on, setOn] = createSignal(true);
      registerInStore(() => (on() ? { id: "a" } : undefined), handlers);
      return setOn;
    });
    expect(handlers.add).toHaveBeenCalledTimes(1);

    setOn(false); // compute → undefined: no write, prev untouched
    expect(handlers.replace).not.toHaveBeenCalled();
    expect(handlers.remove).not.toHaveBeenCalled();

    setOn(true); // valid again: prev survived, so this is a replace — not a second add
    expect(handlers.add).toHaveBeenCalledTimes(1);
    expect(handlers.replace).toHaveBeenCalledTimes(1);
  });

  it("calls remove(prev) on unmount", () => {
    const handlers = makeHandlers();
    const { cleanup } = renderHook(() => registerInStore(() => ({ id: "a" }), handlers));
    cleanup();
    expect(handlers.remove).toHaveBeenCalledTimes(1);
    expect(handlers.remove).toHaveBeenCalledWith({ id: "a" });
  });

  it("does not call remove on unmount when it never registered", () => {
    const handlers = makeHandlers();
    const { cleanup } = renderHook(() => registerInStore(() => undefined, handlers));
    cleanup();
    expect(handlers.add).not.toHaveBeenCalled();
    expect(handlers.remove).not.toHaveBeenCalled();
  });
});
