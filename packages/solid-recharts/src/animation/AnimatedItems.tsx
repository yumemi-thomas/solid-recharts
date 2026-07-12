// Ported from recharts 3.9.0 src/animation/AnimatedItems.tsx.
//
// Solid 2.0 port of the reusable array-data animation wrapper shared by all the
// graphical items (Bar/Scatter/Funnel/Pie/Radar/RadialBar/Area/Line).
// Deviations from the React reference:
//   - React re-renders to advance frames; here the frame driver is `JavascriptAnimate`,
//     which holds a `t` signal and re-invokes the render-prop child reactively from JSX.
//   - `useRef` → a plain `{ current }` ref object ([[useAnimationStartSnapshot]]).
//   - `useState` → `createSignal`; `useMemo` → `createMemo`.
//   - The animation is driven by the v3.9 engine ([[AnimationHandle]] +
//     [[AnimationController]]) via `JavascriptAnimate`, so a test can inject a
//     deterministic controller through `AnimationControllerProvider`.
//   - A keyed `<Show when={animationId()}>` wraps the driver so a new animation
//     cycle remounts it cleanly (same NO_OWNER-safe shape Bar already used).
import { createMemo, createSignal, untrack, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAnimationId } from "../util/useAnimationId";
import { noop } from "../util/DataUtils";
import { useAnimationStartSnapshot, type MutableRef } from "./useAnimationStartSnapshot";
import {
  matchAnimationItems,
  matchByIndex,
  type AnimationItem,
  type AnimationMatchByProp,
} from "./matchBy";
import type { CartesianLayout, PolarLayout } from "../util/types";
import type { EasingInput } from "./easing";
import { JavascriptAnimate } from "./JavascriptAnimate";

/**
 * Tracks animation start/end and exposes an `isAnimating` accessor.
 */
export function useAnimationCallbacks(
  onAnimationStart?: () => void,
  onAnimationEnd?: () => void,
): {
  isAnimating: () => boolean;
  handleAnimationStart: () => void;
  handleAnimationEnd: () => void;
} {
  // ownedWrite: handleAnimationEnd can fire from the driver's effect-cleanup when
  // a mid-animation chart is disposed (route/soft navigation) — a legal teardown.
  const [isAnimating, setIsAnimating] = createSignal(false, { ownedWrite: true });

  const handleAnimationStart = (): void => {
    onAnimationStart?.();
    setIsAnimating(true);
  };

  const handleAnimationEnd = (): void => {
    onAnimationEnd?.();
    setIsAnimating(false);
  };

  return { isAnimating, handleAnimationStart, handleAnimationEnd };
}

/**
 * Interpolates tagged animation items at a given normalized time. Receives the
 * matched/added/removed changes and returns the items Recharts will render.
 *
 * @since 3.9
 */
export type AnimationInterpolateFn<ItemType, LayoutType extends CartesianLayout | PolarLayout> = (
  items: ReadonlyArray<AnimationItem<ItemType>> | null,
  animationElapsedTime: number,
  layout: LayoutType,
) => ReadonlyArray<ItemType>;

export type AnimatedItemsProps<ItemType, LayoutType extends CartesianLayout | PolarLayout> = {
  /** Opaque input to detect when a new animation should start (changes by reference → new cycle). */
  animationInput: unknown;
  /** Prefix for the generated animation ID. */
  animationIdPrefix: string;
  /** The target items to animate towards. */
  items: ReadonlyArray<ItemType> | undefined;
  /** Ref holding previous items — used to detect first render vs data update. */
  previousItemsRef: MutableRef<ReadonlyArray<ItemType> | null | undefined>;
  /** Whether animation is active. */
  isAnimationActive: boolean | "auto";
  /** Delay in ms before animation begins. */
  animationBegin: number;
  /** Duration of animation in ms. */
  animationDuration: number;
  /** Easing function or named easing. */
  animationEasing: EasingInput;
  /** Called when the animation begins. */
  onAnimationStart?: () => void;
  /** Called when the animation completes. */
  onAnimationEnd?: () => void;
  /** The interpolation function — either the default or user-provided. */
  animationInterpolateFn: AnimationInterpolateFn<ItemType, LayoutType>;
  /** Strategy for matching previous items to next items during animation. */
  animationMatchBy?: AnimationMatchByProp<ItemType>;
  /** Optional guard for committing the previous-items ref. Default: `(t) => t > 0`. */
  shouldUpdatePreviousRef?: (animationElapsedTime: number) => boolean;
  /** Render with interpolated items + animation state. */
  children: (
    items: ReadonlyArray<ItemType>,
    animationElapsedTime: number,
    isEntrance: boolean,
  ) => JSX.Element;
  layout: LayoutType;
};

/**
 * A reusable animation wrapper for array-based chart data.
 *
 * @since 3.9
 */
export function AnimatedItems<ItemType, LayoutType extends CartesianLayout | PolarLayout>(
  props: AnimatedItemsProps<ItemType, LayoutType>,
): JSX.Element {
  const animationId = useAnimationId(() => props.animationInput, props.animationIdPrefix);
  const snapshot = useAnimationStartSnapshot<ReadonlyArray<ItemType> | null | undefined>(
    animationId,
    props.previousItemsRef,
  );

  const rawPrevItems = createMemo<ReadonlyArray<ItemType> | null>(
    () => snapshot.startValue() ?? null,
  );
  const animationItems = createMemo<ReadonlyArray<AnimationItem<ItemType>> | null>(() =>
    matchAnimationItems(rawPrevItems(), props.items, props.animationMatchBy ?? matchByIndex),
  );

  return (
    <Show when={animationId()} keyed>
      {(keyedAnimationId) => (
        <JavascriptAnimate
          animationId={keyedAnimationId}
          duration={props.animationDuration}
          begin={props.animationBegin}
          easing={props.animationEasing}
          isActive={props.isAnimationActive}
          onAnimationStart={props.onAnimationStart ?? noop}
          onAnimationEnd={props.onAnimationEnd ?? noop}
        >
          {(animationElapsedTime) => {
            const items = props.items;
            // Match upstream's OBSERVABLE `isEntrance`: true only DURING the entrance
            // animation (no prev items AND not yet settled). React's snapshot refreshes
            // the frozen start value at t=1 so its isEntrance flips false on the settled
            // frame; our memo-based snapshot can't, so we encode that result here with
            // `< 1` instead — keeping every consumer (and future ones) in parity without
            // a per-consumer `&& t < 1` guard. (See useAnimationStartSnapshot.)
            const isEntrance = rawPrevItems() == null && animationElapsedTime < 1;
            const stepData =
              items == null
                ? items
                : props.animationInterpolateFn(
                    animationItems(),
                    animationElapsedTime,
                    untrack(() => props.layout),
                  );
            const canUpdate = props.shouldUpdatePreviousRef
              ? props.shouldUpdatePreviousRef(animationElapsedTime)
              : animationElapsedTime > 0;
            snapshot.syncStepValue(stepData, animationElapsedTime, canUpdate);
            if (stepData == null) {
              return null;
            }
            return props.children(stepData, animationElapsedTime, isEntrance);
          }}
        </JavascriptAnimate>
      )}
    </Show>
  );
}
