// Ported from recharts 3.8.1 src/context/RegisterGraphicalItemId.tsx (commit 7a23854).
//
// Resolves a graphical item's id (user-provided or generated) once and provides
// it to descendants via context, exposing it to the item itself through a
// render-prop child. Solid 2.0: context value is the provider; the `children`
// function receives the resolved id (same render-prop shape as the reference).
//
// Not yet adopted by <Line> (which currently generates its own id inline); this
// is the shared primitive for graphical items (Line/Bar/Area/Scatter) to use.
import { createContext, useContext } from "solid-js";
import type { JSX } from "solid-js";
import { useUniqueId } from "../util/useUniqueId";
import { GraphicalItemId } from "../state/graphicalItemsSlice";

export interface IdSetter {
  id?: string;
  type: string;
  /**
   * Children must be a function that receives the resolved id of the graphical
   * item — either the one provided via `id` or one generated automatically.
   */
  children: (id: GraphicalItemId) => JSX.Element;
}

// Default must be a real value (null), not an explicit `undefined`: Solid 2.0
// treats an undefined default as "no default" and THROWS from useContext when
// no provider is above. Consumers (e.g. an <ErrorBar> child evaluated by Bar's
// collectCells probe outside the provider) rely on getting "no id" back and
// no-op'ing instead.
const GraphicalItemIdContext = createContext<GraphicalItemId | null>(null);

export const RegisterGraphicalItemId = (props: IdSetter): JSX.Element => {
  const resolvedId = useUniqueId(`recharts-${props.type}`, props.id);
  return (
    <GraphicalItemIdContext.Provider value={resolvedId}>
      {props.children(resolvedId)}
    </GraphicalItemIdContext.Provider>
  );
};

export function useGraphicalItemId(): GraphicalItemId | undefined {
  return useContext(GraphicalItemIdContext) ?? undefined;
}
