// Ported from recharts 3.9.0 src/animation/CSSTransitionAnimate.tsx.
//
// Solid 2.0 port of the CSS-transition render-prop driver, on the v3.9 engine
// (CSSTransitionAnimation handle + injectable AnimationController). Deviations:
//   - `resolveDefaultProps` → per-prop `?? default` accessors.
//   - `useState` → `createSignal`; the `initialized` `useRef` → a `createSignal`
//     flipped in the start effect and read reactively in the render memo.
//   - `usePrefersReducedMotion()` returns an Accessor → call it.
//   - the `useEffect` → two-arg `createEffect(compute, apply)`; cleanup returned
//     from the apply phase.
//   - `return children(style)` → a reactive `<>{props.children(styleObject())}</>`.
//   - the children style is a `Record<string, string | undefined>`: the dynamic
//     `[attributeName]` key can't be typed against Solid's stricter `JSX.CSSProperties`,
//     so consumers read the known keys (e.g. `transform`/`transition`) into their style.
import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import { getTransitionVal } from "./util";
import { Global } from "../util/Global";
import { usePrefersReducedMotion } from "../util/usePrefersReducedMotion";
import { CSSTransitionAnimation } from "./AnimationHandle";
import type { EasingInput, NamedBezier } from "./easing";
import { RequestAnimationFrameTimeoutController } from "./timeoutController";
import type { AnimationController } from "./AnimationController";
import { useAnimationController } from "./useAnimationController";

/** The style object handed to the render-prop child (dynamic `[attributeName]` key). */
export type CSSTransitionStyle = Record<string, string | undefined>;

/**
 * A CSS transition can only use a named/cubic-bezier easing — `spring` and custom
 * function easings have no CSS equivalent, so they fall back to `ease`.
 */
export function extractCssEasing(easingInput: EasingInput): NamedBezier {
  if (easingInput === "spring" || typeof easingInput !== "string") {
    return "ease";
  }
  return easingInput;
}

interface CSSTransitionAnimateProps {
  animationId: string;
  animationController?: AnimationController;
  duration?: number;
  begin?: number;
  easing?: EasingInput;
  isActive?: boolean | "auto";
  canBegin?: boolean;
  from: string;
  to: string;
  attributeName: string;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  children: (style: CSSTransitionStyle) => JSX.Element;
}

export function CSSTransitionAnimate(props: CSSTransitionAnimateProps): JSX.Element {
  const duration = (): number => props.duration ?? 1000;
  const easing = (): NamedBezier => extractCssEasing(props.easing ?? "ease");
  const begin = (): number => props.begin ?? 0;
  const canBegin = (): boolean => props.canBegin ?? true;
  const isActiveProp = (): boolean | "auto" => props.isActive ?? true;
  const onAnimationStartProp = (): (() => void) => props.onAnimationStart ?? noop;
  const onAnimationEnd = (): (() => void) => props.onAnimationEnd ?? noop;

  const prefersReducedMotion = usePrefersReducedMotion();

  const isActive = (): boolean => {
    const active = isActiveProp();
    return active === "auto" ? !Global.isSsr && !prefersReducedMotion() : active;
  };

  const animationController = useAnimationController(props.animationController);

  const [style, setStyle] = createSignal<string>(
    untrack(() => (isActive() ? props.from : props.to)),
  );
  const [initialized, setInitialized] = createSignal(false);

  // Start (and clean up) the animation when its inputs change. `onStart` closes over
  // the already-read `deps.from` (reading props.from when the controller invokes it
  // later would be an untracked read).
  createEffect(
    () => ({
      active: isActive(),
      canBegin: canBegin(),
      duration: duration(),
      easing: easing(),
      begin: begin(),
      from: props.from,
      to: props.to,
      animationId: props.animationId,
      attributeName: props.attributeName,
      onStart: onAnimationStartProp(),
      onEnd: onAnimationEnd(),
      controller: animationController,
    }),
    (deps) => {
      if (!deps.active || !deps.canBegin) {
        return undefined;
      }
      setInitialized(true);
      const onStart = (): void => {
        setStyle(deps.from);
        deps.onStart();
      };
      const timeoutController = new RequestAnimationFrameTimeoutController();
      const animation = new CSSTransitionAnimation({
        animationId: deps.animationId + deps.attributeName,
        easing: deps.easing,
        animationDuration: deps.duration,
        animationBegin: deps.begin,
        onAnimationStart: onStart,
        onAnimationEnd: deps.onEnd,
        from: deps.from,
        to: deps.to,
      });
      return deps.controller(timeoutController, animation, (next) => setStyle(String(next)));
    },
  );

  // All reactive reads live in this memo (a tracking scope); the JSX insert below
  // re-invokes the render-prop child whenever the resolved style changes.
  const styleObject = createMemo<CSSTransitionStyle>(() => {
    if (!isActive()) {
      // isActive=false: render the final style immediately, no transition.
      return { [props.attributeName]: props.to };
    }
    if (!canBegin()) {
      return { [props.attributeName]: props.from };
    }
    if (initialized()) {
      return {
        transition: getTransitionVal([props.attributeName], duration(), easing()),
        [props.attributeName]: style(),
      };
    }
    return { [props.attributeName]: props.from };
  });

  return <>{props.children(styleObject())}</>;
}
