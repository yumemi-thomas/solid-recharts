// Ported from recharts 3.8.1 test/helper/mockGetBoundingClientRect.ts.
// `getMockDomRect` + `mockGetBoundingClientRect` are ported (the latter used by
// DOMUtils.spec); `mockSequenceOfGetBoundingClientRect` (needs the NonEmptyArray
// type) ports when a consumer spec first needs it.
import { vi } from "vitest";
import { mockHTMLElementProperty } from "./mockHTMLElementProperty";

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
