// Ported from recharts 3.8.1 src/animation/useAnimationManager.tsx (commit 7a23854).
//
// Solid deviations: React context + `useMemo` → Solid `createContext` /
// `useContext`. The context default is the factory itself (a real value), so
// `useContext` returns it without throwing outside a provider. The hook runs
// once per component (no `useMemo` needed); it returns the manager from props
// if given, else builds one from the context factory.
import { createContext, useContext } from "solid-js";
import { AnimationManager } from "./AnimationManager";
import { createDefaultAnimationManager } from "./createDefaultAnimationManager";

export type AnimationManagerFactory = (animationId: string) => AnimationManager;

export const AnimationManagerContext = createContext<AnimationManagerFactory>(
  createDefaultAnimationManager,
);

export function useAnimationManager(
  animationId: string,
  animationManagerFromProps: AnimationManager | undefined,
): AnimationManager {
  const contextAnimationManager = useContext(AnimationManagerContext);
  return animationManagerFromProps ?? contextAnimationManager(animationId);
}
