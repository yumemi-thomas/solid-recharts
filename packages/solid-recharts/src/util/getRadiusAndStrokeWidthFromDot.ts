// Ported from recharts 3.8.1 src/util/getRadiusAndStrokeWidthFromDot.tsx (commit 7a23854).
// No JSX → `.ts`.
import { ActiveDotType, DotType } from "./types";
import { svgPropertiesNoEventsFromUnknown } from "./svgPropertiesNoEvents";

export function getRadiusAndStrokeWidthFromDot(dot: ActiveDotType | DotType): {
  r: number;
  strokeWidth: number;
} {
  const props = svgPropertiesNoEventsFromUnknown(dot);
  const defaultR = 3;
  const defaultStrokeWidth = 2;
  if (props != null) {
    // `svgPropertiesNoEvents` now renames camelCase keys to SVG attribute names,
    // so `strokeWidth` arrives as `stroke-width` (`r` is unchanged).
    const r = props.r;
    const strokeWidth = props["stroke-width"];
    let realR = Number(r);
    let realStrokeWidth = Number(strokeWidth);
    if (Number.isNaN(realR) || realR < 0) {
      realR = defaultR;
    }
    if (Number.isNaN(realStrokeWidth) || realStrokeWidth < 0) {
      realStrokeWidth = defaultStrokeWidth;
    }
    return {
      r: realR,
      strokeWidth: realStrokeWidth,
    };
  }
  return {
    r: defaultR,
    strokeWidth: defaultStrokeWidth,
  };
}
