// Subset port of recharts 3.8.1 test/cartesian/Bar.animation.spec.tsx (commit
// 7a23854). Proves the wired Bar ENTER animation: rectangles grow from the
// baseline (t=0 → zero height, no rect) to full (t=1), driven by the ported
// MockProgressAnimationManager.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { BarChart, Bar } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

const RECT = ".recharts-bar .recharts-bar-rectangle path.recharts-rectangle";

describe("Bar animation", () => {
  it("grows the rectangles from the baseline (t=0) to full (t=1)", async () => {
    const manager = new MockProgressAnimationManager("bar-anim");
    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <BarChart
          width={400}
          height={400}
          data={PageData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <Bar dataKey="uv" fill="#ff7300" />
        </BarChart>
      </AnimationManagerContext>
    ));
    flush();

    // t=0: every bar has zero height → no rectangle renders.
    expect(container.querySelectorAll(RECT)).toHaveLength(0);

    await manager.completeAnimation();
    flush();
    expect(container.querySelectorAll(RECT)).toHaveLength(PageData.length);
  });
});
