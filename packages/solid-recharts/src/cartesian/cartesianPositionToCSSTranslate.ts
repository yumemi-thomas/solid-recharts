import type { TextAnchor, TextVerticalAnchor } from "../component/Text";

/** Converts SVG text anchors into an equivalent HTML translate transform. */
export function cartesianPositionToCSSTranslate(
  horizontalPosition: TextAnchor,
  verticalPosition: TextVerticalAnchor,
): string {
  if (horizontalPosition === "start" && verticalPosition === "start") {
    return "";
  }
  const horizontalValues = { start: "0", middle: "-50%", end: "-100%" };
  const verticalValues = { start: "0", middle: "-50%", end: "-100%" };
  const x = horizontalPosition === "inherit" ? "0" : horizontalValues[horizontalPosition];
  return `translate(${x}, ${verticalValues[verticalPosition]})`;
}
