// Ported from recharts 3.8.1 src/zIndex/ZIndexPortal.tsx (commit 7a23854).
// Solid deviations: `useLayoutEffect` → two-arg `createEffect`; `className` → `class`.
import { createMemo, createSignal, For, onCleanup, onMount, createEffect, on } from "solid-js";
import type { JSX } from "solid-js";
import { useAppSelector, useAppStore } from "../state/hooks";
import { unregisterCleanup } from "../state/unregisterOnCleanup";
import { selectAllRegisteredZIndexes } from "./zIndexSelectors";

function ZIndexSvgPortal(props: { zIndex: number; isPanorama: boolean }): JSX.Element {
  const store = useAppStore();
  const zIndexActions = store?.actions.zIndex;
  const [gRef, setGRef] = createSignal<SVGGElement | undefined>();

  createEffect(
    on(
      () => ({
        zIndex: props.zIndex,
        isPanorama: props.isPanorama,
        element: gRef(),
      }),
      ({ zIndex, isPanorama, element }) => {
        const actions = zIndexActions;
        if (element != null && actions != null) {
          actions.registerZIndexPortalElement({
            zIndex,
            element,
            isPanorama,
          });
        }
      },
    ),
  );

  onMount(() => {
    const zIndex = props.zIndex;
    const isPanorama = props.isPanorama;
    onCleanup(
      unregisterCleanup(() => {
        zIndexActions?.unregisterZIndexPortalElement({
          zIndex,
          isPanorama,
        });
      }),
    );
  });

  return <g tabIndex={-1} class={`recharts-zIndex-layer_${props.zIndex}`} ref={setGRef} />;
}

export const AllZIndexPortals = (props: {
  children?: JSX.Element;
  isPanorama: boolean;
}): JSX.Element => {
  const allRegisteredZIndexes = useAppSelector(selectAllRegisteredZIndexes);
  const negativeZIndexes = createMemo(() =>
    (allRegisteredZIndexes() ?? []).filter((zIndex) => zIndex < 0),
  );
  const positiveZIndexes = createMemo(() =>
    (allRegisteredZIndexes() ?? []).filter((zIndex) => zIndex > 0),
  );

  return (
    <>
      <For each={negativeZIndexes()}>
        {(zIndex) => <ZIndexSvgPortal zIndex={zIndex} isPanorama={props.isPanorama} />}
      </For>
      {props.children}
      <For each={positiveZIndexes()}>
        {(zIndex) => <ZIndexSvgPortal zIndex={zIndex} isPanorama={props.isPanorama} />}
      </For>
    </>
  );
};
