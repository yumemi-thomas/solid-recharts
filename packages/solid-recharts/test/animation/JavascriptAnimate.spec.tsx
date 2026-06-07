// Tier-B port of recharts' JavascriptAnimate timing/progress specs.
//
// The recharts specs assert React render COUNTS (how many times the function
// child was called) via a 4-class mock-manager hierarchy + `act`/`rerender` —
// all coupled to React's render cycle, which has no Solid equivalent (Solid
// components run once; the function child re-invokes via a reactive JSX
// binding, on a different cadence). So this validates the engine's behavioral
// contract instead, golden-anchored to recharts: the child receives t=0 first
// and t=1 once the animation completes, and an inactive animation jumps to t=1.
// It drives the REAL `createAnimateManager` with the ported `MockTimeoutController`.
import { describe, it, expect, vi } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { JavascriptAnimate } from "../../src/animation/JavascriptAnimate";
import { createAnimateManager } from "../../src/animation/AnimationManager";
import { MockTimeoutController } from "./mockTimeoutController";

describe("JavascriptAnimate", () => {
  it("calls the child with t=0 initially and t=1 once the animation completes", async () => {
    const controller = new MockTimeoutController();
    const manager = createAnimateManager(controller);
    const child = vi.fn((_t: number): null => null);

    render(() => (
      <JavascriptAnimate
        animationId="1"
        easing="linear"
        duration={500}
        begin={0}
        animationManager={manager}
      >
        {child}
      </JavascriptAnimate>
    ));
    flush();

    expect(child).toHaveBeenCalledWith(0);

    await controller.flushAllTimeouts();
    flush();

    expect(child).toHaveBeenLastCalledWith(1);
  });

  it("jumps straight to t=1 when isActive is false", () => {
    const controller = new MockTimeoutController();
    const manager = createAnimateManager(controller);
    const child = vi.fn((_t: number): null => null);

    render(() => (
      <JavascriptAnimate animationId="1" isActive={false} duration={500} animationManager={manager}>
        {child}
      </JavascriptAnimate>
    ));
    flush();

    expect(child).toHaveBeenLastCalledWith(1);
    expect(controller.getCallbacksCount()).toBe(0);
  });
});
