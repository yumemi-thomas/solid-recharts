// Subset port of recharts 3.8.1 test/shape/Rectangle.animation.spec.tsx (commit
// 7a23854). Proves the wired update-animation path: with isUpdateAnimationActive,
// a width change animates the rectangle's `d` from the previous to the new width,
// driven deterministically by the ported MockProgressAnimationManager (injected
// via AnimationManagerContext). Static path (isUpdateAnimationActive=false) keeps
// the final shape with no stroke-dasharray.
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createSignal, flush } from "solid-js";
import { render } from "../helper/render";
import { Rectangle, Surface } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";

function trim(s: string | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

const expectedPathBeforeWidthChange =
  "M 50,54 A 4,4,0,0,1,54,50 L 126,50 A 4,4,0,0,1,130,54 L 130,146 A 4,4,0,0,1,126,150 L 54,150 A 4,4,0,0,1,50,146 Z";
const expectedPathAfterWidthChange =
  "M 50,54 A 4,4,0,0,1,54,50 L 146,50 A 4,4,0,0,1,150,54 L 150,146 A 4,4,0,0,1,146,150 L 54,150 A 4,4,0,0,1,50,146 Z";

function rectPath(container: Element): string {
  const rect = container.querySelector(".recharts-rectangle");
  expect(rect).not.toBeNull();
  return trim(rect?.getAttribute("d") ?? "");
}

// jsdom creates SVG elements as generic `SVGElement` (no `SVGPathElement` class,
// no `getTotalLength`), so mock the method on `SVGElement.prototype`.
type WithTotalLength = { getTotalLength?: () => number };

describe("Rectangle animation", () => {
  let original: (() => number) | undefined;
  beforeAll(() => {
    const proto = SVGElement.prototype as WithTotalLength;
    original = proto.getTotalLength;
    proto.getTotalLength = (): number => 1234;
  });
  afterAll(() => {
    const proto = SVGElement.prototype as WithTotalLength;
    proto.getTotalLength = original;
  });

  it("renders the static shape (no stroke-dasharray) when isUpdateAnimationActive is false", () => {
    const { container } = render(() => (
      <Surface width={400} height={400}>
        <Rectangle x={50} y={50} width={80} height={100} radius={4} fill="#ff7300" />
      </Surface>
    ));
    flush();

    expect(rectPath(container)).toBe(expectedPathBeforeWidthChange);
    const rect = container.querySelector(".recharts-rectangle");
    expect(rect?.getAttribute("style")).toBeNull();
  });

  it("animates the path from the previous width to the new width", async () => {
    const manager = new MockProgressAnimationManager("rect-anim");
    const [width, setWidth] = createSignal(80);

    const { container } = render(() => (
      <AnimationManagerContext value={() => manager}>
        <Surface width={400} height={400}>
          <Rectangle
            x={50}
            y={50}
            width={width()}
            height={100}
            radius={4}
            fill="#ff7300"
            isUpdateAnimationActive
            isAnimationActive
          />
        </Surface>
      </AnimationManagerContext>
    ));
    flush();

    // Initial render settles at the starting width.
    expect(rectPath(container)).toBe(expectedPathBeforeWidthChange);

    // Change the width → the animationId changes → a new animation begins.
    setWidth(100);
    flush();

    // Drive to completion → the path lands on the new width.
    await manager.completeAnimation();
    flush();
    expect(rectPath(container)).toBe(expectedPathAfterWidthChange);
  });
});
