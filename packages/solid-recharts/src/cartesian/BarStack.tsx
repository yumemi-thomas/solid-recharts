// Ported from recharts 3.8.1 src/cartesian/BarStack.tsx (commit 7a23854).
// Solid deviations: `resolveDefaultProps`→`merge`; React context → Solid `createContext`;
// `useMemo`→plain object; `React.memo`/`propsAreEqual` omitted (Solid comp granularity).
import { createContext, createMemo, For, merge, Show, useContext } from "solid-js";
import type { JSX } from "@solidjs/web";
import { getNormalizedStackId, type NormalizedStackId, type StackId } from "../util/ChartUtils";
import { useUniqueId } from "../util/useUniqueId";
import { useAppSelector } from "../state/hooks";
import { selectStackRects } from "../state/selectors/barStackSelectors";
import { useIsPanorama } from "../context/PanoramaContext";
import { Layer, type LayerProps } from "../container/Layer";
import { Rectangle, type RectRadius } from "../shape/Rectangle";

export type BarStackProps = {
  /**
   * When two Bars have the same axisId and same stackId, then the two Bars are stacked in the chart.
   * This prop sets the stack ID for all Bar components inside this BarStack component.
   * If undefined, a unique id will be generated automatically.
   *
   * When both BarStack and individual Bar components have stackId defined,
   * the BarStack's stackId wins, and the individual Bar's stackId is ignored.
   */
  stackId?: StackId;
  /**
   * Radius applies only once to all bars inside of this stack group,
   * as if they were one huge bar.
   *
   * @defaultValue 0
   */
  radius?: RectRadius;
  children?: JSX.Element;
};

export type BarStackSettings = {
  stackId: NormalizedStackId;
  radius: RectRadius;
};

const BarStackContext = createContext<BarStackSettings | null>(null);

/**
 * Hook to resolve the stack ID for a Bar component.
 * If a stack ID is provided via props, it is used directly.
 * Otherwise, this will read stack ID from BarStack context if available.
 * If both are undefined, it returns undefined.
 */
export const useStackId = (childStackId: StackId | undefined): NormalizedStackId | undefined => {
  const stackSettings = useContext(BarStackContext);
  if (stackSettings != null) {
    return stackSettings.stackId;
  }
  if (childStackId == null) {
    return undefined;
  }
  return getNormalizedStackId(childStackId);
};

export const defaultBarStackProps = {
  radius: 0,
} as const satisfies Partial<BarStackProps>;

const getClipPathId = (stackId: NormalizedStackId, index: number): string => {
  return `recharts-bar-stack-clip-path-${stackId}-${index}`;
};

export const useBarStackClipPathUrl = (index: number): string | undefined => {
  const barStackContext = useContext(BarStackContext);
  if (barStackContext == null) {
    return undefined;
  }
  const { stackId } = barStackContext;
  return `url(#${getClipPathId(stackId, index)})`;
};

export const BarStackClipLayer = (props: LayerProps & { index: number }): JSX.Element => {
  // Memoized so `props.index` is read in a tracking scope: when an index-keyed
  // <For> feeds a reactive `entry.originalDataIndex` here, a bare hook call would
  // read it untracked (STRICT_READ_UNTRACKED) and never update.
  const clipPathUrl = createMemo(() => useBarStackClipPathUrl(props.index));
  return (
    <Layer
      class={["recharts-bar-stack-layer", props.class].filter(Boolean).join(" ")}
      clipPath={clipPathUrl()}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onClick={props.onClick}
      onMouseOver={props.onMouseOver}
      onMouseOut={props.onMouseOut}
      onTouchMove={props.onTouchMove}
      onTouchEnd={props.onTouchEnd}
      ref={props.ref}
    >
      {props.children}
    </Layer>
  );
};

/**
 * Renders a clipPath that individual bars in the stack reference
 * to achieve rounded corners for the entire stack.
 */
const BarStackClipPath = (props: {
  stackId: NormalizedStackId;
  radius: RectRadius;
}): JSX.Element => {
  const isPanorama = useIsPanorama();
  const positions = useAppSelector((state) => selectStackRects(state, props.stackId, isPanorama));
  const hasPositions = createMemo(() => {
    const pos = positions();
    return pos != null && pos.length > 0;
  });

  return (
    <Show when={hasPositions()}>
      <defs>
        <For each={positions()}>
          {(pos, index) =>
            pos == null ? null : (
              <clipPath id={getClipPathId(props.stackId, index())}>
                <Rectangle
                  isAnimationActive={false}
                  isUpdateAnimationActive={false}
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  radius={props.radius}
                />
              </clipPath>
            )
          }
        </For>
      </defs>
    </Show>
  );
};

export const BarStack = (props: BarStackProps): JSX.Element => {
  const merged = merge(defaultBarStackProps, props);
  const resolvedStackId = useUniqueId("recharts-bar-stack", getNormalizedStackId(merged.stackId));
  const context: BarStackSettings = {
    stackId: resolvedStackId,
    radius: merged.radius,
  };
  return (
    <BarStackContext value={context}>
      <BarStackClipPath stackId={resolvedStackId} radius={merged.radius} />
      {props.children}
    </BarStackContext>
  );
};
