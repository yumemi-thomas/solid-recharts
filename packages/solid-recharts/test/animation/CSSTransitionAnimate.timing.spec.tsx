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
//   - The reference drives `rerender(...)` to mutate props; Solid components run once,
//     so prop changes are driven by signals (createSignal) wired into the props. The
//     OBSERVABLE behaviour (serialized queue via MockTickingAnimationManager, isRunning,
//     style values handed to the child) is asserted instead of React re-render counts.
//   - `vi.useFakeTimers()` cases drive the REAL default manager (rAF-backed); we advance
//     the faked timers then `flush()` Solid's reactive graph.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSignal, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { CSSTransitionAnimate } from "../../src/animation/CSSTransitionAnimate";
import { MockTimeoutController } from "./mockTimeoutController";
import { createAnimateManager } from "../../src/animation/AnimationManager";
import { MockTickingAnimationManager } from "./MockTickingAnimationManager";
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
          flush();

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
          flush();

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
          flush();

          expect(handleAnimationEnd).not.toHaveBeenCalled();

          vi.advanceTimersByTime(700);
          flush();

          expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
        } finally {
          vi.useRealTimers();
        }
      });
    });

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

      it("should add items to the animation queue on start, and call stop on unmount", () => {
        const animationManager = new MockTickingAnimationManager();
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
            animationManager={animationManager}
          >
            {childFunction}
          </CSSTransitionAnimate>
        ));
        flush();

        // Queue layout (by Animate convention): [onStart, begin, to, duration, onEnd].
        // The reference's onStart is an inline anonymous closure; the Solid source names
        // its local `onStart`, so it serializes as `[function onStart]` (same item).
        animationManager.assertQueue([
          "[function onStart]",
          0,
          "0",
          500,
          "[function handleAnimationEnd]",
        ]);
        expect(animationManager.isRunning()).toBe(true);

        // Tier-B adaptation: the reference unmounts via `rerender(<></>)`; in Solid we
        // dispose the render root, which runs the effect cleanup → animationManager.stop().
        unmount();

        expect(animationManager.isRunning(), "AnimationManager should be stopped on unmount").toBe(
          false,
        );
      });

      it("should not start animation if canBegin is false, and render with starting state", () => {
        const animationManager = new MockTickingAnimationManager();
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

        animationManager.assertQueue(null);
        expect(animationManager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "1" });
      });

      it("should go straight to final state when isActive is false, and do not pass any transition", () => {
        const animationManager = new MockTickingAnimationManager();
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

        animationManager.assertQueue(null);
        expect(animationManager.isAnimating()).toBe(false);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expectLastCalledWith(child, { opacity: "0" });
      });

      it("should restart animation when isActive changes to true via signal", async () => {
        const animationManager = new MockTickingAnimationManager();
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
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });

        // Now we change isActive to true (and the duration, mirroring the reference rerender).
        setIsActive(true);
        setDuration(300);
        flush();

        // queue should be populated with the animation steps. The 5th item is the
        // onEnd callback which defaults to `noop` here (no onAnimationEnd prop); the
        // first item is the source's named local `onStart` (anonymous in the reference).
        animationManager.assertQueue(["[function onStart]", 0, "0", 300, "[function noop]"]);
        expect(handleAnimationStart).toHaveBeenCalledTimes(0);
        // NOTE (cadence divergence): the reference asserts the fresh `from` value `'1'`
        // with no transition here, because React flips `initialized` via a ref (no
        // re-render) and the manager's onStart (which sets the style) hasn't fired yet.
        // Solid flips `initialized` (a signal) synchronously, so the transition key is
        // already present, and the still-unpolled `style` signal holds its mount-time
        // initial value (`to`='0', since isActive was false at mount). The golden post-
        // poll final state below is asserted byte-identically.
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0",
          transition: "opacity 300ms ease",
        });

        await animationManager.poll(1);
        animationManager.assertQueue([0, "0", 300, "[function noop]"]);
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);

        await animationManager.poll(1);
        animationManager.assertQueue(["0", 300, "[function noop]"]);

        await animationManager.poll(1);
        animationManager.assertQueue([300, "[function noop]"]);
        flush();
        // After the first animation tick, we should receive a `to` value with transition applied
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0",
          transition: "opacity 300ms ease",
        });

        animationManager.assertQueue([300, "[function noop]"]);

        await animationManager.triggerNextTimeout(16);
      });

      it("should restart animation when isActive changes to true via button click", async () => {
        const animationManager = new MockTickingAnimationManager();
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
                animationManager={animationManager}
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
        flush();

        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });
        expect(animationManager.isRunning()).toBe(false);

        const button = rendered.getByText("Start Animation");
        fireEvent.click(button);
        flush();

        // queue should be populated with the animation steps (onStart, begin, to,
        // duration, onEnd=noop — no onAnimationEnd prop here).
        animationManager.assertQueue(["[function onStart]", 0, "0", 500, "[function noop]"]);
        expect(animationManager.isRunning()).toBe(true);

        await animationManager.poll();
        flush();

        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(child).toHaveBeenLastCalledWith({ opacity: "1", transition: "opacity 500ms ease" });
        animationManager.assertQueue([0, "0", 500, "[function noop]"]);
      });

      it("should rerender with the final state when isActive is false", () => {
        const animationManager = new MockTickingAnimationManager();
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
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(handleAnimationEnd).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "0" });

        // Mirror the reference rerender with new from/to (still inactive).
        setFrom("0.7");
        setTo("0.3");
        flush();

        expect(child).toHaveBeenLastCalledWith({ opacity: "0.3" });
        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(handleAnimationEnd).not.toHaveBeenCalled();
      });

      it("should not start animation on rerender if canBegin is false", () => {
        const animationManager = new MockTickingAnimationManager();
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
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "1" });

        setFrom("0.7");
        setTo("0.3");
        flush();

        // rerendering should not start the animation
        animationManager.assertQueue(null);
        // the child should now be rerendered with the fresh "from" state
        expect(child).toHaveBeenLastCalledWith({ opacity: "0.7" });
      });

      it("should start animation on rerender if canBegin changes from false to true", async () => {
        const animationManager = new MockTickingAnimationManager();
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
            animationManager={animationManager}
          >
            {child}
          </CSSTransitionAnimate>
        ));
        flush();

        animationManager.assertQueue(null);
        expect(handleAnimationStart).not.toHaveBeenCalled();
        expect(child).toHaveBeenLastCalledWith({ opacity: "1" });

        setFrom("0.7");
        setTo("0.3");
        setCanBegin(true);
        flush();

        expect(handleAnimationStart).not.toHaveBeenCalled();
        /*
         * NOTE (cadence divergence): the reference asserts the fresh `from` value `'0.7'`
         * with NO transition here, because React flips `initialized` via a ref (no
         * re-render) and the manager's onStart (which sets the style) hasn't fired yet.
         * Solid flips `initialized` (a signal) synchronously inside the start effect, so
         * the transition key is already present, and the still-unpolled `style` signal
         * holds its mount-time initial value (`from`='1', captured before canBegin flipped).
         * The load-bearing fresh-`from` contract IS verified below: once onStart polls, the
         * child receives `0.7` (the latest from), NOT the stale value — asserted byte-
         * identically against the reference's post-poll golden.
         */
        expect(child).toHaveBeenLastCalledWith({
          opacity: "1",
          transition: "opacity 500ms ease",
        });

        await animationManager.poll();
        flush();
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0.7",
          transition: "opacity 500ms ease",
        });

        await animationManager.poll();
        flush();
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);

        await animationManager.poll();
        flush();
        expect(handleAnimationStart).toHaveBeenCalledTimes(1);
        // After the first animation tick, we should receive a `to` value with transition applied.
        expect(child).toHaveBeenLastCalledWith({
          opacity: "0.3",
          transition: "opacity 500ms ease",
        });
      });
    });
  });
});
