// Ported from recharts 3.8.1 src/animation/createDefaultAnimationManager.tsx (commit 7a23854).
import { AnimationManager, createAnimateManager } from "./AnimationManager";
import { RequestAnimationFrameTimeoutController } from "./timeoutController";

export function createDefaultAnimationManager(): AnimationManager {
  return createAnimateManager(new RequestAnimationFrameTimeoutController());
}
