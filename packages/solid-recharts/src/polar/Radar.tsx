// Ported from recharts 3.8.1 src/polar/Radar.tsx (commit 7a23854).
//
// MINIMAL PORT — registers a RadarSettings polar graphical item (so the angle
// axis gets a data-driven domain) and renders the radar <Polygon> from the
// computed points. `computeRadarPoints` is the pure point-geometry function,
// ported faithfully (incl. the isRange/baseLinePoints branch).
//
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch registration
// → `createEffect`/`onCleanup` (addPolarGraphicalItem matched by id); `clsx`→array.
// Tooltip-entry + legend-payload registration are WIRED (axis-type tooltip).
// DEFERRED (documented): dots / activeDot / ActivePoints, animation (renders the
// final t=1 frame — points directly), label (LabelList), custom `shape`,
// ZIndexLayer (plain <Layer>).
import { createEffect, createMemo, merge, onCleanup, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useIsPanorama } from "../context/PanoramaContext";
import { useUniqueId } from "../util/useUniqueId";
import type { EasingInput } from "../animation/easing";
import { Layer } from "../container/Layer";
import { Polygon } from "../shape/Polygon";
import { selectRadarPoints } from "../state/selectors/radarSelectors";
import { RadarSettings } from "../state/types/RadarSettings";
import { ChartData } from "../state/chartDataSlice";
import {
  ActiveDotType,
  AnimationDuration,
  Coordinate,
  DataKey,
  LegendType,
  TooltipType,
} from "../util/types";
import { polarToCartesian } from "../util/PolarUtils";
import { isNullish, noop } from "../util/DataUtils";
import { getTooltipNameProp, getValueByDataKey } from "../util/ChartUtils";
import { RechartsScale } from "../util/scale/RechartsScale";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";

/** recharts: stroke (if not "none") wins as the legend/tooltip color, else fill. */
const getLegendItemColor = (
  stroke: string | undefined,
  fill: string | undefined,
): string | undefined => (stroke != null && stroke !== "none" ? stroke : fill);

export interface RadarPoint {
  x: number;
  y: number;
  cx?: number;
  cy?: number;
  angle: number;
  radius?: number;
  value?: unknown;
  payload?: unknown;
  name?: string | number;
}

export type RadiusAxisForRadar = { scale: RechartsScale };
export type AngleAxisForRadar = {
  scale: RechartsScale;
  type: "number" | "category";
  dataKey: DataKey<unknown> | undefined;
  cx: number;
  cy: number;
};

export type RadarComposedData = {
  points: RadarPoint[];
  baseLinePoints: RadarPoint[];
  isRange: boolean;
};

export function computeRadarPoints({
  radiusAxis,
  angleAxis,
  displayedData,
  dataKey,
  bandSize,
}: {
  radiusAxis: RadiusAxisForRadar;
  angleAxis: AngleAxisForRadar;
  displayedData: ChartData;
  dataKey: DataKey<unknown> | undefined;
  bandSize: number;
}): RadarComposedData {
  const { cx, cy } = angleAxis;
  let isRange = false;
  const points: RadarPoint[] = [];
  const angleBandSize = angleAxis.type !== "number" ? (bandSize ?? 0) : 0;

  displayedData.forEach((entry, i) => {
    const name = getValueByDataKey(entry, angleAxis.dataKey, i);
    const value: unknown = getValueByDataKey(entry, dataKey);
    const angle: number = (angleAxis.scale.map(name) ?? 0) + angleBandSize;
    const pointValue: unknown =
      value != null && Array.isArray(value) ? value[value.length - 1] : value;
    const radius: number = isNullish(pointValue) ? 0 : (radiusAxis.scale.map(pointValue) ?? 0);

    if (value != null && Array.isArray(value) && value.length >= 2) {
      isRange = true;
    }

    points.push({
      ...polarToCartesian(cx, cy, radius, angle),
      name: typeof name === "string" || typeof name === "number" ? name : undefined,
      value,
      cx,
      cy,
      radius,
      angle,
      payload: entry,
    });
  });

  const baseLinePoints: RadarPoint[] = [];
  if (isRange) {
    points.forEach((point) => {
      if (point.value != null && Array.isArray(point.value)) {
        const baseValue: unknown = point.value[0];
        const radius: number = isNullish(baseValue) ? 0 : (radiusAxis.scale.map(baseValue) ?? 0);
        baseLinePoints.push({
          ...point,
          radius,
          ...polarToCartesian(cx, cy, radius, point.angle),
        });
      } else {
        baseLinePoints.push(point);
      }
    });
  }

  return { points, isRange, baseLinePoints };
}

