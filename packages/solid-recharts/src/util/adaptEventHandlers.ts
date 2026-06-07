// Ported from recharts 3.8.1 src/util/types.ts `adaptEventHandlers` (commit 7a23854).
//
// recharts wraps each event handler found on a props object so it is invoked with
// `(props, event)` — the props object first, then the DOM event. Components like
// Curve spread `adaptEventHandlers(props)` onto their root element so a user's
// `<Line onClick={fn} />` ends up calling `fn(curveProps, event)`.
//
// DEVIATION from recharts: recharts also accepts a React element (via
// `isValidElement` + `element.props`). Solid has no element-props introspection
// (a rendered element is a DOM node, not a `{ props }` structure), so the element
// branch is deferred — mirroring `svgPropertiesAndEventsFromUnknown`, this accepts
// `unknown` and guards internally. Non-object inputs (function/boolean/null/array)
// return `null`, exactly as recharts.
import { isEventKey } from "./excludeEventProps";

type EventHandler = (e: Event) => void;
type RechartsEventHandler = (props: Record<string, unknown>, e: Event) => void;

/** Type guard giving an `unknown` value the recharts `(props, event)` call signature. */
function isRechartsEventHandler(value: unknown): value is RechartsEventHandler {
  return typeof value === "function";
}

/**
 * Returns a record of the event handlers on `input`, each rewrapped to be called
 * with `(props, event)`. Pass `newHandler` to replace every handler with one
 * uniform callback (recharts uses this for synthetic forwarding). Returns `null`
 * for non-object inputs.
 */
export function adaptEventHandlers(
  input: unknown,
  newHandler?: (e?: Event) => unknown,
): Record<string, EventHandler> | null {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const inputProps: Record<string, unknown> = { ...input };
  const out: Record<string, EventHandler> = {};

  Object.keys(inputProps).forEach((key) => {
    const value = inputProps[key];
    if (isEventKey(key) && isRechartsEventHandler(value)) {
      out[key] = newHandler ?? ((e: Event) => value(inputProps, e));
    }
  });

  return out;
}

/**
 * Returns the raw (unwrapped) event handlers on `input`. Used by a parent component
 * to forward a user's event props down to a child (e.g. Line → Curve) where the
 * child's own `adaptEventHandlers` performs the props-first wrapping.
 */
export function pickEventHandlers(input: unknown): Record<string, unknown> {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const inputProps: Record<string, unknown> = { ...input };
  const out: Record<string, unknown> = {};
  Object.keys(inputProps).forEach((key) => {
    const value = inputProps[key];
    if (isEventKey(key) && typeof value === "function") {
      out[key] = value;
    }
  });
  return out;
}
