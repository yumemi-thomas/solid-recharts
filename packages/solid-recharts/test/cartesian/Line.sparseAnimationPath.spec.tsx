// Port of recharts 3.8.1 test/cartesian/Line.sparseAnimationPath.spec.tsx
// (commit 7a23854). The reference asserts that an animated Line over SPARSE data
// (only two `redLine` values among seven rows) still renders a single curve whose
// path `d` keeps a line-to ("L") command — both mid-animation and after it
// completes. NaN/undefined points must not break the line-to.
//
// Harness adaptation: the Solid Line draws via stroke-dasharray with the curve `d`
// UNCHANGED by animation (see Line.animation.spec.tsx), so the `L` command is
// present at every progress. We drive the wired animation with the established
// AnimationManagerContext + MockProgressAnimationManager pattern (the Solid
// createSelectorTestCase intentionally wires no animation manager). getTotalLength
// is mocked on SVGElement.prototype (jsdom lacks it).
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { ComposedChart, Line, XAxis } from "../../src";
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { assertNotNull } from "../helper/assertNotNull";

const data = [
  { index: 10000, red: 1643, blue: 790 },
  { index: 1666, red: 182, blue: 42 },
  { index: 625, red: 56, blue: 11 },
  { index: 300, redLine: 0 },
  { index: 10000, redLine: 1522 },
  { index: 600, blueLine: 0 },
  { index: 10000, blueLine: 678 },
];

type WithTotalLength = { getTotalLength?: () => number };

function getAnimatedLines(container: HTMLElement): SVGPathElement[] {
  return Array.from(container.querySelectorAll<SVGPathElement>(".recharts-line-curve"));
}

function getPathCommands(path: SVGPathElement): string[] {
  const d = path.getAttribute("d");
  if (d == null) {
    throw new Error("Expected line path to have a d attribute");
  }

  return Array.from(d.matchAll(/[A-Za-z]/g), (match) => match[0]);
}

describe("Line sparse animation path commands", () => {
  let original: (() => number) | undefined;
  beforeAll(() => {
    const proto = SVGElement.prototype as WithTotalLength;
    original = proto.getTotalLength;
    proto.getTotalLength = (): number => 100;
  });
  afterAll(() => {
    (SVGElement.prototype as WithTotalLength).getTotalLength = original;
  });

  function renderTestCase(): {
    container: HTMLElement;
    animationManager: MockProgressAnimationManager;
  } {
    const animationManager = new MockProgressAnimationManager("line-sparse");
    const { container } = render(() => (
      <AnimationManagerContext value={() => animationManager}>
        <ComposedChart data={data} width={100} height={100}>
          <XAxis dataKey="index" type="number" />
          <Line dataKey="redLine" stroke="red" />
        </ComposedChart>
      </AnimationManagerContext>
    ));
    flush();
    return { container, animationManager };
  }

  it("should keep a line-to command in the animated sparse line path", async () => {
    const { container, animationManager } = renderTestCase();

    await animationManager.setAnimationProgress(0.5);
    flush();

    const lines = getAnimatedLines(container);
    expect(lines).toHaveLength(1);
    const path = lines[0];
    assertNotNull(path);
    expect(getPathCommands(path)).toContain("L");
  });

  it("should contain a line-to command after the animation completes", async () => {
    const { container, animationManager } = renderTestCase();

    await animationManager.completeAnimation();
    flush();

    const lines = getAnimatedLines(container);
    expect(lines).toHaveLength(1);
    const path = lines[0];
    assertNotNull(path);
    expect(getPathCommands(path)).toContain("L");
  });
});
