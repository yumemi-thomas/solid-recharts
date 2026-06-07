// Ported from recharts 3.8.1 src/polar/PolarRadiusAxis.tsx (commit 7a23854).
//
// MINIMAL PORT — registers a RadiusAxisSettings into the polarAxis slice and
// renders the axis line (a single <line> from the min to max tick radius along
// `angle`) + one <Text> label per tick. Pure geometry helpers copied verbatim.
//
// Solid deviations: `resolveDefaultProps`→`merge`; SetRadiusAxisSettings effect
// → `createEffect`/`onCleanup` (add overwrites by id); `clsx`→joined string.
// DEFERRED (documented): ZIndexLayer (plain <Layer>); `label` + PolarLabelContext
// (the polar Label path is not ported); custom `tick` element/function (default
// <Text> only); object `axisLine` presentation merge (boolean honored); events.
import { createEffect, For, merge, onCleanup, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { Layer } from "../container/Layer";
import { Text } from "../component/Text";
import {
  type ImplicitLabelType,
  PolarLabelContextProvider,
  PolarLabelFromLabelProp,
} from "../component/Label";
import {
  AxisDomain,
  AxisDomainTypeInput,
  AxisTick,
  Coordinate,
  DataKey,
  ScaleType,
  TickItem,
  TickProp,
} from "../util/types";
import { NiceTicksAlgorithm } from "../state/cartesianAxisSlice";
import { RadiusAxisSettings } from "../state/polarAxisSlice";
import { polarToCartesian } from "../util/PolarUtils";
import { isNumOrStr } from "../util/DataUtils";
import { selectPolarAxisScale, selectPolarAxisTicks } from "../state/selectors/polarScaleSelectors";
import { selectPolarViewBox } from "../state/selectors/polarAxisSelectors";
import { usePolarChartLayout } from "../context/chartLayoutContext";
import { getAxisTypeBasedOnLayout } from "../util/getAxisTypeBasedOnLayout";
import { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";

type TickOrientation = "left" | "right" | "middle";

export interface PolarRadiusAxisProps<DataPointType = unknown, DataValueType = unknown> {
  radiusAxisId?: string | number;
  /** Center x; defaults to the chart's polar center. */
  cx?: number;
  /** Center y; defaults to the chart's polar center. */
  cy?: number;
  /** Axis title; rendered via the polar Label path. */
  label?: ImplicitLabelType;
  angle?: number;
  type?: AxisDomainTypeInput;
  dataKey?: DataKey<DataPointType, DataValueType>;
  domain?: AxisDomain;
  scale?:
    | ScaleType
    | CustomScaleDefinition
    | CustomScaleDefinition<string>
    | CustomScaleDefinition<number>
    | CustomScaleDefinition<Date>;
  orientation?: TickOrientation;
  ticks?: ReadonlyArray<AxisTick>;
  tick?: TickProp<unknown>;
  tickCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  axisLine?: boolean;
  allowDecimals?: boolean;
  allowDuplicatedCategory?: boolean;
  allowDataOverflow?: boolean;
  reversed?: boolean;
  includeHidden?: boolean;
  niceTicks?: NiceTicksAlgorithm;
  name?: string;
  stroke?: string;
  hide?: boolean;
  class?: string;
}

export const polarRadiusAxisDefaultProps = {
  allowDataOverflow: false,
  allowDecimals: false,
  allowDuplicatedCategory: true,
  angle: 0,
  axisLine: true,
  includeHidden: false,
  hide: false,
  niceTicks: "auto",
  orientation: "right",
  radiusAxisId: 0,
  reversed: false,
  scale: "auto",
  stroke: "#ccc",
  tick: true,
  tickCount: 5,
  type: "auto",
} as const satisfies Partial<PolarRadiusAxisProps>;

// The polar label viewBox spans from the smallest to the largest tick radius
// (matches recharts' getViewBox via maxBy/minBy on tick.coordinate).
const minTickCoordinate = (ticks: ReadonlyArray<TickItem>): number =>
  ticks.reduce((min, t) => Math.min(min, t.coordinate || 0), Infinity) === Infinity
    ? 0
    : ticks.reduce((min, t) => Math.min(min, t.coordinate || 0), Infinity);

const maxTickCoordinate = (ticks: ReadonlyArray<TickItem>): number =>
  ticks.reduce((max, t) => Math.max(max, t.coordinate || 0), 0);

const getTickTextAnchor = (orientation: TickOrientation): "start" | "end" | "middle" => {
  switch (orientation) {
    case "left":
      return "end";
    case "right":
      return "start";
    default:
      return "middle";
  }
};

interface RadiusTickProps {
  entry: TickItem;
  index: number;
  cx: number;
  cy: number;
  angle: number;
  orientation: TickOrientation;
  stroke: string | undefined;
  tickFormatter: ((value: unknown, index: number) => string) | undefined;
}

// Extracted child so prop reads happen inside a tracking scope (JSX), not a
// <For> callback body (which would fire STRICT_READ_UNTRACKED).
const RadiusAxisTick = (props: RadiusTickProps): JSX.Element => {
  const coord = (): Coordinate =>
    polarToCartesian(props.cx, props.cy, props.entry.coordinate, props.angle);
  const value = (): string | number => {
    if (props.tickFormatter) {
      return props.tickFormatter(props.entry.value, props.index);
    }
    return isNumOrStr(props.entry.value) ? props.entry.value : String(props.entry.value);
  };
  return (
    <Layer class="recharts-polar-radius-axis-tick">
      <Text
        class="recharts-polar-radius-axis-tick-value"
        stroke="none"
        fill={props.stroke}
        x={coord().x}
        y={coord().y}
        // recharts rotates the tick text itself by `90 - angle` around (x, y).
        angle={90 - props.angle}
        textAnchor={getTickTextAnchor(props.orientation)}
      >
        {value()}
      </Text>
    </Layer>
  );
};

export function PolarRadiusAxis<DataPointType = unknown, DataValueType = unknown>(
  props: PolarRadiusAxisProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const layout = usePolarChartLayout();
  const merged = merge(polarRadiusAxisDefaultProps, props);

  let prev: RadiusAxisSettings | null = null;

  createEffect(
    (): RadiusAxisSettings | undefined => {
      const evaluatedType = getAxisTypeBasedOnLayout(layout(), "radiusAxis", merged.type);
      if (evaluatedType == null) {
        return undefined;
      }
      return {
        id: merged.radiusAxisId,
        scale: merged.scale,
        type: evaluatedType,
        dataKey: merged.dataKey,
        unit: undefined,
        name: merged.name,
        allowDuplicatedCategory: merged.allowDuplicatedCategory,
        allowDataOverflow: merged.allowDataOverflow,
        reversed: merged.reversed,
        includeHidden: merged.includeHidden,
        domain: merged.domain,
        allowDecimals: merged.allowDecimals,
        tickCount: merged.tickCount,
        ticks: merged.ticks,
        tick: merged.tick,
        niceTicks: merged.niceTicks,
      };
    },
    (settings) => {
      if (settings == null || store == null) {
        return;
      }
      store.actions.polarAxis.addRadiusAxis(settings);
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.polarAxis.removeRadiusAxis(prev);
      prev = null;
    }
  });

  const viewBox = useAppSelector(selectPolarViewBox);
  const scale = useAppSelector((state) =>
    selectPolarAxisScale(state, "radiusAxis", merged.radiusAxisId),
  );
  const ticks = useAppSelector((state) =>
    selectPolarAxisTicks(state, "radiusAxis", merged.radiusAxisId, false),
  );

  const renderData = (): { cx: number; cy: number; ticks: ReadonlyArray<TickItem> } | null => {
    const vb = viewBox();
    const t = ticks();
    if (vb == null || scale() == null || t == null || t.length === 0 || merged.hide) {
      return null;
    }
    return { cx: vb.cx, cy: vb.cy, ticks: t };
  };

  const axisClass = (): string =>
    ["recharts-polar-radius-axis", "radiusAxis", merged.class]
      .filter((c): c is string => Boolean(c))
      .join(" ");

  // Axis line endpoints: min→max tick radius along `angle`.
  const axisLineCoords = (rd: {
    cx: number;
    cy: number;
    ticks: ReadonlyArray<TickItem>;
  }): { x1: number; y1: number; x2: number; y2: number } => {
    const extent = rd.ticks.reduce<[number, number]>(
      (result, entry) => [
        Math.min(result[0], entry.coordinate),
        Math.max(result[1], entry.coordinate),
      ],
      [Infinity, -Infinity],
    );
    const p0 = polarToCartesian(rd.cx, rd.cy, extent[0], merged.angle);
    const p1 = polarToCartesian(rd.cx, rd.cy, extent[1], merged.angle);
    return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
  };

  return (
    <Show when={renderData()}>
      {(rd) => (
        <Layer class={axisClass()}>
          <Show when={merged.axisLine}>
            <line
              class="recharts-polar-radius-axis-line"
              fill="none"
              stroke={merged.stroke}
              x1={axisLineCoords(rd()).x1}
              y1={axisLineCoords(rd()).y1}
              x2={axisLineCoords(rd()).x2}
              y2={axisLineCoords(rd()).y2}
            />
          </Show>
          <Show when={merged.tick}>
            <Layer class="recharts-polar-radius-axis-ticks">
              <For each={rd().ticks}>
                {(entry, i) => (
                  <RadiusAxisTick
                    entry={entry}
                    index={i()}
                    cx={rd().cx}
                    cy={rd().cy}
                    angle={merged.angle}
                    orientation={merged.orientation}
                    stroke={merged.stroke}
                    tickFormatter={merged.tickFormatter}
                  />
                )}
              </For>
            </Layer>
          </Show>
          <PolarLabelContextProvider
            cx={rd().cx}
            cy={rd().cy}
            startAngle={merged.angle}
            endAngle={merged.angle}
            innerRadius={minTickCoordinate(rd().ticks)}
            outerRadius={maxTickCoordinate(rd().ticks)}
            clockWise={false}
          >
            <PolarLabelFromLabelProp label={merged.label} />
          </PolarLabelContextProvider>
        </Layer>
      )}
    </Show>
  );
}
