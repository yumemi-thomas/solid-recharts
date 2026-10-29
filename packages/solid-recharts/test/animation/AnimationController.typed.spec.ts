// Ported from recharts 3.9.0 test/animation/AnimationController.typed.spec.ts.
//
// A .typed spec: the POINT is TYPE checking under `tsc --noEmit` — the it() bodies
// only need to compile. PERMANENT-N/A (3 of 6): the upstream `useCallback` inference
// cases — Solid has no useCallback (functions are stable by construction); the plain
// const-annotation cases below cover the same inference surface.
import { describe, it } from "vitest";
import type {
  AnimationController,
  AnimationHandle,
  OnAnimationStateUpdate,
  TimeoutController,
  CancelableTimeout,
} from "../../src";
import { noop } from "../../src/util/DataUtils";

function expectCorrectType(_controller: AnimationController) {}

describe("AnimationController types", () => {
  it("should compile when all types are defined explicitly", () => {
    const animationController: AnimationController = (
      _timeoutController: TimeoutController,
      _animationHandle: AnimationHandle,
      _listener: OnAnimationStateUpdate,
    ): CancelableTimeout => {
      return noop;
    };
    expectCorrectType(animationController);
  });

  it("should compile when parameters are implicit", () => {
    const animationController: AnimationController = (
      _timeoutController,
      _animationHandle,
      _listener,
    ) => {
      return noop;
    };
    expectCorrectType(animationController);
  });

  it("should infer", () => {
    const animationController = (
      _timeoutController: TimeoutController,
      _animationHandle: AnimationHandle,
      _listener: OnAnimationStateUpdate,
    ): CancelableTimeout => {
      return noop;
    };
    expectCorrectType(animationController);
  });
});
