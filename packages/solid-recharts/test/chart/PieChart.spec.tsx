// Subset port of recharts 3.8.1 test/polar/Pie/Pie.spec.tsx (commit 7a23854) —
// the payoff of the polar foundation: a <PieChart><Pie/> renders one sector per
// data slice with byte-identical geometry.
//
// Tier-A: assertions are byte-identical to recharts. The golden `d` strings are
// recharts' `pageDataSectorPaths` (Pie.spec.tsx:64-71); the trim helper matches
// the reference's `expectPieSectors`. `flush()` after render because the Pie
// registers via an effect and its sectors compute from the store.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { PieChart, Pie } from "../../src";
import { PageData } from "../_data";

// recharts test/helper/trim.ts — `d` is whitespace-insensitive per the SVG spec.
function trim(str: string | null | undefined): string {
  if (typeof str !== "string") {
    return "";
  }
  return str.replace(/^\s*/, "").replace(/\s*$/, "").replace(/\s+/g, " ");
}

// recharts test/helper/expectPieSectors.ts
const SECTOR_SELECTOR = ".recharts-pie-sector path.recharts-sector";

// Golden paths from recharts (Pie.spec.tsx `pageDataSectorPaths`). Note the
// rendered cx/cy is 255 (= props cx 250 + margin-left 5), matching recharts.
const pageDataSectorPaths = [
  "M 455,255 A 200,200,0, 0,0, 267.6184,55.3985 L 255,255 Z",
  "M 267.6184,55.3985 A 200,200,0, 0,0, 79.7896,158.5566 L 255,255 Z",
  "M 79.7896,158.5566 A 200,200,0, 0,0, 93.1078,372.4347 L 255,255 Z",
  "M 93.1078,372.4347 A 200,200,0, 0,0, 217.3458,451.4234 L 255,255 Z",
  "M 217.3458,451.4234 A 200,200,0, 0,0, 406.3627,385.7261 L 255,255 Z",
  "M 406.3627,385.7261 A 200,200,0, 0,0, 455,255.0003 L 255,255 Z",
];

describe("<PieChart />", () => {
  it("renders sectors in a simple Pie with exact geometry", () => {
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

    const sectors = container.querySelectorAll(SECTOR_SELECTOR);
    expect(sectors).toHaveLength(PageData.length);
    const actual = [...sectors].map((s) => trim(s.getAttribute("d")));
    expect(actual).toEqual(pageDataSectorPaths);
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          hide
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

    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);
  });

  it("renders a custom slice via the shape render prop (replacing the default sector)", () => {
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
          shape={(s) => <circle class="custom-slice" cx={s.cx} cy={s.cy} r={3} />}
        />
      </PieChart>
    ));
    flush();

    // No default sector paths; one custom circle per slice, inside each sector layer.
    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);
    const customs = container.querySelectorAll(".recharts-pie-sector circle.custom-slice");
    expect(customs).toHaveLength(PageData.length);
    // The render prop received the slice geometry (center == rendered cx/cy 255).
    expect(customs[0]!.getAttribute("cx")).toBe("255");
  });
});
