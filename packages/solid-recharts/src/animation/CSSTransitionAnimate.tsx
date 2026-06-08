// Ported from recharts 3.8.1 src/animation/CSSTransitionAnimate.tsx (commit 7a23854).
//
// Solid 2.0 port of a CSS-transition render-prop driver — sibling of JavascriptAnimate,
// which it mirrors. Deviations:
//   - `resolveDefaultProps` → per-prop `?? default` accessors.
//   - `useState` → `createSignal`; the `initialized` `useRef` → a `createSignal` flag
//     flipped inside the start effect and read reactively in the render.
//   - `usePrefersReducedMotion()` returns an Accessor → call it.
//   - the `useEffect` → two-arg `createEffect(compute, apply)`; the cleanup is returned
//     from the apply phase.
//   - `return children(style)` → a reactive `<>{renderBody()}</>` so the function child
//     re-runs as the style signal / `initialized` flag change (Solid components run once).
//   - the children style is a `Record<string, string | undefined>`: the dynamic
//     `[attributeName]` key can't be typed against Solid's stricter `JSX.CSSProperties`,
//     so consumers read the known keys (e.g. `transform`/`transition`) into their style.
import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { noop } from "../util/DataUtils";
import { type AnimationManager, type ReactSmoothStyle } from "./AnimationManager";
import { useAnimationManager } from "./useAnimationManager";
import { getTransitionVal } from "./util";
import { Global } from "../util/Global";
import { usePrefersReducedMotion } from "../util/usePrefersReducedMotion";

/** The style object handed to the render-prop child (dynamic `[attributeName]` key). */
export type CSSTransitionStyle = Record<string, string | undefined>;

interface CSSTransitionAnimateProps {
  animationId: string;
  animationManager?: AnimationManager;
  duration?: number;
  begin?: number;
  easing?: string;
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
  const easing = (): string => props.easing ?? "ease";
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

  // The manager is created once at setup; untrack the one-time prop reads (the id
  // is not meant to be reactive — matches JavascriptAnimate's single-read usage).
  const animationManager = untrack(() =>
    useAnimationManager(props.animationId + props.attributeName, props.animationManager),
  );

  const [style, setStyle] = createSignal<ReactSmoothStyle>(
    untrack(() => (isActive() ? props.from : props.to)),
  );
  const [initialized, setInitialized] = createSignal(false);

  // Start (and clean up) the animation when its inputs change. `onStart` is defined
  // here so it closes over the already-read `deps.from` (reading props.from when the
  // animation manager invokes it later would be an untracked read).
  createEffect(
    () => ({
      active: isActive(),
      canBegin: canBegin(),
      duration: duration(),
      begin: begin(),
      from: props.from,
      to: props.to,
      onStart: onAnimationStartProp(),
      onEnd: onAnimationEnd(),
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
      const unsubscribe = animationManager.subscribe((next) => setStyle(next));
      animationManager.start([onStart, deps.begin, deps.to, deps.duration, deps.onEnd]);
      return () => {
        animationManager.stop();
        unsubscribe();
        deps.onEnd();
      };
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
      const s = style();
      return {
        transition: getTransitionVal([props.attributeName], duration(), easing()),
        [props.attributeName]: typeof s === "string" ? s : "",
      };
    }
    return { [props.attributeName]: props.from };
  });

  return <>{props.children(styleObject())}</>;
}
