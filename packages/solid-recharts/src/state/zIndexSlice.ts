// Ported from recharts 3.8.1 src/state/zIndexSlice.ts (commit 7a23854).
// FULL SOLID-NATIVE REWRITE (no Redux/immer). Registry of z-index -> element refs
// used to portal components at each z-index. Z-index layering is wired into the
// store so chart items can render through ZIndexLayer.
import { createStore, produce } from "solid-js/store";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";

type ZIndexEntry = {
  /**
   * DOM element backing this z-index (used to portal components here). `undefined`
   * means registration is in progress -- wait for the next render cycle.
   */
  element: Element | undefined;
  /**
   * Panorama items render in a different SVG element, so they need a separate
   * element reference from normal items at the same z-index.
   */
  panoramaElement: Element | undefined;
  consumers: number;
};

export type ZIndexState = {
  zIndexMap: Record<number, ZIndexEntry>;
};

function buildInitialMap(): Record<number, ZIndexEntry> {
  const map: Record<number, ZIndexEntry> = {};
  for (const z of Object.values(DefaultZIndexes)) {
    map[z] = { element: undefined, panoramaElement: undefined, consumers: 0 };
  }
  return map;
}

export const initialZIndexState: ZIndexState = {
  zIndexMap: buildInitialMap(),
};

const defaultZIndexSet = new Set<number>(Object.values(DefaultZIndexes));
function isDefaultZIndex(zIndex: number): boolean {
  return defaultZIndexSet.has(zIndex);
}

export interface ZIndexActions {
  registerZIndexPortal(payload: { zIndex: number }): void;
  unregisterZIndexPortal(payload: { zIndex: number }): void;
  registerZIndexPortalElement(payload: {
    zIndex: number;
    element: Element;
    isPanorama: boolean;
  }): void;
  unregisterZIndexPortalElement(payload: { zIndex: number; isPanorama: boolean }): void;
}

export interface ZIndexSlice {
  readonly state: ZIndexState;
  readonly actions: ZIndexActions;
}

export function createZIndexSlice(initialState: ZIndexState = initialZIndexState): ZIndexSlice {
  // Deep-copy the entries: a shallow `{ ...initialState.zIndexMap }` would make
  // every chart's store wrap the SAME module-level ZIndexEntry objects from
  // `initialZIndexState`, so one chart registering its portal <g> would
  // overwrite every other chart's portal element (graphical items then portal
  // into a different chart's svg).
  const [state, setState] = createStore<ZIndexState>({
    zIndexMap: Object.fromEntries(
      Object.entries(initialState.zIndexMap).map(([z, entry]) => [z, { ...entry }]),
    ),
  });

  const actions: ZIndexActions = {
    registerZIndexPortal({ zIndex }) {
      setState(
        produce((s) => {
          const entry = s.zIndexMap[zIndex];
          if (entry) {
            entry.consumers += 1;
          } else {
            s.zIndexMap[zIndex] = { consumers: 1, element: undefined, panoramaElement: undefined };
          }
        }),
      );
    },
    unregisterZIndexPortal({ zIndex }) {
      setState(
        produce((s) => {
          const entry = s.zIndexMap[zIndex];
          if (entry) {
            entry.consumers -= 1;
            // Garbage-collect unused entries, except default z-indexes (always
            // rendered, so their portal provider stays mounted and won't re-register).
            if (entry.consumers <= 0 && !isDefaultZIndex(zIndex)) {
              delete s.zIndexMap[zIndex];
            }
          }
        }),
      );
    },
    registerZIndexPortalElement({ zIndex, element, isPanorama }) {
      setState(
        produce((s) => {
          const entry = s.zIndexMap[zIndex];
          if (entry) {
            if (isPanorama) {
              entry.panoramaElement = element;
            } else {
              entry.element = element;
            }
          } else {
            s.zIndexMap[zIndex] = {
              consumers: 0,
              element: isPanorama ? undefined : element,
              panoramaElement: isPanorama ? element : undefined,
            };
          }
        }),
      );
    },
    unregisterZIndexPortalElement({ zIndex, isPanorama }) {
      setState(
        produce((s) => {
          const entry = s.zIndexMap[zIndex];
          if (entry) {
            if (isPanorama) {
              entry.panoramaElement = undefined;
            } else {
              entry.element = undefined;
            }
          }
        }),
      );
    },
  };

  return { state, actions };
}
