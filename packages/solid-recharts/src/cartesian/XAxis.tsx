// Ported from recharts 3.8.1 src/cartesian/XAxis.tsx (commit 7a23854).
//
// MINIMAL / REGISTRATION-ONLY: the reference XAxis is two halves — `SetXAxisSettings`
// (pushes axis config into the cartesianAxis slice) and `XAxisImpl` (renders the
// `<CartesianAxis>` visual). Only the registration half is needed for graphical
// items (e.g. <Line>) to get a scale; the visual is deferred until `<CartesianAxis>`
// is ported. So this component registers settings and renders nothing.
//
// Solid deviations: `useAppDispatch` + `useLayoutEffect`/`prevSettingsRef` →
// `useAppStore()` + a single `createEffect((compute) => settings, (apply) => add/replace)`
// plus `onCleanup` for removal. Defaults are resolved field-by-field to match
// recharts' `resolveDefaultProps`: explicit `undefined` falls back to defaults.
import { createEffect, createMemo, onCleanup, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  NiceTicksAlgorithm,
  XAxisOrientation,
  XAxisPadding,
  XAxisSettings,
} from "../state/cartesianAxisSlice";
import {
  implicitXAxis,
  selectTicksOfAxis,
  selectXAxisPosition,
  selectXAxisSize,
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

export interface XAxisProps<DataPointType = unknown, DataValueType = unknown> {
  xAxisId?: string | number;
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
  padding?: XAxisPadding;
  height?: number;
  orientation?: XAxisOrientation;
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

export const xAxisDefaultProps = {
  allowDataOverflow: implicitXAxis.allowDataOverflow,
  allowDecimals: implicitXAxis.allowDecimals,
  allowDuplicatedCategory: implicitXAxis.allowDuplicatedCategory,
  angle: implicitXAxis.angle,
  height: implicitXAxis.height,
  hide: false,
  includeHidden: implicitXAxis.includeHidden,
  interval: implicitXAxis.interval,
  minTickGap: implicitXAxis.minTickGap,
  mirror: implicitXAxis.mirror,
  orientation: implicitXAxis.orientation,
  padding: implicitXAxis.padding,
  reversed: implicitXAxis.reversed,
  scale: implicitXAxis.scale,
  tick: implicitXAxis.tick,
  tickCount: implicitXAxis.tickCount,
  type: implicitXAxis.type,
  niceTicks: implicitXAxis.niceTicks,
  xAxisId: 0,
} as const;

function withDefault<T>(value: T | undefined, defaultValue: T): T {
  return value === undefined ? defaultValue : value;
}

export function XAxis<DataPointType = unknown, DataValueType = unknown>(
  props: XAxisProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const layout = useCartesianChartLayout();
  const xAxisId = createMemo(() => withDefault(props.xAxisId, xAxisDefaultProps.xAxisId));
  const hide = createMemo(() => withDefault(props.hide, xAxisDefaultProps.hide));
  const tick = createMemo(() => withDefault(props.tick, xAxisDefaultProps.tick));
  const shouldRenderTick = createMemo(() => {
    const value = tick();
    return typeof value === "boolean" ? value : true;
  });
  const tickFormatter = createMemo(() => props.tickFormatter);
  const orientation = createMemo(() =>
    withDefault(props.orientation, xAxisDefaultProps.orientation),
  );
  const unit = createMemo(() => props.unit);
  const mirror = createMemo(() => withDefault(props.mirror, xAxisDefaultProps.mirror));

  let prev: XAxisSettings | null = null;

  createEffect(
    (): XAxisSettings | undefined => {
      const evaluatedType = getAxisTypeBasedOnLayout(
        layout(),
        "xAxis",
        withDefault(props.type, xAxisDefaultProps.type),
      );
      if (evaluatedType == null) {
        return undefined;
      }
      return {
        id: xAxisId(),
        scale: withDefault(props.scale, xAxisDefaultProps.scale),
        type: evaluatedType,
        dataKey: props.dataKey,
        unit: unit(),
        name: props.name,
        allowDuplicatedCategory: withDefault(
          props.allowDuplicatedCategory,
          xAxisDefaultProps.allowDuplicatedCategory,
        ),
        allowDataOverflow: withDefault(
          props.allowDataOverflow,
          xAxisDefaultProps.allowDataOverflow,
        ),
        reversed: withDefault(props.reversed, xAxisDefaultProps.reversed),
        includeHidden: withDefault(props.includeHidden, xAxisDefaultProps.includeHidden),
        domain: props.domain,
        allowDecimals: withDefault(props.allowDecimals, xAxisDefaultProps.allowDecimals),
        tickCount: withDefault(props.tickCount, xAxisDefaultProps.tickCount),
        ticks: props.ticks,
        tick: tick(),
        niceTicks: withDefault(props.niceTicks, xAxisDefaultProps.niceTicks),
        interval: withDefault(props.interval, xAxisDefaultProps.interval),
        mirror: mirror(),
        minTickGap: withDefault(props.minTickGap, xAxisDefaultProps.minTickGap),
        angle: withDefault(props.angle, xAxisDefaultProps.angle),
        hide: hide(),
        tickFormatter: tickFormatter(),
        padding: withDefault(props.padding, xAxisDefaultProps.padding),
        height: withDefault(props.height, xAxisDefaultProps.height),
        orientation: orientation(),
      };
    },
    (settings) => {
      if (settings == null || store == null) {
        return;
      }
      if (prev === null) {
        store.actions.cartesianAxis.addXAxis(settings);
      } else if (prev !== settings) {
        store.actions.cartesianAxis.replaceXAxis({ prev, next: settings });
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.cartesianAxis.removeXAxis(prev);
      prev = null;
    }
  });

  // Visual: render the <CartesianAxis> (ticks + labels + axis line). Never inside
  // a Brush panorama.
  const isPanorama = useIsPanorama();
  const position = useAppSelector((state) => selectXAxisPosition(state, xAxisId()));
  const size = useAppSelector((state) => selectXAxisSize(state, xAxisId()));
  const ticks = useAppSelector((state) => selectTicksOfAxis(state, "xAxis", xAxisId(), isPanorama));
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
          <RenderedTicksReporter axisType="xAxis" axisId={xAxisId()} ticks={ar().ticks} />
          <CartesianAxis
            axisType="xAxis"
            x={ar().position.x}
            y={ar().position.y}
            width={ar().size.width}
            height={ar().size.height}
            orientation={orientation()}
            ticks={ar().ticks}
            tick={shouldRenderTick()}
            tickFormatter={tickFormatter()}
            interval={withDefault(props.interval, xAxisDefaultProps.interval)}
            unit={unit()}
            mirror={mirror()}
          />
        </>
      )}
    </Show>
  );
}
