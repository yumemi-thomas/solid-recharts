// Behavioral spec for CSSTransitionAnimate on the v3.9 engine.
//
// Harness adaptation (per project rules):
//   - React render(<…/>) → Solid render(() => <…/>) + flush().
//   - The reference's render-COUNT assertions (toHaveBeenCalledTimes) are coupled to
//     React's render cycle; Solid components run once and the render-prop child
//     re-invokes via a reactive JSX/memo binding on a different cadence. So the
//     STYLE-VALUE assertions (toHaveBeenLastCalledWith) and the start/end callback
//     assertions are kept (Tier-A); call-count anchors are golden-adapted.
//   - The reference drives `rerender(...)` to mutate props; Solid components run once,
//     so prop changes are driven by signals (createSignal) wired into the props.
//   - The deterministic group injects the new-engine controller via
//     `animationController={manager.factory}` (MockControllerAnimationManager) and drives
//     it with `completeAnimation()` — the v3.9 replacement for the old queue-poll mocks.
//   - `vi.useFakeTimers()` cases drive the REAL default controller (rAF-backed); we
//     advance the faked timers then `flush()` Solid's reactive graph.
//   - CADENCE DIVERGENCE (recurring): React runs the start effect AFTER first render and
//     flips `initialized` via a ref; Solid flushes the effect eagerly and flips
//     `initialized` (a signal) synchronously, AND the v3.9 engine fires onAnimationStart
//     synchronously in the CSSTransitionAnimation constructor. So the transition key and
//     the `onStart`-set `from` value appear one cadence earlier than the reference. The
//     load-bearing contracts (fresh `from`, settled `to`, gating) are asserted.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { batch, createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { CSSTransitionAnimate } from "../../src/animation/CSSTransitionAnimate";
import { MockControllerAnimationManager } from "./mockControllerAnimationManager";
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
    describe("test using vi fake timers", () => {
      it("should call children function with animated style", () => {
        vi.useFakeTimers();
        try {
          const childFunction = vi.fn();
          render(() => (
            <CSSTransitionAnimate
              animationId="1"
              from="1"
              to="0"
              attributeName="opacity"
              duration={500}
            >
              {childFunction}
            </CSSTransitionAnimate>
          ));
          // NOTE (cadence divergence): the reference asserts the bare `{ opacity: '1' }`
          // snapshot here because React runs the start effect AFTER first render. Solid
          // flushes that effect eagerly, so by now the transition key is already present
          // while the value is still the `from`. The golden final-state assertion below
          // is kept byte-identical.
          expect(childFunction).toHaveBeenLastCalledWith({
            opacity: "1",
            transition: "opacity 500ms ease",
          });

          vi.advanceTimersByTime(700);
          expectLastCalledWith(childFunction, {
            opacity: "0",
            transition: "opacity 500ms ease",
          });
        } finally {
          vi.useRealTimers();
        }
      });

      it("should call onAnimationEnd at the end of the animation", () => {
        vi.useFakeTimers();
        try {
          const spy = vi.fn();

          render(() => (
            <CSSTransitionAnimate
              animationId="1"
              from="1"
              to="0"
              attributeName="opacity"
              duration={500}
              onAnimationEnd={handleAnimationEnd}
            >
              {spy}
            </CSSTransitionAnimate>
          ));
          expect(handleAnimationEnd).not.toHaveBeenCalled();

          vi.advanceTimersByTime(700);
          expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
        } finally {
          vi.useRealTimers();
        }
      });
    });

    describe("test using injected controller", () => {
      it("should call children function with animated style", async () => {
        const manager = new MockControllerAnimationManager("1");
        const childFunction = vi.fn();

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="scaleY(0)"
            to="scaleY(1)"
            attributeName="transform"
            duration={500}
            animationController={manager.factory}
            canBegin
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        expect(childFunction).toHaveBeenLastCalledWith({
          transform: "scaleY(0)",
          transition: "transform 500ms ease",
        });

        await manager.completeAnimation();
        expect(childFunction).toHaveBeenLastCalledWith({
          transform: "scaleY(1)",
          transition: "transform 500ms ease",
        });
      });

      it("should call onAnimationStart and onAnimationEnd", async () => {
        const manager = new MockControllerAnimationManager("1");
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
            animationController={manager.factory}
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        // v3.9 engine: onAnimationStart fires synchronously when the animation is created.
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(handleAnimationEnd).not.toHaveBeenCalled();

        await manager.completeAnimation();
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
      });

      it("should start animation on mount, and stop on unmount", () => {
        const manager = new MockControllerAnimationManager("1");
        const childFunction = vi.fn();

        const { unmount } = render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="1"
            to="0"
            attributeName="opacity"
            duration={500}
            onAnimationStart={handleAnimationStart}
            onAnimationEnd={handleAnimationEnd}
            animationController={manager.factory}
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        expect(manager.isAnimating()).toBe(true);

        // Tier-B adaptation: the reference unmounts via `rerender(<></>)`; in Solid we
        // dispose the render root, which runs the effect cleanup → controller cancel → stop.
        unmount();

        expect(manager.isAnimating(), "AnimationController should be stopped on unmount").toBe(
          false,
        );
      });

      it("should not start animation if canBegin is false, and render with starting state", () => {
        const manager = new MockControllerAnimationManager("1");
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
            animationController={manager.factory}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(manager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "1" });
      });

      it("should go straight to final state when isActive is false, and do not pass any transition", () => {
        const manager = new MockControllerAnimationManager("1");
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
            animationController={manager.factory}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(manager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "0" });
      });

      it("should restart animation when isActive changes to true via signal", async () => {
        const manager = new MockControllerAnimationManager("1");
        const child = vi.fn();
        const [isActive, setIsActive] = createSignal(false);
        const [duration, setDuration] = createSignal(500);

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from="1"
            to="0"
            attributeName="opacity"
            duration={duration()}
            isActive={isActive()}
            onAnimationStart={handleAnimationStart}
            animationController={manager.factory}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });

        // Activate (and change the duration, mirroring the reference rerender).
        batch(() => {
          setIsActive(true);
          setDuration(300);
        });
        // v3.9 onStart fires synchronously, setting the style to the fresh `from`.
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(child).toHaveBeenLastCalledWith({
          opacity: "1",
          transition: "opacity 300ms ease",
        });

        await manager.completeAnimation();
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0",
          transition: "opacity 300ms ease",
        });
      });

      it("should restart animation when isActive changes to true via button click", async () => {
        const manager = new MockControllerAnimationManager("1");
        const child = vi.fn();
        const MyTestComponent = () => {
          const [isActive, setIsActive] = createSignal(false);
          return (
            <>
              <CSSTransitionAnimate
                animationId="1"
                from="1"
                to="0"
                attributeName="opacity"
                duration={500}
                isActive={isActive()}
                onAnimationStart={handleAnimationStart}
                animationController={manager.factory}
              >
                {child}
              </CSSTransitionAnimate>
              <button type="button" onClick={() => setIsActive(true)}>
                Start Animation
              </button>
            </>
          );
        };

        const rendered = render(() => <MyTestComponent />);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });
        expect(manager.isAnimating()).toBe(false);

        const button = rendered.getByText("Start Animation");
        fireEvent.click(button);
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(manager.isAnimating()).toBe(true);
        expect(child).toHaveBeenLastCalledWith({ opacity: "1", transition: "opacity 500ms ease" });

        await manager.completeAnimation();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0", transition: "opacity 500ms ease" });
      });

      it("should rerender with the final state when isActive is false", () => {
        const child = vi.fn();
        const [from, setFrom] = createSignal("1");
        const [to, setTo] = createSignal("0");

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from={from()}
            to={to()}
            attributeName="opacity"
            duration={500}
            isActive={false}
            onAnimationStart={handleAnimationStart}
            onAnimationEnd={handleAnimationEnd}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(handleAnimationEnd).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });

        // Mirror the reference rerender with new from/to (still inactive).
        setFrom("0.7");
        setTo("0.3");
        expect(child).toHaveBeenLastCalledWith({ opacity: "0.3" });
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(handleAnimationEnd).not.toHaveBeenCalled();
      });

      it("should not start animation on rerender if canBegin is false", () => {
        const manager = new MockControllerAnimationManager("1");
        const child = vi.fn();
        const [from, setFrom] = createSignal("1");
        const [to, setTo] = createSignal("0");

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from={from()}
            to={to()}
            attributeName="opacity"
            duration={500}
            canBegin={false}
            onAnimationStart={handleAnimationStart}
            animationController={manager.factory}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(manager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "1" });

        setFrom("0.7");
        setTo("0.3");
        // rerendering should not start the animation
        expect(manager.isAnimating()).toBe(false);
        // the child should now be rerendered with the fresh "from" state
        expect(child).toHaveBeenLastCalledWith({ opacity: "0.7" });
      });

      it("should start animation on rerender if canBegin changes from false to true", async () => {
        const manager = new MockControllerAnimationManager("1");
        const child = vi.fn();
        const [from, setFrom] = createSignal("1");
        const [to, setTo] = createSignal("0");
        const [canBegin, setCanBegin] = createSignal(false);

        render(() => (
          <CSSTransitionAnimate
            animationId="1"
            from={from()}
            to={to()}
            attributeName="opacity"
            duration={500}
            canBegin={canBegin()}
            onAnimationStart={handleAnimationStart}
            animationController={manager.factory}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "1" });

        setFrom("0.7");
        setTo("0.3");
        setCanBegin(true);
        // v3.9 onStart fires synchronously, setting the style to the FRESH `from` ('0.7'),
        // verifying the latest value is used — not the stale mount-time one.
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0.7",
          transition: "opacity 500ms ease",
        });

        await manager.completeAnimation();
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        // After the animation completes, we should receive the `to` value with transition applied.
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0.3",
          transition: "opacity 500ms ease",
        });
      });
    });
  });
});
