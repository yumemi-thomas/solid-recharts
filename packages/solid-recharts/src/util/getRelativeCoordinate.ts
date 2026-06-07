// Ported from recharts 3.8.1 src/util/getRelativeCoordinate.ts (commit 7a23854).
// Pure function — no framework surface — so behavior is byte-identical to recharts.

import {
  RelativePointer,
  MousePointer,
  SVGMousePointer,
  SVGTouchPointer,
  TouchPointer,
} from "./types";

/**
 * Type guard to check if the pointer event is from an SVG element.
 */
function isSvgPointer(
  pointer: MousePointer | TouchPointer,
): pointer is SVGMousePointer | SVGTouchPointer {
  return "getBBox" in pointer.currentTarget && typeof pointer.currentTarget.getBBox === "function";
}

/**
 * Computes relative element coordinates from mouse or touch event.
 *
 * The output coordinates are relative to the top-left corner of the active element (= currentTarget),
 * where the top-left corner is (0, 0).
 * Moving right, the x-coordinate increases, and moving down, the y-coordinate increases.
 *
 * The coordinates are rounded to the nearest integer and account for CSS transform scale.
 * So element that's scaled will return the same coordinates as element that's not scaled.
 *
 * In other words: you zoom in or out, numbers stay the same.
 *
 * This function works with both HTML elements and SVG elements.
 *
 * It works with both Mouse and Touch events.
 * For Touch events, it returns an array of coordinates, one for each touch point.
 * For Mouse events, it returns a single coordinate object.
 *
 * @since 3.8
 * @param event The mouse or touch event from event handlers (works with both HTML and SVG elements)
 * @returns Coordinates relative to the top-left corner of the element. Single object for Mouse events, array of objects for Touch events.
 */
export function getRelativeCoordinate(event: MousePointer): RelativePointer;
export function getRelativeCoordinate(event: TouchPointer): Array<RelativePointer>;
export function getRelativeCoordinate(
  event: MousePointer | TouchPointer,
): RelativePointer | Array<RelativePointer> {
  const rect = event.currentTarget.getBoundingClientRect();

  let scaleX: number, scaleY: number;

  if (isSvgPointer(event)) {
    // For SVG elements, use getBBox() to get the intrinsic size in SVG coordinates
    const bbox = event.currentTarget.getBBox();
    scaleX = bbox.width > 0 ? rect.width / bbox.width : 1;
    scaleY = bbox.height > 0 ? rect.height / bbox.height : 1;
  } else {
    // For HTML elements, use offsetWidth/offsetHeight
    const element = event.currentTarget;
    scaleX = element.offsetWidth > 0 ? rect.width / element.offsetWidth : 1;
    scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1;
  }

  const getCoordinates = (clientX: number, clientY: number): RelativePointer => ({
    /*
     * Here it's important to use:
     * - event.clientX and event.clientY to get the mouse position relative to the viewport, including scroll.
     * - pageX and pageY are not used because they are relative to the whole document, and ignore scroll.
     * - rect.left and rect.top are used to get the position of the chart relative to the viewport.
     * - offsetX and offsetY are not used because they are relative to the offset parent
     *  which may or may not be the same as the clientX and clientY, depending on the position of the chart in the DOM
     *  and surrounding element styles. CSS position: relative, absolute, fixed, will change the offset parent.
     * - scaleX and scaleY are necessary for when the chart element is scaled using CSS `transform: scale(N)`.
     */
    relativeX: Math.round((clientX - rect.left) / scaleX),
    relativeY: Math.round((clientY - rect.top) / scaleY),
  });

  if ("touches" in event) {
    return Array.from(event.touches).map((touch) => getCoordinates(touch.clientX, touch.clientY));
  }

  return getCoordinates(event.clientX, event.clientY);
}
