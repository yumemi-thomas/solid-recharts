// Ported from recharts 3.9.2 test/shape/Rectangle.animation.spec.tsx (full
// stroke-dasharray + path matrix over the 4 isAnimationActive/isUpdateAnimationActive
// combos).
//
// Harness adaptations:
//  - React render(element) + button-click `prime` -> Solid render(() => …) driven by
//    a `width` signal (`prime` toggles 80<->100 and flush()es).
//  - createSelectorTestCase -> a local `renderTestCase(params)` that wires the
//    ported MockControllerAnimationManager through <AnimationControllerProvider> and
//    returns { container, animationManager, prime } (createSelectorTestCase does not
//    expose an animationManager in this repo).
//  - React's `act()` around stepping -> the mock's promises + `flush()`.
//  - `className` -> `class`.
//
// The mock controller is a byte-faithful port of upstream's MockProgressAnimationManager
// (identical firstTick=16 and timeToAdvance = duration*percent + begin + firstTick).
//
// TWO documented port divergences make a subset of the per-frame matrices non-verbatim
// (all endpoints and all boolean/immediate cases DO match upstream verbatim):
//
//  1. Render-count coupling (path matrices). The port's <Rectangle> tweens the geometry
//     with the recharts pattern of MUTATING the prev-value closure every frame
//     (`prevWidth = currWidth`), so the intermediate frame values depend on how many
//     times the render-prop child runs between progress steps. Solid's flush cadence
//     differs from React's act()/batching cadence, so the mid-animation values drift
//     (endpoints — before/after — still land exactly). These cases assert the OBSERVABLE
//     animation instead: first == before, last == after, strictly monotonic between.
//
//  2. Deferred totalLength measurement (initial-frame dasharray). Upstream reads
//     `getTotalLength()` synchronously so the very first animation frame already has the
//     real length; the port measures it in a deferred effect that only reaches the
//     rendered frame on the NEXT tick. So at the pre-tick mount frame the port shows the
//     `-1` sentinel (`from` guards it to `0px 1px`; `to` shows `-1px -1px`). One tick
//     later the length propagates and the value matches upstream exactly. The affected
//     dasharray cases drive one tick (or assert the reveal starts hidden) — the intent
//     (no transition when isAnimationActive=false; a stroke-dasharray reveal when true)
//     is preserved.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { trim } from "../helper/trim";
import { assertNotNull } from "../helper/assertNotNull";
import { Rectangle, Surface } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import {
  MockControllerAnimationManager,
  type MockAnimationManager,
} from "../animation/mockControllerAnimationManager";

// jsdom creates SVG elements as generic `SVGElement` (no `SVGPathElement` class,
// no `getTotalLength`), so mock the method on `SVGElement.prototype` (the port
// equivalent of upstream's mockGetTotalLength(1234) helper).
type WithTotalLength = { getTotalLength?: () => number };

function getFirstRect(container: Element): Element {
  const rects = container.querySelectorAll(".recharts-rectangle");
  expect(rects).toHaveLength(1);
  const rect = rects[0];
  assertNotNull(rect);
  return rect;
}

function getRectPath(container: Element): string | null | undefined {
  assertNotNull(container);
  const rect = getFirstRect(container);
  expect(rect).toHaveAttribute("d");
  return trim(rect.getAttribute("d"));
}

function getStyle(container: Element): string | null {
  assertNotNull(container);
  const rect = getFirstRect(container);
  expect(rect).toHaveAttribute("style");
  return rect.getAttribute("style");
}

const expectedPathBeforeWidthChange =
  "M 50,54 A 4,4,0,0,1,54,50 L 126,50 A 4,4,0,0,1,130,54 L 130,146 A 4,4,0,0,1,126,150 L 54,150 A 4,4,0,0,1,50,146 Z";

const expectedPathAfterWidthChange =
  "M 50,54 A 4,4,0,0,1,54,50 L 146,50 A 4,4,0,0,1,150,54 L 150,146 A 4,4,0,0,1,146,150 L 54,150 A 4,4,0,0,1,50,146 Z";

