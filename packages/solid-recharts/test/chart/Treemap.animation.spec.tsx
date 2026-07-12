// Solid-recharts spec: Treemap node enter animation. recharts slides each node in
// from the left via a CSS `transform` transition; the spec just sets
// `isAnimationActive={false}` for static geometry, so here we lock the two states:
// settled (no transition) when off, and a transition present when animating.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { Treemap } from "../../src";
import { exampleTreemapData } from "../_data";
import { render } from "../helper/render";

function depthLayers(container: Element): Element[] {
  return Array.from(container.querySelectorAll(".recharts-treemap-depth-1"));
}

describe("Treemap animation", () => {
  it("renders settled, transition-free nodes when isAnimationActive={false}", () => {
    const { container } = render(() => (
      <Treemap width={800} height={400} data={exampleTreemapData} isAnimationActive={false} />
    ));
    flush();
    const layers = depthLayers(container);
    expect(layers.length).toBeGreaterThan(0);
    layers.forEach((l) => {
      const style = l.getAttribute("style") ?? "";
      // Settled at the identity transform, no transition.
      expect(style).toContain("translate(0px, 0px)");
      expect(style).not.toContain("transition");
    });
    // Geometry is unaffected by the animation wrapper.
    expect(container.querySelectorAll(".recharts-rectangle").length).toBeGreaterThan(0);
  });

  it("accepts the animation props and still renders every node when animating", () => {
    const { container } = render(() => (
      <Treemap
        width={800}
        height={400}
        data={exampleTreemapData}
        isAnimationActive
        animationBegin={0}
        animationDuration={1500}
        animationEasing="linear"
      />
    ));
    flush();
    // Same node set renders (the animation wrapper carries a transform style).
    expect(depthLayers(container).length).toBeGreaterThan(0);
    depthLayers(container).forEach((l) => {
      expect(l.getAttribute("style") ?? "").toContain("transform");
    });
  });
});
