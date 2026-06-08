// Ported from recharts 3.8.1 test/cartesian/Funnel.animation.spec.tsx.
//
// SRC GAP: the Solid <Funnel> does NOT animate yet — it renders the settled
// trapezoids (computeFunnelTrapezoids → static <Trapezoid>), and is not wrapped
// in JavascriptAnimate/CSSTransitionAnimate (documented as DEFERRED in
// src/cartesian/Funnel.tsx). The Solid createSelectorTestCase also exposes no
// `animationManager`. So every reference case that drives the animation
// (initial animation, dataKey change, key re-animation, data-array change,
// hide-during-animation) is UNPORTABLE today and reported in `blocked`.
//
// The ONE impl-ready case is isAnimationActive=false, which expects the settled
// trapezoid paths — exactly what the static impl already produces. Tier-A path
// strings ported byte-identical.
import { describe, expect, it } from "vitest";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { Funnel, FunnelChart } from "../../src";
import { PageData } from "../_data";

const smallerData = PageData.slice(0, 2);

function getFunnelPaths(container: Element): ReadonlyArray<SVGPathElement> {
  return Array.from(container.querySelectorAll(".recharts-funnel-trapezoid path"));
}

function getFunnelPathStrings(container: Element): ReadonlyArray<string | null> {
  return getFunnelPaths(container).map((path) => path.getAttribute("d"));
}

describe("Funnel animation", () => {
  describe("with isAnimationActive=false", () => {
    const renderTestCase = createSelectorTestCase(({ children }) => (
      <FunnelChart width={500} height={300}>
        <Funnel data={smallerData} dataKey="uv" isAnimationActive={false} />
        {children}
      </FunnelChart>
    ));

    it("should render all trapezoids without animation", () => {
      const { container } = renderTestCase();
      const expected = [
        "M 5,5L 495,5L 433.75,150L 66.25,150L 5,5 Z",
        "M 66.25,150L 433.75,150L 250,295L 250,295L 66.25,150 Z",
      ];
      expect(getFunnelPathStrings(container)).toEqual(expected);
    });
  });
});
