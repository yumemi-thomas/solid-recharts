// Ported from recharts 3.8.1 src/animation/JavascriptAnimate.tsx (commit 7a23854).
//
// Solid 2.0 port of a React render-prop animation driver. Deviations:
//   - `resolveDefaultProps` → per-prop `?? default` accessors.
//   - `useState` → `createSignal`; `useRef` → a closure variable.
//   - `usePrefersReducedMotion()` now returns an Accessor → call it.
//   - the two `useEffect`s → two-arg `createEffect(compute, apply)`; the
//     animation-start effect returns its cleanup from the apply phase.
//   - `return children(style.t)` → a reactive `{props.children(style().t)}` so
//     the function child is re-invoked with the new time each frame (Solid
//     components run once, so the reactivity lives in the JSX expression).
import { createSignal, createEffect, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import configUpdate from "./configUpdate";
import { configEasing, type EasingInput } from "./easing";
import { type AnimationManager } from "./AnimationManager";
import { useAnimationManager } from "./useAnimationManager";
import { Global } from "../util/Global";
import { usePrefersReducedMotion } from "../util/usePrefersReducedMotion";

interface JavascriptAnimateProps {
  animationId: string;
  animationManager?: AnimationManager;
  duration?: number;
  begin?: number;
  easing?: EasingInput;
  isActive?: boolean | "auto";
  canBegin?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  children: (time: number) => JSX.Element;
}

type TimeAsObject = {
  t: number;
};

const from: TimeAsObject = { t: 0 };
const to: TimeAsObject = { t: 1 };

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

  const animationManager = useAnimationManager(props.animationId, props.animationManager);

  const [style, setStyle] = createSignal<TimeAsObject>(untrack(() => (isActive() ? from : to)));

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
      onAnimationStart: onAnimationStart(),
      onAnimationEnd: onAnimationEnd(),
      animationManager,
    }),
    (deps) => {
      if (!deps.active || !deps.canBegin) {
        return undefined;
      }

      const startAnimation = configUpdate<TimeAsObject>(
        from,
        to,
        configEasing(deps.easing),
        deps.duration,
        setStyle,
        deps.animationManager.getTimeoutController(),
      );

      let stopJSAnimation: (() => void) | null = null;
      const onAnimationActive = (): void => {
        stopJSAnimation = startAnimation();
      };

      deps.animationManager.start([
        deps.onAnimationStart,
        deps.begin,
        onAnimationActive,
        deps.duration,
        deps.onAnimationEnd,
      ]);

      return () => {
        deps.animationManager.stop();
        if (stopJSAnimation) {
          stopJSAnimation();
        }
        deps.onAnimationEnd();
      };
    },
  );

  return <>{props.children(style().t)}</>;
}
