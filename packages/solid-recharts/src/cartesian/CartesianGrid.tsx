// Ported from recharts 3.8.1 src/cartesian/CartesianGrid.tsx (commit 7a23854).
//
// MINIMAL PORT — draws the horizontal + vertical grid lines. The line positions
// come from the rendered axis ticks (selectTicksOfAxis), which match the drawn
// axis. Deferred (documented): the getCoordinatesOfGrid tick generator + its
// `syncWithTicks`/offset nuances, stripe fills (horizontalFill/verticalFill),
// background fill rect, custom line render functions / elements, ZIndexLayer.
// Solid deviations: hooks return accessors; `className`→`class`.
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useOffsetInternal } from "../context/chartLayoutContext";
import { selectTicksOfAxis } from "../state/selectors/axisSelectors";
import { AxisId } from "../state/cartesianAxisSlice";
import { isPositiveNumber } from "../util/isWellBehavedNumber";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";

export interface CartesianGridProps {
  horizontal?: boolean;
  vertical?: boolean;
  stroke?: string;
  strokeOpacity?: number | string;
  strokeDasharray?: string | number;
  horizontalPoints?: ReadonlyArray<number>;
  verticalPoints?: ReadonlyArray<number>;
  xAxisId?: AxisId;
  yAxisId?: AxisId;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  class?: string;
}

const cartesianGridDefaults = {
  horizontal: true,
  vertical: true,
  stroke: "#ccc",
  xAxisId: 0,
  yAxisId: 0,
} as const satisfies Partial<CartesianGridProps>;

export const CartesianGrid = (props: CartesianGridProps): JSX.Element => {
  const merged = merge(cartesianGridDefaults, props);
  const isPanorama = useIsPanorama();
  const offset = useOffsetInternal();
  const xTicks = useAppSelector((state) =>
    selectTicksOfAxis(state, "xAxis", merged.xAxisId, isPanorama),
  );
  const yTicks = useAppSelector((state) =>
    selectTicksOfAxis(state, "yAxis", merged.yAxisId, isPanorama),
  );

  const geom = createMemo(() => {
    const o = offset();
    const x = merged.x ?? o.left;
    const y = merged.y ?? o.top;
    const width = merged.width ?? o.width;
    const height = merged.height ?? o.height;
    const verticalPoints = merged.verticalPoints ?? (xTicks() ?? []).map((tick) => tick.coordinate);
    const horizontalPoints =
      merged.horizontalPoints ?? (yTicks() ?? []).map((tick) => tick.coordinate);
    return { x, y, width, height, verticalPoints, horizontalPoints };
  });

  // stroke-dasharray accepts only string in JSX; coerce the number form.
  const dash = (): string | undefined =>
    merged.strokeDasharray == null ? undefined : String(merged.strokeDasharray);

  return (
    <Show when={isPositiveNumber(geom().width) && isPositiveNumber(geom().height) && !isPanorama}>
      <g class={["recharts-cartesian-grid", merged.class]}>
        <Show when={merged.horizontal}>
          <g class="recharts-cartesian-grid-horizontal">
            <For each={geom().horizontalPoints}>
              {(yPoint) => (
                <line
                  stroke={merged.stroke}
                  stroke-dasharray={dash()}
                  fill="none"
                  // recharts emits the grid box x/y/width/height on each line (non-line
                  // SVG attrs) — spread via the canonical helper to keep parity + types.
                  {...svgPropertiesNoEvents({
                    x: geom().x,
                    y: geom().y,
                    width: geom().width,
                    height: geom().height,
                  })}
                  x1={geom().x}
                  y1={yPoint}
                  x2={geom().x + geom().width}
                  y2={yPoint}
                />
              )}
            </For>
          </g>
        </Show>
        <Show when={merged.vertical}>
          <g class="recharts-cartesian-grid-vertical">
            <For each={geom().verticalPoints}>
              {(xPoint) => (
                <line
                  stroke={merged.stroke}
                  stroke-dasharray={dash()}
                  fill="none"
                  {...svgPropertiesNoEvents({
                    x: geom().x,
                    y: geom().y,
                    width: geom().width,
                    height: geom().height,
                  })}
                  x1={xPoint}
                  y1={geom().y}
                  x2={xPoint}
                  y2={geom().y + geom().height}
                />
              )}
            </For>
          </g>
        </Show>
      </g>
    </Show>
  );
};
