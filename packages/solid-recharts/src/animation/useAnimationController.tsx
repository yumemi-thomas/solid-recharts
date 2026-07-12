// Ported from recharts 3.9.0 src/animation/useAnimationController.tsx.
//
// Solid deviations: React `createContext`/`useContext`/`useMemo` → Solid
// `createContext`/`useContext`. The context default is a real value
// (`animationControllerImpl`), so `useContext` returns it without throwing
// outside a provider, and the hook runs once per component (no `useMemo`).
import { createContext, useContext } from "solid-js";
import type { AnimationController } from "./AnimationController";
import { animationControllerImpl } from "./AnimationControllerImpl";

const AnimationControllerContext = createContext<AnimationController>(animationControllerImpl);

/**
 * Allows overriding the default AnimationController that Recharts uses internally to drive animations.
 * The default uses a requestAnimationFrame-based TimeoutController and ticks animations as time moves forward.
 *
 * Useful for unit tests, for animating charts back and forth, or for driving animations from something
 * other than time (manual controls, page scroll, mouse movement, ...).
 *
 * @since 3.9
 */
// Solid 2.0: the context object itself is the provider component
// (`<Ctx value={…}>`); there is no `.Provider` as in React / Solid 1.x.
export const AnimationControllerProvider = AnimationControllerContext;

export function useAnimationController(
  animationControllerFromProps: AnimationController | undefined,
): AnimationController {
  const animationControllerFromContext = useContext(AnimationControllerContext);
  return animationControllerFromProps ?? animationControllerFromContext;
}
