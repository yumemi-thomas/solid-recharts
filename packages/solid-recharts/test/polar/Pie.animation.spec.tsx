// Subset port of recharts 3.8.1 test/polar/Pie/Pie.animation.spec.tsx (commit
// 7a23854). Proves the wired Pie ENTER animation: sectors grow from a collapsed
// (zero-sweep) state at t=0 to their byte-identical final geometry at t=1, driven
// deterministically by the ported MockProgressAnimationManager (injected via
// AnimationManagerContext). Pie's default isAnimationActive is "auto" (≈ active).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { PieChart, Pie } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

const SECTOR_SELECTOR = ".recharts-pie-sector path.recharts-sector";

// Same golden as PieChart.spec (cx 255 = props 250 + margin-left 5).
const pageDataSectorPaths = [
  "M 455,255 A 200,200,0, 0,0, 267.6184,55.3985 L 255,255 Z",
  "M 267.6184,55.3985 A 200,200,0, 0,0, 79.7896,158.5566 L 255,255 Z",
  "M 79.7896,158.5566 A 200,200,0, 0,0, 93.1078,372.4347 L 255,255 Z",
  "M 93.1078,372.4347 A 200,200,0, 0,0, 217.3458,451.4234 L 255,255 Z",
  "M 217.3458,451.4234 A 200,200,0, 0,0, 406.3627,385.7261 L 255,255 Z",
  "M 406.3627,385.7261 A 200,200,0, 0,0, 455,255.0003 L 255,255 Z",
];

function trim(s: string | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

describe("Pie animation", () => {
  it("grows the sectors from collapsed (t=0) to the final geometry (t=1)", async () => {
    const manager = new MockProgressAnimationManager("pie-anim");
    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <PieChart width={500} height={500}>
          <Pie cx={250} cy={250} innerRadius={0} outerRadius={200} data={PageData} dataKey="uv" />
        </PieChart>
      </AnimationManagerContext>
    ));
    flush();

    // t=0: every sector has zero sweep (start === end) → no sector path renders.
    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);

    // Drive to completion → t=1 → full, byte-identical sectors.
    await manager.completeAnimation();
    flush();

    const sectors = container.querySelectorAll(SECTOR_SELECTOR);
    expect(sectors).toHaveLength(PageData.length);
    expect([...sectors].map((s) => trim(s.getAttribute("d")))).toEqual(pageDataSectorPaths);
  });

  it("renders the final frame immediately when isAnimationActive is false", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
        />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(PageData.length);
  });
});
