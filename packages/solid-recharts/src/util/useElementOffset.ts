// Ported from recharts 3.8.1 src/util/useElementOffset.ts (commit 7a23854).
//
// Solid 2.0 port of a React hook. Deviations from the reference:
//   - `useState<ElementOffset>` → `createSignal<ElementOffset>`; the hook returns
//     `[Accessor<ElementOffset>, setter]` instead of `[value, setter]`, because the
//     value changes over time (ResizeObserver) and Solid needs a reactive read.
//   - `useRef(observer)` → a plain closure variable; the hook body runs once, so the
//     closure persists for the lifetime of the owner (no ref cell needed).
//   - `lastBoundingBoxRef` mirror is KEPT (as a plain closure variable): the ref
//     and ResizeObserver callbacks are side-effect boundaries, not reactive scopes,
//     so reading the signal there to diff against would fire STRICT_READ_UNTRACKED.
//     The mirror lets them compare without a reactive read; it's updated in lockstep
//     with the signal.
//   - `useCallback` → a plain function (stable identity for the owner's lifetime).
//   - `useEffect(() => () => disconnect(), [])` → `onCleanup(disconnect)`.
//   - `extraDependencies` is kept in the signature for call-site parity but has no
//     effect here: there is no re-render to re-trigger. If reactive re-measurement
//     on dependency change is ever needed, callers pass accessors and we add a
//     `createEffect` — deferred until a consumer requires it.
import { createSignal, onCleanup, type Accessor } from "solid-js";

const EPS = 1;

/**
 * Stores the dimensions and position of a DOM element as returned by `getBoundingClientRect()`.
 *
 * Values are viewport-relative and may be fractional (subpixel precision).
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect}
 */
export type ElementOffset = {
  /**
   * Height of an element as returned by `getBoundingClientRect()`.
   * This is the CSS height including padding and border, and may be a fractional value.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMRect/height}
   */
  height: number;
  /**
   * Distance from the left edge of the viewport to the left edge of the element,
   * as returned by `getBoundingClientRect()`.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMRect/left}
   */
  left: number;
  /**
   * Distance from the top edge of the viewport to the top edge of the element,
   * as returned by `getBoundingClientRect()`.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMRect/top}
   */
  top: number;
  /**
   * Width of an element as returned by `getBoundingClientRect()`.
   * This is the CSS width including padding and border, and may be a fractional value.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMRect/width}
   */
  width: number;
};

/**
 * Callback ref setter returned by {@link useElementOffset}.
 *
 * Pass this to a DOM element's `ref` prop to start observing its layout.
 *
 * @param node - the DOM element to observe, or `null` when the element unmounts
 */
export type SetElementOffset = (node: HTMLElement | null) => void;

/**
 * Checks whether two ElementOffset values differ by more than `EPS` (1px) in any dimension.
 *
 * @param a - the first ElementOffset to compare
 * @param b - the second ElementOffset to compare
 * @returns true if any dimension differs by more than 1px
 */
function hasSignificantChange(a: ElementOffset, b: ElementOffset): boolean {
  return (
    Math.abs(a.height - b.height) > EPS ||
    Math.abs(a.left - b.left) > EPS ||
    Math.abs(a.top - b.top) > EPS ||
    Math.abs(a.width - b.width) > EPS
  );
}

/**
 * Reads the current bounding box of a DOM element using `getBoundingClientRect()`.
 *
 * @param node - the DOM element to measure
 * @returns an ElementOffset with the element's current dimensions and viewport-relative position
 */
function readElementOffset(node: HTMLElement): ElementOffset {
  const rect = node.getBoundingClientRect();
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

/**
 * Use this to listen to element layout changes.
 *
 * Very useful for reading actual sizes of DOM elements relative to the viewport.
 *
 * Uses ResizeObserver to automatically detect size changes of the observed element.
 *
 * @param extraDependencies see the module note — kept for call-site parity, no effect in the Solid port.
 * @returns [lastElementOffset, updateElementOffset] reactive accessor for the most recent value, and
 *   the ref setter. Pass the setter to a DOM element ref like this: `<div ref={updateElementOffset}>`
 */
export function useElementOffset(
  extraDependencies: ReadonlyArray<unknown> = [],
): [Accessor<ElementOffset>, SetElementOffset] {
  void extraDependencies; // parity with the recharts signature; no effect in the Solid port (see module note)

  const initialOffset: ElementOffset = { height: 0, left: 0, top: 0, width: 0 };
  const [lastBoundingBox, setLastBoundingBox] = createSignal<ElementOffset>(initialOffset);

  // Plain mirror of the signal's current value: the ref/ResizeObserver callbacks
  // below diff against THIS (a non-reactive read) instead of reading the signal,
  // which in those side-effect scopes would fire STRICT_READ_UNTRACKED.
  let current: ElementOffset = initialOffset;
  const commit = (box: ElementOffset): void => {
    if (hasSignificantChange(box, current)) {
      current = box;
      setLastBoundingBox(box);
    }
  };

  // Replaces React's `observerRef` — the hook body runs once, so a closure holds the observer.
  let observer: ResizeObserver | null = null;

  const updateBoundingBox: SetElementOffset = (node) => {
    // Disconnect any previously active ResizeObserver
    if (observer != null) {
      observer.disconnect();
      observer = null;
    }

    if (node != null) {
      // Measure immediately on ref attach
      commit(readElementOffset(node));

      // Set up ResizeObserver for future size changes
      if (typeof ResizeObserver !== "undefined") {
        const newObserver = new ResizeObserver(() => {
          commit(readElementOffset(node));
        });
        newObserver.observe(node);
        observer = newObserver;
      }
    }
  };

  // Cleanup on unmount
  onCleanup(() => {
    observer?.disconnect();
  });

  return [lastBoundingBox, updateBoundingBox];
}
