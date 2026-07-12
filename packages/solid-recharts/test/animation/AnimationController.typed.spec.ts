/* eslint-disable @typescript-eslint/no-unused-vars */
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

function expectCorrectType(a: AnimationController) {}

describe("AnimationController types", () => {
  it("should compile when all types are defined explicitly", () => {
    const animationController: AnimationController = (
      timeoutController: TimeoutController,
      animationHandle: AnimationHandle,
      listener: OnAnimationStateUpdate,
    ): CancelableTimeout => {
      return noop;
    };
    expectCorrectType(animationController);
  });

  it("should compile when parameters are implicit", () => {
    const animationController: AnimationController = (
      timeoutController,
      animationHandle,
      listener,
    ) => {
      return noop;
    };
    expectCorrectType(animationController);
  });

  it("should infer", () => {
    const animationController = (
      timeoutController: TimeoutController,
      animationHandle: AnimationHandle,
      listener: OnAnimationStateUpdate,
    ): CancelableTimeout => {
      return noop;
    };
    expectCorrectType(animationController);
  });
});
