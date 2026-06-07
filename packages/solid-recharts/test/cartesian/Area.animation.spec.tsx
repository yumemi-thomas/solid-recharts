// Subset port of recharts 3.8.1 test/cartesian/Area.animation.spec.tsx (commit
// 7a23854). Proves the wired Area ENTER animation: a clip-rect grows to reveal
// the area (the path `d` is unchanged — regression-safe), driven by the ported
// MockProgressAnimationManager.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { AreaChart, Area } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

describe("Area animation", () => {
  it("reveals the area via a growing clip-rect (path d unchanged)", async () => {
    const manager = new MockProgressAnimationManager("area-anim");
    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <AreaChart width={400} height={400} data={PageData}>
          <Area dataKey="uv" />
        </AreaChart>
      </AnimationManagerContext>
    ));
    flush();

    const areaPath = container.querySelector(".recharts-area-area");
    expect(areaPath).not.toBeNull();
    const dInitial = areaPath?.getAttribute("d");
    expect(dInitial).toBeTruthy();

    // t=0: the clip-rect has zero width (area fully hidden).
    const clipRect = container.querySelector(".recharts-area clipPath rect");
    expect(clipRect).not.toBeNull();
    expect(Number(clipRect?.getAttribute("width"))).toBe(0);

    await manager.completeAnimation();
    flush();

    // t=1: the clip-rect has grown (area revealed), and the path never changed.
    expect(
      Number(container.querySelector(".recharts-area clipPath rect")?.getAttribute("width")),
    ).toBeGreaterThan(0);
    expect(container.querySelector(".recharts-area-area")?.getAttribute("d")).toBe(dInitial);
  });
});
