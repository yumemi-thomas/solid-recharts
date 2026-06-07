// Subset port of recharts 3.8.1 test/cartesian/Line.animation.spec.tsx (commit
// 7a23854). Proves the wired Line "draw" animation: the curve's `d` is unchanged
// (regression-safe), and stroke-dasharray reveals it from 0 → full as the ported
// MockProgressAnimationManager drives t to 1. getTotalLength is mocked on
// SVGElement.prototype (jsdom lacks it).
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { LineChart, Line } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

type WithTotalLength = { getTotalLength?: () => number };

describe("Line animation", () => {
  let original: (() => number) | undefined;
  beforeAll(() => {
    const proto = SVGElement.prototype as WithTotalLength;
    original = proto.getTotalLength;
    proto.getTotalLength = (): number => 100;
  });
  afterAll(() => {
    (SVGElement.prototype as WithTotalLength).getTotalLength = original;
  });

  it("draws the curve via stroke-dasharray (d unchanged) to fully revealed at t=1", async () => {
    const manager = new MockProgressAnimationManager("line-anim");
    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <LineChart width={400} height={400} data={PageData}>
          <Line dataKey="uv" />
        </LineChart>
      </AnimationManagerContext>
    ));
    flush();

    const curve = container.querySelector(".recharts-line-curve");
    expect(curve).not.toBeNull();
    const dInitial = curve?.getAttribute("d");
    expect(dInitial).toBeTruthy();
    // Mid-draw: stroke-dasharray reveals only part of the line (starts at "0px").
    expect(curve?.getAttribute("stroke-dasharray") ?? "").toMatch(/^0px/);

    await manager.completeAnimation();
    flush();

    // Fully drawn: the visible length equals the total length.
    expect(container.querySelector(".recharts-line-curve")?.getAttribute("stroke-dasharray")).toBe(
      "100px 100px",
    );
    // The path geometry never changed during the animation.
    expect(container.querySelector(".recharts-line-curve")?.getAttribute("d")).toBe(dInitial);
  });
});
