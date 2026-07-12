// Ported from recharts 3.8.1 test/helper/mockGetBoundingClientRect.ts.
// `getMockDomRect`, `mockGetBoundingClientRect`, and
// `mockSequenceOfGetBoundingClientRect` are ported.
import { vi } from "vitest";
import { mockHTMLElementProperty } from "./mockHTMLElementProperty";

type NonEmptyArray<T> = [T, ...T[]];

export function getMockDomRect(partial: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...partial,
    toJSON() {
      JSON.stringify(this);
    },
  };
}

/**
 * getBoundingClientRect always returns 0 in jsdom, we can't test for actual returned string size.
 * Assumes vitest `restoreMocks` is on (no explicit cleanup available).
 *
 * @param rect overrides getBoundingClientRect return value in the mock
 * @param mockClientHeightWidth overrides offsetWidth/offsetHeight with the same values as rect
 */
export function mockGetBoundingClientRect(
  rect: Partial<DOMRect>,
  mockClientHeightWidth = true,
): void {
  const mockDomRect = getMockDomRect(rect);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(mockDomRect);

  if (mockClientHeightWidth) {
    mockHTMLElementProperty("offsetHeight", mockDomRect.height);
    mockHTMLElementProperty("offsetWidth", mockDomRect.width);
  }
}

/**
 * Like `mockGetBoundingClientRect`, but returns each rect in `rects` in order for
 * the first N-1 calls and the last rect for every subsequent call. Used to model
 * layout that measures a 0x0 element before it is sized (e.g. Legend bbox).
 */
export function mockSequenceOfGetBoundingClientRect(
  rects: NonEmptyArray<Partial<DOMRect>>,
  mockClientHeightWidth = true,
): void {
  const mockDomRects = rects.map((r) => getMockDomRect(r));
  const spy = vi.spyOn(Element.prototype, "getBoundingClientRect");
  for (let i = 0; i < mockDomRects.length - 1; i++) {
    spy.mockReturnValueOnce(mockDomRects[i]!);
  }
  spy.mockReturnValue(mockDomRects[mockDomRects.length - 1]!);

  if (mockClientHeightWidth) {
    mockHTMLElementProperty("offsetHeight", mockDomRects[0]!.height);
    mockHTMLElementProperty("offsetWidth", mockDomRects[0]!.width);
  }
}