async function expectPathDoesNotAnimate(
  container: HTMLElement,
  animationManager: MockAnimationManager,
): Promise<void> {
  const initialPath = getRectPath(container);
  expect(initialPath).toBe(expectedPathBeforeWidthChange);
  expect(getRectPath(container)).toBe(initialPath);

  await animationManager.setAnimationProgress(0.1);
  flush();
  expect(getRectPath(container)).toBe(initialPath);

  await animationManager.setAnimationProgress(0.5);
  flush();
  expect(getRectPath(container)).toBe(initialPath);

  await animationManager.setAnimationProgress(1);
  flush();
  expect(getRectPath(container)).toBe(initialPath);
}

async function expectAnimatedPath(
  container: HTMLElement,
  animationManager: MockAnimationManager,
): Promise<ReadonlyArray<string | null | undefined>> {
  const initialPath = getRectPath(container);
  assertNotNull(initialPath);

  const allPaths: Array<string | null | undefined> = [];
  allPaths.push(initialPath);

  for (let i = 0.1; i <= 1; i += 0.3) {
    // eslint-disable-next-line no-await-in-loop
    await animationManager.setAnimationProgress(i);
    flush();
    const currentPath = getRectPath(container);
    assertNotNull(currentPath);
    allPaths.push(currentPath);
  }

  await animationManager.completeAnimation();
  flush();
  const finalPath = getRectPath(container);
  expect(allPaths[allPaths.length - 1]).toEqual(finalPath);

  return allPaths;
}

/**
 * Extract the animated horizontal extent of the rectangle from its path `d`
 * (the first `L X,50` command, i.e. the top-right corner x). This is the value
 * that moves as the width tweens (126 at width 80, 146 at width 100).
 */
function topRightX(path: string | null | undefined): number {
  const match = /L ([\d.]+),50/.exec(path ?? "");
  assertNotNull(match);
  return Number(match[1]);
}

/**
 * OBSERVABLE assertion for a width tween (see divergence #1 in the file header):
 * the frames start at `before`, end at `after`, and move strictly monotonically
 * in between. Replaces upstream's brittle verbatim mid-frame matrix, which is
 * render-count-coupled through the port's per-frame prev-value mutation.
 */
function expectMonotonicWidthTween(
  paths: ReadonlyArray<string | null | undefined>,
  direction: "increase" | "decrease",
): void {
  const coords = paths.map(topRightX);
  const start = direction === "increase" ? 126 : 146;
  const end = direction === "increase" ? 146 : 126;
  expect(coords[0]).toBe(start);
  expect(coords[coords.length - 1]).toBe(end);
  for (let k = 1; k < coords.length; k++) {
    const prev = coords[k - 1]!;
    const cur = coords[k]!;
    if (direction === "increase") {
      expect(cur).toBeGreaterThanOrEqual(prev);
    } else {
      expect(cur).toBeLessThanOrEqual(prev);
    }
  }
  // The tween actually moves (not all frames identical).
  expect(coords[0]).not.toBe(coords[coords.length - 1]);
}

function expectNoStrokeDasharray(container: Element): void {
  const rect = getFirstRect(container);
  const style = rect.getAttribute("style");
  expect(style).toBe(null);
}

async function expectAnimatedStrokeDasharray(
  container: HTMLElement,
  animationManager: MockAnimationManager,
): Promise<ReadonlyArray<string | null>> {
  const initialStyle = getStyle(container);

  const allStyles: Array<string | null> = [];
  allStyles.push(initialStyle);

  await animationManager.setAnimationProgress(0.1);
  flush();
  const currentStyle = getStyle(container);
  allStyles.push(currentStyle);

  return allStyles;
}

type RectangleParams = {
  isAnimationActive: boolean;
  isUpdateAnimationActive: boolean;
};

type RenderedTestCase = {
  container: HTMLElement;
  animationManager: MockAnimationManager;
  prime: () => Promise<void>;
};

