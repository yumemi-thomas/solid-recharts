// Ported from recharts 3.8.1 src/animation/AnimationManager.ts (commit 7a23854).
// Pure animation orchestration logic — no framework surface — so behavior is
// byte-identical to recharts. Deviations from the reference are limited to
// satisfying this repo's type discipline (no `any` / no `as` except `as const` /
// no non-null `!`; noUncheckedIndexedAccess narrowed with explicit checks).

import { CancelableTimeout, TimeoutController } from "./timeoutController";
import { StartAnimationFunction } from "./configUpdate";

export type ReactSmoothStyle = string | Record<string, unknown>;

/**
 * Represents a single item in the ReactSmoothQueue.
 * The item can be:
 * - A number representing a delay in milliseconds.
 * - An object representing a style change
 * - A StartAnimationFunction that starts eased transition and calls different render
 *      because of course in Recharts we have to have three ways to do everything
 * - An arbitrary function to be executed
 */
export type ReactSmoothQueueItem =
  | number
  | ReactSmoothStyle
  | StartAnimationFunction
  | (() => void);

export type ReactSmoothQueue = ReadonlyArray<ReactSmoothQueueItem>;

export type HandleChangeFn = (currentStyle: ReactSmoothStyle) => null | void;

export type AnimationManager = {
  stop: () => void;
  start: (style: ReactSmoothQueue) => void;
  subscribe: (handleChange: (style: ReactSmoothStyle) => void) => () => void;
  getTimeoutController(): TimeoutController;
};

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createAnimateManager(timeoutController: TimeoutController): AnimationManager {
  let _currStyle: ReactSmoothQueueItem | ReactSmoothQueue | undefined;
  let handleChange: HandleChangeFn = () => null;
  let shouldStop = false;
  let cancelTimeout: CancelableTimeout | null = null;

  const setStyle = (_style: ReactSmoothQueueItem | ReactSmoothQueue | undefined) => {
    if (shouldStop) {
      return;
    }

    if (Array.isArray(_style)) {
      if (!_style.length) {
        return;
      }

      const styles: ReactSmoothQueue = _style;
      const [curr, ...restStyles] = styles;

      if (typeof curr === "number") {
        cancelTimeout = timeoutController.setTimeout(setStyle.bind(null, restStyles), curr);

        return;
      }

      setStyle(curr);
      cancelTimeout = timeoutController.setTimeout(setStyle.bind(null, restStyles));
      return;
    }

    if (typeof _style === "string") {
      _currStyle = _style;
      handleChange(_style);
    }

    // `Array.isArray` does not narrow a `ReadonlyArray` out of the union under
    // our strict TS (TS#17002), so the array early-return above leaves
    // `ReactSmoothQueue` in `_style`'s type here. Use an explicit guard to reach
    // the plain style-object case without an `as` cast.
    if (isStyleObject(_style)) {
      _currStyle = _style;
      handleChange(_style);
    }

    if (typeof _style === "function") {
      _style();
    }
  };

  return {
    stop: () => {
      shouldStop = true;
    },
    start: (style: ReactSmoothQueue) => {
      shouldStop = false;
      if (cancelTimeout) {
        cancelTimeout();
        cancelTimeout = null;
      }
      setStyle(style);
    },
    subscribe: (_handleChange: HandleChangeFn) => {
      handleChange = _handleChange;

      return () => {
        handleChange = () => null;
      };
    },
    getTimeoutController: () => timeoutController,
  } satisfies AnimationManager;
}
