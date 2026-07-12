// Ported from recharts 3.8.1 src/zIndex/ZIndexLayer.tsx (commit 7a23854).
// Solid deviations: `useLayoutEffect` → two-arg `createEffect`; `createPortal` →
// `<Portal mount>`; dispatch → `store.actions.zIndex`.
import {
  createEffect,
  createMemo,
  createRoot,
  getOwner,
  onCleanup,
  onSettled,
  runWithOwner,
  Show,
} from "solid-js";
import { Portal, type JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { unregisterCleanup } from "../state/unregisterOnCleanup";
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
    return unregisterCleanup(() => {
      const actions = zIndexActions;
      registeredZIndexes.forEach((z) => {
        actions?.unregisterZIndexPortal({ zIndex: z });
      });
      registeredZIndexes.clear();
    });
  });

  const targetElement = createMemo(() => portalElement() ?? lastPortalElement);

  // The portal target settles asynchronously (the <g> ref → register → selector),
  // so this Portal is created during a flush, NOT during the initial owned render.
  // Solid's runEffect invokes an effect's APPLY phase without re-establishing the
  // effect as owner, so <Portal>'s apply-phase `insert()` would create its child
  // render-effects with no owner (NO_OWNER_EFFECT — they never dispose). Capture the
  // component owner and create the Portal inside a `createRoot` parented to it, so
  // those effects are owned. The root's manual `dispose` is hooked to the keyed
  // <Show> branch's cleanup: when the target identity changes, the old Portal
  // subtree is torn down (parenting it to the component owner alone would leave
  // every previous Portal alive until the whole layer unmounts — stale chart
  // content stays portal'd into the old <g>).
  const owner = getOwner();

  return (
    <Show when={shouldRenderInPortal()} fallback={props.children}>
      <Show when={targetElement()} keyed>
        {(mount) => {
          let disposePortal: (() => void) | undefined;
          const rendered = runWithOwner(owner, () =>
            createRoot((dispose) => {
              disposePortal = dispose;
              return <Portal mount={mount}>{props.children}</Portal>;
            }),
          );
          onCleanup(() => disposePortal?.());
          return rendered;
        }}
      </Show>
    </Show>
  );
}
