// Subset port of recharts 3.8.1 test/polar/RadialBar/RadialBar.animation.spec.tsx
// (commit 7a23854). Proves the wired RadialBar ENTER animation: each ring sweeps
// from its start angle (t=0 → zero-sweep, no path) to full (t=1), driven by the
// ported MockProgressAnimationManager.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { RadialBarChart, RadialBar } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

const SECTOR = ".recharts-radial-bar-sectors .recharts-radial-bar-sector";

describe("RadialBar animation", () => {
  it("grows the rings from zero-sweep (t=0) to full (t=1)", async () => {
    const manager = new MockProgressAnimationManager("radialbar-anim");
    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" fill="#8884d8" />
        </RadialBarChart>
      </AnimationManagerContext>
    ));
    flush();

    // t=0: every ring has zero sweep (endAngle === startAngle) → no sector path.
    expect(container.querySelectorAll(SECTOR)).toHaveLength(0);

    await manager.completeAnimation();
    flush();
    expect(container.querySelectorAll(SECTOR)).toHaveLength(PageData.length);
  });
});
