// Ported from recharts 3.8.1 src/polar/PolarAngleAxis.tsx (commit 7a23854).
//
// MINIMAL PORT — registers an AngleAxisSettings into the polarAxis slice and
// renders the axis line (Polygon/Dot) + one tick (line + <Text> label) per tick.
// Pure geometry helpers (getTickLineCoord/getTickTextAnchor/getTickTextVerticalAnchor)
// are copied verbatim.
//
// Solid deviations: `resolveDefaultProps`→`merge`; the SetAngleAxisSettings
// effect-dispatch → `createEffect`/`onCleanup` (add overwrites by id, so no
// separate replace); `clsx`→joined string; events handled via Solid delegation.
// DEFERRED (documented): ZIndexLayer (plain <Layer>); custom `tick`
// element/function (renders the default <Text> only); object `axisLine`/`tickLine`
// presentation merge (boolean honored); `label` (axis title); tick events.
import { createEffect, For, merge, onCleanup, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { Layer } from "../container/Layer";
import { Dot } from "../shape/Dot";
import { Polygon } from "../shape/Polygon";
import { Text, TextAnchor, TextVerticalAnchor } from "../component/Text";
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
import { AngleAxisSettings } from "../state/polarAxisSlice";
import { degreeToRadian, polarToCartesian } from "../util/PolarUtils";
import { isNumOrStr } from "../util/DataUtils";
import {
  selectPolarAngleAxisTicks,
  selectPolarAxisScale,
} from "../state/selectors/polarScaleSelectors";
import { selectPolarViewBox } from "../state/selectors/polarAxisSelectors";
import { useIsPanorama } from "../context/PanoramaContext";
import { usePolarChartLayout } from "../context/chartLayoutContext";
import { getAxisTypeBasedOnLayout } from "../util/getAxisTypeBasedOnLayout";
import { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";

const eps = 1e-5;
const COS_45 = Math.cos(degreeToRadian(45));

export interface PolarAngleAxisProps<DataPointType = unknown, DataValueType = unknown> {
  angleAxisId?: string | number;
  /** HTML id attribute for the axis layer. */
  id?: string;
  type?: AxisDomainTypeInput;
  dataKey?: DataKey<DataPointType, DataValueType>;
  domain?: AxisDomain;
  allowDuplicatedCategory?: boolean;
  allowDataOverflow?: boolean;
  includeHidden?: boolean;
  scale?:
    | ScaleType
    | CustomScaleDefinition
    | CustomScaleDefinition<string>
    | CustomScaleDefinition<number>
    | CustomScaleDefinition<Date>;
  // DEVIATION: recharts types this `ReadonlyArray<TickItem>` but the axis-settings
  // store wants `AxisTick` (recharts bridges with a @ts-expect-error). We align to
  // `AxisTick` to stay assertion-free.
  ticks?: ReadonlyArray<AxisTick>;
  tick?: TickProp<unknown>;
  tickCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  tickLine?: boolean;
  tickSize?: number;
  axisLine?: boolean;
  axisLineType?: "polygon" | "circle";
  orientation?: "inner" | "outer";
  reversed?: boolean;
  allowDecimals?: boolean;
  name?: string;
  stroke?: string;
  hide?: boolean;
  niceTicks?: NiceTicksAlgorithm;
  class?: string;
}

export const polarAngleAxisDefaultProps = {
  allowDecimals: false,
  angleAxisId: 0,
  axisLine: true,
  axisLineType: "polygon",
  hide: false,
  niceTicks: "auto",
  orientation: "outer",
  reversed: false,
  scale: "auto",
  tick: true,
  tickLine: true,
  tickSize: 8,
  type: "auto",
} as const satisfies Partial<PolarAngleAxisProps>;

/** Endpoints of a tick line: (x1,y1) at the axis, (x2,y2) at the label. */
const getTickLineCoord = (
  data: TickItem,
  cx: number,
  cy: number,
  radius: number,
  orientation: "inner" | "outer",
  tickSize: number,
): { x1: number; y1: number; x2: number; y2: number } => {
  const tickLineSize = tickSize || 8;
  const p1 = polarToCartesian(cx, cy, radius, data.coordinate);
  const p2 = polarToCartesian(
    cx,
    cy,
    radius + (orientation === "inner" ? -1 : 1) * tickLineSize,
    data.coordinate,
  );
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
};

const getTickTextAnchor = (data: TickItem, orientation: "inner" | "outer"): TextAnchor => {
  const cos = Math.cos(degreeToRadian(-data.coordinate));
  if (cos > eps) {
    return orientation === "outer" ? "start" : "end";
  }
  if (cos < -eps) {
    return orientation === "outer" ? "end" : "start";
  }
  return "middle";
};

const getTickTextVerticalAnchor = (data: TickItem): TextVerticalAnchor => {
  const cos = Math.cos(degreeToRadian(-data.coordinate));
  const sin = Math.sin(degreeToRadian(-data.coordinate));
  if (Math.abs(cos) <= COS_45) {
    return sin > 0 ? "start" : "end";
  }
  return "middle";
};

interface AngleTickProps {
  entry: TickItem;
  index: number;
  cx: number;
  cy: number;
  radius: number;
  orientation: "inner" | "outer";
  tickSize: number;
  tickLine: boolean;
  stroke: string | undefined;
  tickFormatter: ((value: unknown, index: number) => string) | undefined;
}

// Extracted child so every `props.*` read happens inside a tracking scope (JSX);
// a derived-prop computation in a <For> callback body would fire STRICT_READ_UNTRACKED.
const AngleAxisTick = (props: AngleTickProps): JSX.Element => {
  const lineCoord = (): { x1: number; y1: number; x2: number; y2: number } =>
    getTickLineCoord(
      props.entry,
      props.cx,
      props.cy,
      props.radius,
      props.orientation,
      props.tickSize,
    );
  const value = (): string | number => {
    if (props.tickFormatter) {
      return props.tickFormatter(props.entry.value, props.index);
    }
    return isNumOrStr(props.entry.value) ? props.entry.value : String(props.entry.value);
  };
  return (
    <Layer class="recharts-polar-angle-axis-tick">
      <Show when={props.tickLine}>
        <line
          class="recharts-polar-angle-axis-tick-line"
          fill="none"
          stroke={props.stroke}
          x1={lineCoord().x1}
          y1={lineCoord().y1}
          x2={lineCoord().x2}
          y2={lineCoord().y2}
        />
      </Show>
      <Text
        class="recharts-polar-angle-axis-tick-value"
        stroke="none"
        fill={props.stroke}
        x={lineCoord().x2}
        y={lineCoord().y2}
        textAnchor={getTickTextAnchor(props.entry, props.orientation)}
        verticalAnchor={getTickTextVerticalAnchor(props.entry)}
      >
        {value()}
      </Text>
    </Layer>
  );
};

export function PolarAngleAxis<DataPointType = unknown, DataValueType = unknown>(
  props: PolarAngleAxisProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const layout = usePolarChartLayout();
  const merged = merge(polarAngleAxisDefaultProps, props);
  const isPanorama = useIsPanorama();

  let prev: AngleAxisSettings | null = null;

  createEffect(
    (): AngleAxisSettings | undefined => {
      const evaluatedType = getAxisTypeBasedOnLayout(layout(), "angleAxis", merged.type);
      if (evaluatedType == null) {
        return undefined;
      }
      return {
        id: merged.angleAxisId,
        scale: merged.scale,
        type: evaluatedType,
        dataKey: merged.dataKey,
        unit: undefined,
        name: merged.name,
        // Ignored on purpose: axis calc behaves as if false (recharts note).
        allowDuplicatedCategory: false,
        allowDataOverflow: false,
        reversed: merged.reversed,
        includeHidden: false,
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
      // addAngleAxis overwrites by id, so it doubles as replace-on-change.
      store.actions.polarAxis.addAngleAxis(settings);
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.polarAxis.removeAngleAxis(prev);
      prev = null;
    }
  });

  const viewBox = useAppSelector(selectPolarViewBox);
  const scale = useAppSelector((state) =>
    selectPolarAxisScale(state, "angleAxis", merged.angleAxisId),
  );
  const ticks = useAppSelector((state) =>
    selectPolarAngleAxisTicks(state, "angleAxis", merged.angleAxisId, isPanorama),
  );

  const renderData = (): {
    cx: number;
    cy: number;
    radius: number;
    ticks: ReadonlyArray<TickItem>;
  } | null => {
    const vb = viewBox();
    const t = ticks();
    if (vb == null || scale() == null || t == null || t.length === 0 || merged.hide) {
      return null;
    }
    return { cx: vb.cx, cy: vb.cy, radius: vb.outerRadius, ticks: t };
  };

  const axisClass = (): string =>
    ["recharts-polar-angle-axis", "angleAxis", merged.class]
      .filter((c): c is string => Boolean(c))
      .join(" ");

  const axisLinePoints = (rd: {
    cx: number;
    cy: number;
    radius: number;
    ticks: ReadonlyArray<TickItem>;
  }): Coordinate[] =>
    rd.ticks.map((entry) => polarToCartesian(rd.cx, rd.cy, rd.radius, entry.coordinate));

  return (
    <Show when={renderData()}>
      {(rd) => (
        <Layer class={axisClass()}>
          <Show when={merged.axisLine}>
            <Show
              when={merged.axisLineType === "circle"}
              fallback={
                <Polygon
                  class="recharts-polar-angle-axis-line"
                  fill="none"
                  stroke={merged.stroke}
                  points={axisLinePoints(rd())}
                />
              }
            >
              <Dot
                class="recharts-polar-angle-axis-line"
                fill="none"
                stroke={merged.stroke}
                cx={rd().cx}
                cy={rd().cy}
                r={rd().radius}
              />
            </Show>
          </Show>
          <Layer class="recharts-polar-angle-axis-ticks">
            <For each={rd().ticks}>
              {(entry, i) => (
                <AngleAxisTick
                  entry={entry}
                  index={i()}
                  cx={rd().cx}
                  cy={rd().cy}
                  radius={rd().radius}
                  orientation={merged.orientation}
                  tickSize={merged.tickSize}
                  tickLine={merged.tickLine}
                  stroke={merged.stroke}
                  tickFormatter={merged.tickFormatter}
                />
              )}
            </For>
          </Layer>
        </Layer>
      )}
    </Show>
  );
}
