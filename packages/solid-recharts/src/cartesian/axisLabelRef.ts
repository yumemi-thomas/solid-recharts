import { createSignal, type Accessor } from "solid-js";

/**
 * Captures the axis label `<text>` that `CartesianAxis` hands to its `labelRef`
 * (recharts' `labelRef`), so `height="auto"` / `width="auto"` can measure it. The
 * element is a signal: the label renders into a z-index portal that may not exist
 * yet when the first measurement runs, so the measuring effect must re-run once it
 * does. `ownedWrite`: the ref callback runs while the label is being created.
 */
export function createAxisLabelRef(): {
  element: Accessor<SVGTextElement | undefined>;
  ref: (element: SVGTextElement) => void;
} {
  const [element, setElement] = createSignal<SVGTextElement | undefined>(undefined, {
    ownedWrite: true,
  });
  return {
    element,
    ref: (next) => {
      setElement(next);
    },
  };
}

/**
 * The captured label if it is still on the page. A ref callback is never called
 * again when its element is removed (the axis lost its `label`), so the signal can
 * still hold a detached element that would otherwise be measured as a label.
 */
export function mountedLabel(element: SVGTextElement | undefined): SVGTextElement | undefined {
  return element?.isConnected === true ? element : undefined;
}
