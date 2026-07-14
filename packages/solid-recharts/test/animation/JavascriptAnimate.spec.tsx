// Tier-B behavioral spec for JavascriptAnimate on the v3.9 engine.
//
// recharts' originals assert React render COUNTS via a mock-manager hierarchy +
// `act`/`rerender` — coupled to React's render cycle, no Solid equivalent (Solid
// components run once; the function child re-invokes via a reactive JSX binding).
// So this validates the engine's behavioral contract instead, golden-anchored to
// recharts: the child receives t=0 first and t=1 once the animation completes, and
// an inactive animation jumps straight to t=1. It drives the REAL engine via the
// injected MockControllerAnimationManager (deterministic, no requestAnimationFrame).
import { describe, it, expect, vi } from "vitest";

import { render } from "@solidjs/testing-library";
import { JavascriptAnimate } from "../../src/animation/JavascriptAnimate";
import { MockControllerAnimationManager } from "./mockControllerAnimationManager";

describe("JavascriptAnimate", () => {
  it("calls the child with t=0 initially and t=1 once the animation completes", async () => {
    const manager = new MockControllerAnimationManager("1");
    const child = vi.fn((_t: number): null => null);

    render(() => (
      <JavascriptAnimate
        animationId="1"
        easing="linear"
        duration={500}
        begin={0}
        animationController={manager.factory}
      >
        {child}
      </JavascriptAnimate>
    ));
    expect(child).toHaveBeenCalledWith(0);

    await manager.completeAnimation();
    expect(child).toHaveBeenLastCalledWith(1);
  });

  it("jumps straight to t=1 when isActive is false", () => {
    const manager = new MockControllerAnimationManager("1");
    const child = vi.fn((_t: number): null => null);

    render(() => (
      <JavascriptAnimate
        animationId="1"
        isActive={false}
        duration={500}
        animationController={manager.factory}
      >
        {child}
      </JavascriptAnimate>
    ));
    expect(child).toHaveBeenLastCalledWith(1);
    // Inactive → the controller is never invoked, so nothing is animating.
    expect(manager.isAnimating()).toBe(false);
  });
});