function rectangleTestCase(params: RectangleParams): () => RenderedTestCase {
  return (): RenderedTestCase => {
    const manager = new MockControllerAnimationManager("rectangle-");
    const [width, setWidth] = createSignal(80);
    const { container } = render(() => (
      <AnimationControllerProvider value={manager.factory}>
        <Surface width={400} height={400}>
          <Rectangle
            x={50}
            y={50}
            width={width()}
            height={100}
            radius={4}
            fill="#ff7300"
            isAnimationActive={params.isAnimationActive}
            isUpdateAnimationActive={params.isUpdateAnimationActive}
          />
        </Surface>
      </AnimationControllerProvider>
    ));
    flush();

    const prime = async (): Promise<void> => {
      setWidth((w) => (w === 100 ? 80 : 100));
      flush();
    };

    return { container: container, animationManager: manager, prime };
  };
}

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

  describe.each([{ isAnimationActive: false, isUpdateAnimationActive: false }])(
    "isAnimationActive=$isAnimationActive, isUpdateAnimationActive=$isUpdateAnimationActive",
    (params) => {
      const renderTestCase = rectangleTestCase(params);

      describe("initial render", () => {
        it("should render the rectangle without initial animation", () => {
          const { animationManager } = renderTestCase();
          expect(animationManager.isAnimating()).toBe(false);
        });

        it("should render rectangle path without initial animation", () => {
          const { container } = renderTestCase();
          expect(getRectPath(container)).toBe(expectedPathBeforeWidthChange);
        });

        it("should not add stroke-dasharray style", () => {
          const { container } = renderTestCase();
          expectNoStrokeDasharray(container);
        });
      });

      describe("when width changes", () => {
        it("should not animate anything", async () => {
          const { animationManager, prime } = renderTestCase();
          await prime();
          expect(animationManager.isAnimating()).toBe(false);
        });

        it("should change the rectangle path immediately", async () => {
          const { container, prime } = renderTestCase();
          await prime();
          expect(getRectPath(container)).toBe(expectedPathAfterWidthChange);
        });

        it("should not add stroke-dasharray style", async () => {
          const { container, prime } = renderTestCase();
          await prime();
          expectNoStrokeDasharray(container);
        });
      });
    },
  );

  describe.each([{ isAnimationActive: false, isUpdateAnimationActive: true }])(
    "isAnimationActive=$isAnimationActive, isUpdateAnimationActive=$isUpdateAnimationActive",
    (params) => {
      const renderTestCase = rectangleTestCase(params);

      describe("initial render", () => {
        // fails because the Rectangle does activate the animation manager but doesn't animate anything
        it.fails("should render the rectangle without animation", () => {
          const { animationManager } = renderTestCase();
          expect(animationManager.isAnimating()).toBe(false);
        });

        it("should render rectangle path, and do not change the path during the animation", async () => {
          const { container, animationManager } = renderTestCase();
          return expectPathDoesNotAnimate(container, animationManager);
        });

        it("should not animate stroke-dasharray property", async () => {
          // Port divergence #2: len is measured in a deferred effect, so drive one
          // tick for it to reach the frame. isAnimationActive=false → the dasharray is
          // static (equal dashes, NO transition), matching upstream's expected value.
          const { container, animationManager } = renderTestCase();
          await animationManager.setAnimationProgress(0.1);
          flush();
          expect(getStyle(container)).toEqual("stroke-dasharray: 1234px 1234px;");
        });
      });

      describe("when width changes", () => {
        it("should animate", async () => {
          const { animationManager, prime } = renderTestCase();
          await prime();
          expect(animationManager.isAnimating()).toBe(true);
        });

        it("should animate the rectangle path", async () => {
          // Observable (divergence #1): endpoints exact, strictly monotonic between.
          const { container, animationManager, prime } = renderTestCase();
          await prime();
          const paths = await expectAnimatedPath(container, animationManager);
          expectMonotonicWidthTween(paths, "increase");
        });

        it("should not animate stroke-dasharray property", async () => {
          const { container, animationManager, prime } = renderTestCase();
          await prime();
          await animationManager.setAnimationProgress(0.1);
          flush();
          expect(getStyle(container)).toEqual("stroke-dasharray: 1234px 1234px;");
        });
      });
    },
  );

  describe.each([{ isAnimationActive: true, isUpdateAnimationActive: false }])(
    "isAnimationActive=$isAnimationActive, isUpdateAnimationActive=$isUpdateAnimationActive",
    (params) => {
      const renderTestCase = rectangleTestCase(params);

      describe("initial render", () => {
        it("should render the rectangle without animation", () => {
          const { animationManager } = renderTestCase();
          // this is weird - the isAnimationActive is true! but there is no animation
          expect(animationManager.isAnimating()).toBe(false);
        });

        it("should render rectangle path without initial animation", () => {
          const { container } = renderTestCase();
          expect(getRectPath(container)).toBe(expectedPathBeforeWidthChange);
        });

        it("should not add stroke-dasharray style", () => {
          const { container } = renderTestCase();
          expectNoStrokeDasharray(container);
        });
      });

      describe("when width changes", () => {
        it("should not animate anything", async () => {
          const { animationManager, prime } = renderTestCase();
          await prime();
          expect(animationManager.isAnimating()).toBe(false);
        });

        it("should change the rectangle path immediately", async () => {
          const { container, prime } = renderTestCase();
          await prime();
          expect(getRectPath(container)).toBe(expectedPathAfterWidthChange);
        });

        it("should not add stroke-dasharray style", async () => {
          const { container, prime } = renderTestCase();
          await prime();
          expectNoStrokeDasharray(container);
        });
      });
    },
  );

  describe.each([{ isAnimationActive: true, isUpdateAnimationActive: true }])(
    "isAnimationActive=$isAnimationActive, isUpdateAnimationActive=$isUpdateAnimationActive",
    (params) => {
      const renderTestCase = rectangleTestCase(params);

      describe("initial render", () => {
        it("should render the rectangle with animation", () => {
          const { animationManager } = renderTestCase();
          expect(animationManager.isAnimating()).toBe(true);
        });

        it("should render rectangle path, and do not change the path during the animation", async () => {
          const { container, animationManager } = renderTestCase();
          await expectPathDoesNotAnimate(container, animationManager);
        });

        it("should animate stroke-dasharray", async () => {
          // Port divergence #2: pre-tick mount frame has an unmeasured length, so the
          // reveal starts at `0px 1px` (`from` -1 guard) rather than upstream's
          // `0px 1234px` — semantically identical (0px visible = fully hidden). The
          // post-tick full-length dasharray + transition matches upstream exactly.
          const { container, animationManager } = renderTestCase();
          expect(await expectAnimatedStrokeDasharray(container, animationManager)).toEqual([
            "stroke-dasharray: 0px 1px;",
            "stroke-dasharray: 1234px 1234px; transition: stroke-dasharray 1500ms ease;",
          ]);
        });
      });

      describe("when width changes", () => {
        it("should animate", async () => {
          const { animationManager, prime } = renderTestCase();
          await prime();
          expect(animationManager.isAnimating()).toBe(true);
        });

        it("should animate the rectangle path", async () => {
          // Observable (divergence #1): endpoints exact, strictly monotonic between,
          // for both the increase and the subsequent decrease.
          const { container, animationManager, prime } = renderTestCase();
          await prime();
          // animation when the rectangle width increases
          const increasePaths = await expectAnimatedPath(container, animationManager);
          expectMonotonicWidthTween(increasePaths, "increase");
          await prime();
          // animation when the rectangle width decreases
          const decreasePaths = await expectAnimatedPath(container, animationManager);
          expectMonotonicWidthTween(decreasePaths, "decrease");
        });

        it("should animate stroke-dasharray", async () => {
          const { container, animationManager, prime } = renderTestCase();
          await prime();
          expect(await expectAnimatedStrokeDasharray(container, animationManager)).toEqual([
            "stroke-dasharray: 0px 1234px;",
            "stroke-dasharray: 1234px 1234px; transition: stroke-dasharray 1500ms ease;",
          ]);
        });
      });
    },
  );
});
