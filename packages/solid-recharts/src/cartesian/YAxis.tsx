// Ported from recharts 3.8.1 src/cartesian/YAxis.tsx (commit 7a23854).
//
// MINIMAL / REGISTRATION-ONLY — see XAxis.tsx for the rationale and the Solid
// deviations (registration via createEffect + onCleanup, defaults resolved like
// recharts' resolveDefaultProps, visual <CartesianAxis> deferred).
import { createEffect, createMemo, onCleanup, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  NiceTicksAlgorithm,
  YAxisOrientation,
  YAxisPadding,
  YAxisSettings,
  YAxisWidth,
} from "../state/cartesianAxisSlice";
import {
  implicitYAxis,
  selectTicksOfAxis,
  selectYAxisPosition,
  selectYAxisSize,
} from "../state/selectors/axisSelectors";
import { CartesianAxis } from "./CartesianAxis";
import { RenderedTicksReporter } from "./RenderedTicksReporter";
import { useIsPanorama } from "../context/PanoramaContext";
import { useCartesianChartLayout } from "../context/chartLayoutContext";
import { getAxisTypeBasedOnLayout } from "../util/getAxisTypeBasedOnLayout";
import {
  AxisDomain,
  AxisDomainTypeInput,
  AxisInterval,
  AxisTick,
  DataKey,
  ScaleType,
  TickFormatter,
  TickProp,
} from "../util/types";
import { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";

export interface YAxisProps<DataPointType = unknown, DataValueType = unknown> {
  yAxisId?: string | number;
  type?: AxisDomainTypeInput;
  dataKey?: DataKey<DataPointType, DataValueType>;
  domain?: AxisDomain;
  scale?:
    | ScaleType
    | CustomScaleDefinition
    | CustomScaleDefinition<string>
    | CustomScaleDefinition<number>
    | CustomScaleDefinition<Date>;
  ticks?: ReadonlyArray<AxisTick>;
  tick?: TickProp<unknown>;
  tickCount?: number;
  tickFormatter?: TickFormatter;
  padding?: YAxisPadding;
  width?: YAxisWidth;
  orientation?: YAxisOrientation;
  mirror?: boolean;
  minTickGap?: number;
  interval?: AxisInterval;
  angle?: number;
  hide?: boolean;
  includeHidden?: boolean;
  reversed?: boolean;
  allowDataOverflow?: boolean;
  allowDecimals?: boolean;
  allowDuplicatedCategory?: boolean;
  name?: string;
  unit?: string;
  niceTicks?: NiceTicksAlgorithm;
}

export const yAxisDefaultProps = {
  allowDataOverflow: implicitYAxis.allowDataOverflow,
  allowDecimals: implicitYAxis.allowDecimals,
  allowDuplicatedCategory: implicitYAxis.allowDuplicatedCategory,
  angle: implicitYAxis.angle,
  hide: false,
  includeHidden: implicitYAxis.includeHidden,
  interval: implicitYAxis.interval,
  minTickGap: implicitYAxis.minTickGap,
  mirror: implicitYAxis.mirror,
  orientation: implicitYAxis.orientation,
  padding: implicitYAxis.padding,
  reversed: implicitYAxis.reversed,
  scale: implicitYAxis.scale,
  tick: implicitYAxis.tick,
  tickCount: implicitYAxis.tickCount,
  type: implicitYAxis.type,
  niceTicks: implicitYAxis.niceTicks,
  width: implicitYAxis.width,
  yAxisId: 0,
} as const;

function withDefault<T>(value: T | undefined, defaultValue: T): T {
  return value === undefined ? defaultValue : value;
}

export function YAxis<DataPointType = unknown, DataValueType = unknown>(
  props: YAxisProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const layout = useCartesianChartLayout();
  const yAxisId = createMemo(() => withDefault(props.yAxisId, yAxisDefaultProps.yAxisId));
  const hide = createMemo(() => withDefault(props.hide, yAxisDefaultProps.hide));
  const tick = createMemo(() => withDefault(props.tick, yAxisDefaultProps.tick));
  const shouldRenderTick = createMemo(() => {
    const value = tick();
    return typeof value === "boolean" ? value : true;
  });
  const tickFormatter = createMemo(() => props.tickFormatter);
  const orientation = createMemo(() =>
    withDefault(props.orientation, yAxisDefaultProps.orientation),
  );
  const unit = createMemo(() => props.unit);
  const mirror = createMemo(() => withDefault(props.mirror, yAxisDefaultProps.mirror));

  let prev: YAxisSettings | null = null;

  createEffect(
    (): YAxisSettings | undefined => {
      const evaluatedType = getAxisTypeBasedOnLayout(
        layout(),
        "yAxis",
        withDefault(props.type, yAxisDefaultProps.type),
      );
      if (evaluatedType == null) {
        return undefined;
      }
      return {
        id: yAxisId(),
        scale: withDefault(props.scale, yAxisDefaultProps.scale),
        type: evaluatedType,
        dataKey: props.dataKey,
        unit: unit(),
        name: props.name,
        allowDuplicatedCategory: withDefault(
          props.allowDuplicatedCategory,
          yAxisDefaultProps.allowDuplicatedCategory,
        ),
        allowDataOverflow: withDefault(
          props.allowDataOverflow,
          yAxisDefaultProps.allowDataOverflow,
        ),
        reversed: withDefault(props.reversed, yAxisDefaultProps.reversed),
        includeHidden: withDefault(props.includeHidden, yAxisDefaultProps.includeHidden),
        domain: props.domain,
        allowDecimals: withDefault(props.allowDecimals, yAxisDefaultProps.allowDecimals),
        tickCount: withDefault(props.tickCount, yAxisDefaultProps.tickCount),
        ticks: props.ticks,
        tick: tick(),
        niceTicks: withDefault(props.niceTicks, yAxisDefaultProps.niceTicks),
        interval: withDefault(props.interval, yAxisDefaultProps.interval),
        mirror: mirror(),
        minTickGap: withDefault(props.minTickGap, yAxisDefaultProps.minTickGap),
        angle: withDefault(props.angle, yAxisDefaultProps.angle),
        hide: hide(),
        tickFormatter: tickFormatter(),
        padding: withDefault(props.padding, yAxisDefaultProps.padding),
        width: withDefault(props.width, yAxisDefaultProps.width),
        orientation: orientation(),
      };
    },
    (settings) => {
      if (settings == null || store == null) {
        return;
      }
      if (prev === null) {
        store.actions.cartesianAxis.addYAxis(settings);
      } else if (prev !== settings) {
        store.actions.cartesianAxis.replaceYAxis({ prev, next: settings });
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.cartesianAxis.removeYAxis(prev);
      prev = null;
    }
  });

  // Visual: render the <CartesianAxis>. Never inside a Brush panorama.
  const isPanorama = useIsPanorama();
  const position = useAppSelector((state) => selectYAxisPosition(state, yAxisId()));
  const size = useAppSelector((state) => selectYAxisSize(state, yAxisId()));
  const ticks = useAppSelector((state) => selectTicksOfAxis(state, "yAxis", yAxisId(), isPanorama));
  const axisRender = createMemo(() => {
    const p = position();
    const s = size();
    const t = ticks();
    if (p == null || s == null || t == null) {
      return null;
    }
    return { position: p, size: s, ticks: t };
  });

  return (
    <Show when={!isPanorama && !hide() && axisRender()}>
      {(ar) => (
        <>
          <RenderedTicksReporter axisType="yAxis" axisId={yAxisId()} ticks={ar().ticks} />
          <CartesianAxis
            axisType="yAxis"
            x={ar().position.x}
            y={ar().position.y}
            width={ar().size.width}
            height={ar().size.height}
            orientation={orientation()}
            ticks={ar().ticks}
            tick={shouldRenderTick()}
            tickFormatter={tickFormatter()}
            interval={withDefault(props.interval, yAxisDefaultProps.interval)}
            unit={unit()}
            mirror={mirror()}
          />
        </>
      )}
    </Show>
  );
}
