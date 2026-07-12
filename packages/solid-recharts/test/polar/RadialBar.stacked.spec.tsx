// Stacked RadialBar regression: two RadialBars sharing a stackId must render
// ADJACENT arcs spanning the full [0, total] numeric angle-axis domain
// (verified against released recharts: mobile [0,570]→[0°,56°], desktop
// [570,1830]→[56°,180°] with endAngle=180 and total=1830).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { RadialBarChart, RadialBar } from "../../src";

const data = [{ month: "january", desktop: 1260, mobile: 570 }];

describe("RadialBar stacking", () => {
  it("stacks two RadialBars into adjacent arcs over the [0, total] domain", () => {
    const { container } = render(() => (
      <RadialBarChart
        width={400}
        height={300}
        data={data}
        endAngle={180}
        innerRadius={80}
        outerRadius={110}
      >
        <RadialBar dataKey="mobile" stackId="a" isAnimationActive={false} />
        <RadialBar dataKey="desktop" stackId="a" isAnimationActive={false} />
      </RadialBarChart>
    ));
    flush();

    const sectors = Array.from(container.querySelectorAll(".recharts-sector"));
    expect(sectors).toHaveLength(2);
    // cx=200 cy=150, outerRadius=110. Convert each path's arc endpoints to angles.
    const angleOf = (x: number, y: number): number =>
      (Math.atan2(150 - y, x - 200) * 180) / Math.PI;
    // Take real path endpoints only: M/L coords and each arc command's final pair
    // (the A command's leading rx/ry/flags would otherwise pollute the angles).
    const angleRange = (d: string): [number, number] => {
      const angles: number[] = [];
      for (const m of d.matchAll(/([MLA])\s*([^MLAZ]+)/g)) {
        const nums = [...(m[2] ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((n) => Number(n[0]));
        const x = (m[1] === "A" ? nums[nums.length - 2] : nums[0]) ?? Number.NaN;
        const y = (m[1] === "A" ? nums[nums.length - 1] : nums[1]) ?? Number.NaN;
        if (Number.isFinite(x) && Number.isFinite(y)) {
          angles.push(angleOf(x, y));
        }
      }
      return [Math.min(...angles), Math.max(...angles)];
    };
    const [mobileStart, mobileEnd] = angleRange(sectors[0]?.getAttribute("d") ?? "");
    const [desktopStart, desktopEnd] = angleRange(sectors[1]?.getAttribute("d") ?? "");
    // mobile: [0, 570] of 1830 → 0°..56°
    expect(mobileStart).toBeCloseTo(0, 0);
    expect(mobileEnd).toBeCloseTo((570 / 1830) * 180, 0);
    // desktop: [570, 1830] → 56°..180°
    expect(desktopStart).toBeCloseTo((570 / 1830) * 180, 0);
    expect(desktopEnd).toBeCloseTo(180, 0);
  });
});
