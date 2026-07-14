import { expect, vi } from "vitest";

import { fireEvent } from "@solidjs/testing-library";
import { assertNotNull } from "../../helper/assertNotNull";
import type { Coordinate } from "../../../src/util/types";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/tooltipTestHelpers.tsx.
 * Solid adaptations:
 *  - recharts triggers the tooltip with `fireEvent.mouseOver`; this port's chart
 *    surface (RechartsWrapper) listens to `onMouseMove`, and mousemove bubbles up
 *    from any descendant trigger element, so hover uses `fireEvent.mouseMove`.
 *  - recharts settles state with `act(() => vi.runOnlyPendingTimers())` (rAF in a
 *    Redux middleware). This port settles with Solid's `flush()`.
 * Remember to `mockGetBoundingClientRect({ width, height })` in tests that assert
 * tooltip visibility/coordinates — jsdom returns an all-zero rect otherwise.
 */

export function getTooltip(container: Element): HTMLElement {
  const allWrappers = container.querySelectorAll(".recharts-tooltip-wrapper");
  assertNotNull(allWrappers);
  expect(allWrappers).toHaveLength(1);
  const element = allWrappers[0];
  assertNotNull(element);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected instance of HTMLElement, instead received: [${element.nodeName}]`);
  }
  return element;
}

export type MouseCoordinate = { clientX: number; clientY: number };

const defaultCoordinates: MouseCoordinate = { clientX: 200, clientY: 200 };

function showTooltipWithEvent(
  container: Element,
  selector: string | undefined,
  maybeCoordinate: MouseCoordinate | undefined,
  event: "click" | "touch" | "hover",
  debug?: () => void,
  advanceTimers = true,
): Element {
  const tooltipTriggerElement = selector != null ? container.querySelector(selector) : container;
  if (tooltipTriggerElement == null && debug != null) {
    debug();
  }
  assertNotNull(tooltipTriggerElement);
  expect(tooltipTriggerElement).toBeInTheDocument();
  expect(tooltipTriggerElement).toBeVisible();
  const coordinate = maybeCoordinate ?? defaultCoordinates;
  switch (event) {
    case "click": {
      fireEvent.click(tooltipTriggerElement, coordinate);
      break;
    }
    case "touch": {
      fireEvent.touchMove(tooltipTriggerElement, { touches: [coordinate] });
      break;
    }
    case "hover": {
      // recharts fires `mouseOver`. This port's chart surface (RechartsWrapper)
      // reacts to `mouseMove`, while individual graphical items (Pie/Bar sectors)
      // react to a non-bubbling `mouseEnter` on their wrapping Layer. Fire both so
      // a single helper call covers shared-chart and per-item triggers (each is a
      // no-op on the element that doesn't listen for it).
      fireEvent.mouseMove(tooltipTriggerElement, coordinate);
      fireEvent.mouseEnter(tooltipTriggerElement, coordinate);
      break;
    }
    default: {
      throw new Error("Unexpected event type");
    }
  }
  if (advanceTimers) {
    vi.runAllTimers();
  }
  return tooltipTriggerElement;
}

/**
 * Simulate a mouse hover on a trigger element to show the tooltip.
 * Remember to mock getBoundingClientRect, otherwise jsdom never treats the event
 * as a chart event. `selector` is the trigger (see tooltipMouseHoverSelectors);
 * `undefined` uses the container itself.
 */
export function showTooltipOnCoordinate(
  container: Element,
  selector: string | undefined,
  coordinates: MouseCoordinate | undefined,
  debug?: () => void,
  advanceTimers = true,
): Element {
  return showTooltipWithEvent(container, selector, coordinates, "hover", debug, advanceTimers);
}

export function showTooltipOnCoordinateTouch(
  container: Element,
  selector: string | undefined,
  coordinates: MouseCoordinate | undefined,
  debug?: () => void,
): Element {
  return showTooltipWithEvent(container, selector, coordinates, "touch", debug);
}

/** Hover the trigger at the default coordinate (200, 200) to show the tooltip. */
export function showTooltip(
  container: Element,
  selector?: string,
  debug?: () => void,
  advanceTimers = true,
): Element {
  return showTooltipOnCoordinate(container, selector, defaultCoordinates, debug, advanceTimers);
}

export function hideTooltip(container: Element, mouseHoverSelector: string): void {
  const element = container.querySelector(mouseHoverSelector);
  assertNotNull(element);
  fireEvent.mouseLeave(element);
}

export function showTooltipClick(
  container: Element,
  selector?: string,
  debug?: () => void,
): Element {
  return showTooltipWithEvent(container, selector, defaultCoordinates, "click", debug);
}

export function expectTooltipNotVisible(container: Element): void {
  assertNotNull(container);
  const tooltip = getTooltip(container);
  expect(tooltip).not.toBeVisible();
}

export function expectTooltipPayload(
  container: Element,
  expectedTooltipTitle: string,
  expectedTooltipContent: ReadonlyArray<string>,
): void {
  const tooltip = getTooltip(container);
  assertNotNull(tooltip);
  expect(tooltip).toBeInTheDocument();
  expect(tooltip).toBeVisible();
  expect
    .soft(tooltip.querySelector(".recharts-tooltip-label")?.textContent)
    .toBe(expectedTooltipTitle);
  const tooltipItems = tooltip.querySelectorAll(".recharts-tooltip-item");
  expect
    .soft(Array.from(tooltipItems).map((item) => item.textContent))
    .toEqual(expectedTooltipContent);
}

export function expectTooltipCoordinate(container: Element, expectedCoordinate: Coordinate): void {
  const tooltip = getTooltip(container);
  expect(tooltip).toBeInTheDocument();
  expect(tooltip).toBeVisible();
  const { transform } = tooltip.style;
  expect(transform).toContain(`translate(${expectedCoordinate.x}px, ${expectedCoordinate.y}px)`);
}
