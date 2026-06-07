// Ported from recharts 3.8.1 src/zIndex/ZIndexLayer.tsx (commit 7a23854).
// Solid deviations: `useLayoutEffect` → two-arg `createEffect`; `createPortal` →
// `<Portal mount>`; dispatch → `store.actions.zIndex`.
import { createEffect, createMemo, onSettled, Show } from "solid-js";
import { Portal, type JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { selectZIndexPortalElement } from "./zIndexSelectors";
import { useIsInChartContext } from "../context/chartLayoutContext";
import { useIsPanorama } from "../context/PanoramaContext";

export interface ZIndexable {
  /**
   * Z-Index of this component and its children. The higher the value,
   * the more on top it will be rendered.
   */
  zIndex?: number;
}

export function ZIndexLayer(props: {
  zIndex: number | undefined;
  children?: JSX.Element;
}): JSX.Element {
  const isInChartContext = useIsInChartContext();
  const isPanorama = useIsPanorama();
  const store = useAppStore();
  const zIndexActions = store?.actions.zIndex;

  let lastPortalElement: Element | undefined;
  const registeredZIndexes = new Set<number>();

  const shouldRenderInPortal = createMemo(() => {
    const zIndex = props.zIndex;
    return isInChartContext() && zIndex !== undefined && zIndex !== 0;
  });

  const portalElement = useAppSelector((state) =>
    selectZIndexPortalElement(state, props.zIndex, isPanorama),
  );

  createEffect(
    () => ({
      should: shouldRenderInPortal(),
      zIndex: props.zIndex,
      portal: portalElement(),
    }),
    ({ should, zIndex, portal }) => {
      const actions = zIndexActions;
      if (!should || zIndex === undefined || actions == null) {
        registeredZIndexes.forEach((z) => {
          actions?.unregisterZIndexPortal({ zIndex: z });
        });
        registeredZIndexes.clear();
        lastPortalElement = undefined;
        return;
      }

      if (!registeredZIndexes.has(zIndex)) {
        actions.registerZIndexPortal({ zIndex });
        registeredZIndexes.add(zIndex);
      }

      if (portal) {
        lastPortalElement = portal;
        registeredZIndexes.forEach((z) => {
          if (z !== zIndex) {
            actions.unregisterZIndexPortal({ zIndex: z });
            registeredZIndexes.delete(z);
          }
        });
      }
    },
  );

  onSettled(() => {
    return () => {
      const actions = zIndexActions;
      registeredZIndexes.forEach((z) => {
        actions?.unregisterZIndexPortal({ zIndex: z });
      });
      registeredZIndexes.clear();
    };
  });

  const targetElement = createMemo(() => portalElement() ?? lastPortalElement);

  return (
    <Show when={shouldRenderInPortal()} fallback={props.children}>
      <Show when={targetElement()}>
        {(mount) => <Portal mount={mount()}>{props.children}</Portal>}
      </Show>
    </Show>
  );
}
