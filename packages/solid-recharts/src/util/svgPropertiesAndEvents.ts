// Ported from recharts 3.8.1.
// recharts uses React's `isValidElement`/`element.props` in
// `svgPropertiesAndEventsFromUnknown` — there is NO Solid equivalent (a Solid
// element is a DOM node, not a `{ props }` structure), so the element branch
// is deferred until the Tier-2 "shape can be an element or a props object"
// pattern lands (ActiveShapeUtils). Element inputs currently fall through to
// `null`. React's `SVGProps`/`CSSProperties` types are replaced with JSX.*
// from '@solidjs/web'.
import { isEventKey } from "./excludeEventProps";
import { isDataAttribute, isSvgElementPropKey, toSvgAttributeName } from "./svgPropertiesNoEvents";
import { svgPropertiesNoEventsKeepCase } from "./svgPropertiesNoEvents";

/**
 * Filters an object to only include SVG properties, data attributes, and event
 * handlers, renaming camelCase SVG presentation keys to their real (kebab/namespaced)
 * DOM attribute names so a Solid spread emits valid SVG. Event keys (`on*`) and
 * genuinely-camelCase SVG attributes pass through unchanged. Returns a DOM-ready
 * record (not keyed by the input keys), hence `Record<string, unknown>`.
 * @param obj - The object to filter.
 * @returns A new object containing only valid SVG attributes, data attributes, and event handlers.
 */
export function svgPropertiesAndEvents(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // for ... in loop is 10x faster than Object.entries + filter + Object.fromEntries in Chrome.
  // Note: for...in only iterates string (and numeric-as-string) keys; symbols are naturally excluded.
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (isSvgElementPropKey(key) || isDataAttribute(key)) {
        // Presentation/data attributes get the camelCase → DOM-name rename.
        result[toSvgAttributeName(key)] = obj[key];
      } else if (isEventKey(key)) {
        // Solid event props (`onMouseEnter`, …) must keep their camelCase key.
        result[key] = obj[key];
      }
    }
  }
  return result;
}

/**
 * Vendor-verbatim variant of {@link svgPropertiesAndEvents}: keeps camelCase
 * key names (see svgPropertiesNoEventsKeepCase). For building component-input
 * payload records; the consuming component applies the DOM rename itself.
 */
export function svgPropertiesAndEventsKeepCase(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result = svgPropertiesNoEventsKeepCase(obj);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && isEventKey(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Function to filter SVG properties and events from various input types.
 * The input types can be:
 * - A plain (non-array) object, in which case it returns a record of only SVG
 *   properties, data attributes, and event handlers.
 * - Anything else, in which case it returns null.
 *
 * DEVIATION from recharts: recharts also accepts a React element here (via
 * `isValidElement` + `element.props`) so callers can pass `dot={<circle .../>}`.
 * Solid has no element-props introspection — a rendered Solid element is a DOM
 * node, not a `{ props }` data structure — so the element branch is deferred
 * until the Tier-2 "shape can be an element or a props object" pattern is
 * designed (ActiveShapeUtils). Element inputs currently fall through to `null`.
 *
 * @param input - The input to filter.
 * @returns A filtered record of SVG properties if the input is a plain object, otherwise null.
 */
export function svgPropertiesAndEventsFromUnknown(input: unknown): Record<string, unknown> | null {
  if (input == null) {
    return null;
  }

  if (typeof input === "object" && !Array.isArray(input)) {
    return svgPropertiesAndEvents({ ...input });
  }

  return null;
}
