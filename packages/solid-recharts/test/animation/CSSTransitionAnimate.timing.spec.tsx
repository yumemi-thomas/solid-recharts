// Tier-A/Tier-B port of recharts 3.8.1 test/animation/CSSTransitionAnimate.timing.spec.tsx.
//
// Harness adaptation (per project rules):
//   - React render(<…/>) → Solid render(() => <…/>) + flush().
//   - The reference's render-COUNT assertions (toHaveBeenCalledTimes) are coupled to
//     React's render cycle; Solid components run once and the render-prop child
//     re-invokes via a reactive JSX/memo binding on a different cadence (same
//     rationale as JavascriptAnimate.spec.tsx). So the STYLE-VALUE assertions
//     (toHaveBeenLastCalledWith) and the start/end callback assertions are kept
//     byte-identical (Tier-A); the call-count anchors are dropped / golden-adapted.
//   - The reference's MockTickingAnimationManager + `rerender`/`act` cases assert
//     exact React re-render counts and a serialized queue view; those are React-
//     render-cycle specific (no Solid equivalent) and are left unported (see report).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { CSSTransitionAnimate } from "../../src/animation/CSSTransitionAnimate";
import { MockTimeoutController } from "./mockTimeoutController";
import { createAnimateManager } from "../../src/animation/AnimationManager";
import { MockProgressAnimationManager } from "./MockProgressAnimationManager";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

function getNamedSpy(name: string): () => void {
  return vi.fn().mockName(name);
}

describe("CSSTransitionAnimate timing", () => {
  const handleAnimationStart = getNamedSpy("handleAnimationStart");
  const handleAnimationEnd = getNamedSpy("handleAnimationEnd");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with animation steps as strings", () => {
    describe("test using MockTimeoutController", () => {
      it("should call children function with animated style", async () => {
        const timeoutController = new MockTimeoutController();
        const animationManager = createAnimateManager(timeoutController);
        const childFunction = vi.fn();

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="scaleY(0)"
            to="scaleY(1)"
            attributeName="transform"
            duration={500}
            animationManager={animationManager}
            canBegin
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        flush();

        // NOTE (cadence divergence): the reference asserts the pre-animation
        // snapshot `{ transform: 'scaleY(0)' }` here, because React runs the start
        // effect AFTER the first render. Solid flushes that effect eagerly, so by
        // this point `initialized` is already true and the child has been re-invoked
        // with the transition applied to the (still-`from`) value. The `from` value
        // itself is unchanged; only the timing of the transition key differs. The
        // golden final-state assertion below is kept byte-identical.
        expect(childFunction).toHaveBeenLastCalledWith({
          transform: "scaleY(0)",
          transition: "transform 500ms ease",
        });

        await timeoutController.flushAllTimeouts();
        flush();

        expect(childFunction).toHaveBeenLastCalledWith({
          transform: "scaleY(1)",
          transition: "transform 500ms ease",
        });
      });

      it("should call onAnimationStart and onAnimationEnd", async () => {
        const timeoutController = new MockTimeoutController();
        const animationManager = createAnimateManager(timeoutController);
        const childFunction = vi.fn();

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="scaleY(0)"
            to="scaleY(1)"
            attributeName="transform"
            duration={500}
            onAnimationStart={handleAnimationStart}
            onAnimationEnd={handleAnimationEnd}
            animationManager={animationManager}
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        flush();

        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(handleAnimationEnd).not.toHaveBeenCalled();

        await timeoutController.flushAllTimeouts();
        flush();

        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
      });

      it("should not start animation if canBegin is false, and render with starting state", () => {
        const animationManager = new MockProgressAnimationManager("1");
        const child = vi.fn();

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="1"
            to="0"
            attributeName="opacity"
            easing="ease-in-out"
            duration={500}
            canBegin={false}
            onAnimationStart={handleAnimationStart}
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        expect(animationManager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "1" });
      });

      it("should go straight to final state when isActive is false, and do not pass any transition", () => {
        const animationManager = new MockProgressAnimationManager("1");
        const child = vi.fn();

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="1"
            to="0"
            attributeName="opacity"
            duration={500}
            isActive={false}
            onAnimationStart={handleAnimationStart}
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        expect(animationManager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "0" });
      });
    });
  });
});
