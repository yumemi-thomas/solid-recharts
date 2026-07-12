// Ported from recharts 3.9.0 src/animation/JavascriptAnimate.tsx.
//
// Solid 2.0 port of the JavaScript render-prop animation driver, on the v3.9 engine
// (JavascriptAnimation handle + injectable AnimationController). Deviations:
//   - `resolveDefaultProps` → per-prop `?? default` accessors.
//   - `useState` → `createSignal`; the two `useEffect`s → two-arg
//     `createEffect(compute, apply)`; the start effect returns its cleanup.
//   - `usePrefersReducedMotion()` returns an Accessor → call it.
//   - `return children(Number(style))` → a reactive `{props.children(...)}` so the
//     function child re-runs each frame (Solid components run once).
// This is the same driver `AnimatedItems` uses; standalone consumers are the shape
// update-tweens (`Rectangle`, `Trapezoid`).
import { createSignal, createEffect, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import { createEasingFunction, type EasingInput } from "./easing";
import { Global } from "../util/Global";
import { usePrefersReducedMotion } from "../util/usePrefersReducedMotion";
import { JavascriptAnimation } from "./AnimationHandle";
import { RequestAnimationFrameTimeoutController } from "./timeoutController";
import type { AnimationController } from "./AnimationController";
import { useAnimationController } from "./useAnimationController";

interface JavascriptAnimateProps {
  animationId: string;
  animationController?: AnimationController;
  duration?: number;
  begin?: number;
  easing?: EasingInput;
  isActive?: boolean | "auto";
  canBegin?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  children: (time: number) => JSX.Element;
}

const from = 0;
const to = 1;

export function JavascriptAnimate(props: JavascriptAnimateProps): JSX.Element {
  const duration = (): number => props.duration ?? 1000;
  const easing = (): EasingInput => props.easing ?? "ease";
  const begin = (): number => props.begin ?? 0;
  const canBegin = (): boolean => props.canBegin ?? true;
  const isActiveProp = (): boolean | "auto" => props.isActive ?? true;
  const onAnimationStart = (): (() => void) => props.onAnimationStart ?? noop;
  const onAnimationEnd = (): (() => void) => props.onAnimationEnd ?? noop;

  const prefersReducedMotion = usePrefersReducedMotion();

  const isActive = (): boolean => {
    const active = isActiveProp();
    return active === "auto" ? !Global.isSsr && !prefersReducedMotion() : active;
  };

  const animationController = useAnimationController(props.animationController);

  const [style, setStyle] = createSignal<number | string>(untrack(() => (isActive() ? from : to)));

  // When the animation is not active, jump straight to the final state.
  createEffect(
    () => isActive(),
    (active) => {
      if (!active) {
        setStyle(to);
      }
    },
  );

  // Start (and clean up) the animation when its inputs change.
  createEffect(
    () => ({
      active: isActive(),
      canBegin: canBegin(),
      duration: duration(),
      easing: easing(),
      begin: begin(),
      animationId: props.animationId,
      onAnimationStart: onAnimationStart(),
      onAnimationEnd: onAnimationEnd(),
      controller: animationController,
    }),
    (deps) => {
      if (!deps.active || !deps.canBegin) {
        return undefined;
      }
      const easingFunction = createEasingFunction(deps.easing);
      if (easingFunction == null) {
        return undefined;
      }
      const timeoutController = new RequestAnimationFrameTimeoutController();
      const animation = new JavascriptAnimation({
        animationId: deps.animationId,
        easing: easingFunction,
        animationDuration: deps.duration,
        animationBegin: deps.begin,
        onAnimationStart: deps.onAnimationStart,
        onAnimationEnd: deps.onAnimationEnd,
        from,
        to,
      });
      return deps.controller(timeoutController, animation, setStyle);
    },
  );

  return <>{props.children(Number(style()))}</>;
}
