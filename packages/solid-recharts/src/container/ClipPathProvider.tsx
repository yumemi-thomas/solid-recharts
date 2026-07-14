// Ported from recharts 3.8.1 src/container/ClipPathProvider.tsx (commit 7a23854).
//
// Solid deviations: `useState(id)` → a once-computed `const` (Solid runs the body
// once); `return null` when no plot area → keyed `<Show>`; context-value-is-
// provider; default `null` (not undefined, which would make `useContext` throw).
import { createContext, useContext, Show } from "solid-js";
import type { JSX } from "solid-js";
import { uniqueId } from "../util/DataUtils";
import { usePlotArea } from "../hooks";

const ClipPathIdContext = createContext<string | null>(null);

/**
 * Generates a unique clip path ID, renders the clip rect over the plot area, and
 * provides the ID via context (read with `useClipPathId`).
 */
export const ClipPathProvider = (props: { children: JSX.Element }): JSX.Element => {
  const clipPathId = `${uniqueId("recharts")}-clip`;
  const plotArea = usePlotArea();

  // Non-keyed Show: the children mount once (when a plot area exists); the rect
  // updates reactively. A keyed Show would re-key on every plot-area object
  // change (selectors return fresh objects), churning the subtree.
  return (
    <Show when={plotArea()}>
      {(area) => (
        <ClipPathIdContext.Provider value={clipPathId}>
          <defs>
            <clipPath id={clipPathId}>
              <rect x={area().x} y={area().y} height={area().height} width={area().width} />
            </clipPath>
          </defs>
          {props.children}
        </ClipPathIdContext.Provider>
      )}
    </Show>
  );
};

export const useClipPathId = (): string | undefined => useContext(ClipPathIdContext) ?? undefined;