export interface RadarProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  angleAxisId?: string | number;
  radiusAxisId?: string | number;
  dataKey?: DataKey<DataPointType, DataValueType>;
  name?: string | number;
  fill?: string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeWidth?: number | string;
  connectNulls?: boolean;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  hide?: boolean;
  activeDot?: ActiveDotType;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  id?: string;
  class?: string;
}

// Matches recharts' defaultRadarProps: NO fill/stroke defaults (the user supplies
// them; an unset fill renders as no `fill` attribute, like recharts).
export const radarDefaultProps = {
  activeDot: true,
  angleAxisId: 0,
  radiusAxisId: 0,
  hide: false,
  isAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  legendType: "rect",
} as const satisfies Partial<RadarProps>;

export function Radar<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: RadarProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const merged = merge(radarDefaultProps, props);
  const isPanorama = useIsPanorama();
  const id = useUniqueId("recharts-radar", props.id);

  let prev: RadarSettings | null = null;

  createEffect(
    (): RadarSettings => ({
      id,
      type: "radar",
      // Radar has no own data prop — it always reads the chart data.
      data: undefined,
      dataKey: merged.dataKey,
      hide: merged.hide,
      angleAxisId: merged.angleAxisId,
      radiusAxisId: merged.radiusAxisId,
    }),
    (settings) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.graphicalItems.addPolarGraphicalItem(settings);
      } else if (prev !== settings) {
        store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next: settings });
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.graphicalItems.removePolarGraphicalItem(prev);
      prev = null;
    }
  });

  const radar = useAppSelector((state) =>
    selectRadarPoints(state, merged.radiusAxisId, merged.angleAxisId, isPanorama, id),
  );

  const layerClass = (): string =>
    ["recharts-radar", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Radar is an axis-type tooltip item: it registers an entry (so the axis tooltip
  // can resolve its value) but does NOT carry per-point dataDefinedOnItem.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: undefined,
    getPosition: noop,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      nameKey: undefined,
      dataKey: merged.dataKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      unit: "",
      graphicalItemId: id,
    },
  }));

  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(() => [
    {
      inactive: merged.hide,
      dataKey: merged.dataKey,
      type: merged.legendType,
      color: getLegendItemColor(merged.stroke, merged.fill),
      value: getTooltipNameProp(merged.name, merged.dataKey),
    },
  ]);

  // RadarPoint is structurally a Coordinate ({x,y}+extras), so the arrays pass
  // straight to <Polygon> with no assertion.
  const baseLine = (): ReadonlyArray<Coordinate> | undefined => {
    const r = radar();
    return r?.isRange ? r.baseLinePoints : undefined;
  };

  // Animation is deferred in this port: render the settled t=1 polygon directly.
  const mainColor = getLegendItemColor(merged.stroke, merged.fill);
  const activeRadarPoints = createMemo((): ReadonlyArray<RadarPoint> | undefined =>
    merged.hide ? undefined : radar()?.points,
  );

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      {activeRadarPoints() ? (
        <RadarAnimatedContent
          stepData={activeRadarPoints() ?? []}
          baseLinePoints={untrack(baseLine)}
          layerClass={untrack(layerClass)}
          connectNulls={merged.connectNulls}
          fill={merged.fill}
          fillOpacity={merged.fillOpacity}
          stroke={merged.stroke}
          strokeWidth={merged.strokeWidth}
          activeDot={merged.activeDot}
          mainColor={mainColor}
          dataKey={merged.dataKey}
        />
      ) : null}
    </>
  );
}

function RadarAnimatedContent(props: {
  stepData: ReadonlyArray<RadarPoint>;
  baseLinePoints: ReadonlyArray<Coordinate> | undefined;
  layerClass: string;
  connectNulls: boolean | undefined;
  fill: string | undefined;
  fillOpacity: number | string | undefined;
  stroke: string | undefined;
  strokeWidth: number | string | undefined;
  activeDot: ActiveDotType;
  mainColor: string | undefined;
  dataKey: DataKey<unknown> | undefined;
}): JSX.Element {
  return (
    <>
      <Layer class={props.layerClass}>
        <Layer class="recharts-radar-polygon">
          <Polygon
            points={props.stepData}
            baseLinePoints={props.baseLinePoints}
            connectNulls={props.connectNulls}
            fill={props.fill}
            fill-opacity={props.fillOpacity}
            stroke={props.stroke}
            stroke-width={props.strokeWidth}
          />
        </Layer>
      </Layer>
    </>
  );
}
