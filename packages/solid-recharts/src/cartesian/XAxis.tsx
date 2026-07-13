// Ported from recharts 3.8.1 src/cartesian/XAxis.tsx (commit 7a23854).
//
// BOTH HALVES of the reference XAxis are ported: `SetXAxisSettings` (pushes axis
// config into the cartesianAxis slice, so graphical items like <Line> get a scale)
// and the `XAxisImpl` visual (the `<CartesianAxis>` render at the bottom of this
// file — ticks + labels + axis line, skipped inside a Brush panorama).
//
// Solid deviations: `useAppDispatch` + `useLayoutEffect`/`prevSettingsRef` →
// `useAppStore()` + a single `createEffect((compute) => settings, (apply) => add/replace)`
// plus `onCleanup` for removal. Defaults are resolved field-by-field to match
// recharts' `resolveDefaultProps`: explicit `undefined` falls back to defaults.
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createMemo, Show } from "solid-js";
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
import { CartesianAxis, type CartesianTickEventHandler } from "./CartesianAxis";
import type { ImplicitLabelType } from "../component/Label";
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
  type CartesianTickContentProps,
  TickFormatter,
  TickProp,
} from "../util/types";
import { CustomScaleDefinition } from "../util/scale/CustomScaleDefinition";
import { registerInStore } from "../state/registerInStore";

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
  tick?: TickProp<CartesianTickContentProps>;
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
  /** Extra CSS class(es) for the axis layer (recharts: `className`). */
  class?: string;
  /**
   * Font size of the tick text; also feeds the tick-width measurement used to
   * decide how many ticks render without overlapping (recharts `fontSize`).
   */
  fontSize?: number | string;
  /** Letter spacing of the tick text; measured together with `fontSize`. */
  letterSpacing?: number | string;
  /** Axis-line color/opacity (forwarded to CartesianAxis). */
  stroke?: string;
  strokeOpacity?: number | string;
  /** Toggle/style the axis line. boolean or SVG props object. @defaultValue true */
  axisLine?: boolean | CamelSvgProps<JSX.LineSVGAttributes<SVGLineElement>>;
  tickLine?: boolean;
  /** Length of the tick line. @defaultValue 6 */
  tickSize?: number;
  /** Gap between the tick line and the tick text. @defaultValue 2 */
  tickMargin?: number;
  /** When set, relocates the axis into that z-index portal (unset = inline). */
  zIndex?: number;
  /** Per-tick pointer handlers, called props-first `(tickItem, index, event)`. */
  onClick?: CartesianTickEventHandler<MouseEvent>;
  onMouseEnter?: CartesianTickEventHandler<MouseEvent>;
  onMouseLeave?: CartesianTickEventHandler<MouseEvent>;
  onMouseOver?: CartesianTickEventHandler<MouseEvent>;
  onMouseOut?: CartesianTickEventHandler<MouseEvent>;
  onMouseMove?: CartesianTickEventHandler<MouseEvent>;
  onMouseDown?: CartesianTickEventHandler<MouseEvent>;
  onMouseUp?: CartesianTickEventHandler<MouseEvent>;
  onTouchStart?: CartesianTickEventHandler<TouchEvent>;
  onTouchMove?: CartesianTickEventHandler<TouchEvent>;
  onTouchEnd?: CartesianTickEventHandler<TouchEvent>;
  niceTicks?: NiceTicksAlgorithm;
  /** Axis title — string/number/object/function/`true`, or a `<Label>` child. */
  label?: ImplicitLabelType;
  children?: JSX.Element;
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
  const tickFormatter = createMemo(() => props.tickFormatter);
  const orientation = createMemo(() =>
    withDefault(props.orientation, xAxisDefaultProps.orientation),
  );
  const unit = createMemo(() => props.unit);
  const mirror = createMemo(() => withDefault(props.mirror, xAxisDefaultProps.mirror));

  if (store != null) {
    registerInStore<XAxisSettings>(
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
      {
        add: (next) => store.actions.cartesianAxis.addXAxis(next),
        replace: (prev, next) => store.actions.cartesianAxis.replaceXAxis({ prev, next }),
        remove: (prev) => store.actions.cartesianAxis.removeXAxis(prev),
      },
    );
  }

  // Visual: render the <CartesianAxis> (ticks + labels + axis line). Never inside
  // a Brush panorama.
  const isPanorama = useIsPanorama();
  const position = useAppSelector((state) => selectXAxisPosition(state, xAxisId()));
  const size = useAppSelector((state) => selectXAxisSize(state, xAxisId()));
  const ticks = useAppSelector((state) => selectTicksOfAxis(state, "xAxis", xAxisId(), isPanorama));
  const axisRender = createMemo(() => {
    const p = position();
    const s = size();
    // Deviation: recharts gates the axis render only on size+position (the registered
    // axis settings), NOT on ticks — a data-less axis still draws the Layer + axis line
    // with an empty tick set. Mirror that: fall back to `[]` when no scale/ticks resolve.
    if (p == null || s == null) {
      return null;
    }
    return { position: p, size: s, ticks: ticks() ?? [] };
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
            tick={tick()}
            tickFormatter={tickFormatter()}
            interval={withDefault(props.interval, xAxisDefaultProps.interval)}
            minTickGap={withDefault(props.minTickGap, xAxisDefaultProps.minTickGap)}
            unit={unit()}
            mirror={mirror()}
            class={props.class}
            fontSize={props.fontSize}
            letterSpacing={props.letterSpacing}
            axisLine={props.axisLine ?? true}
            tickLine={props.tickLine ?? true}
            tickSize={props.tickSize ?? 6}
            tickMargin={props.tickMargin ?? 2}
            stroke={props.stroke}
            strokeOpacity={props.strokeOpacity}
            zIndex={props.zIndex}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            onMouseOver={props.onMouseOver}
            onMouseOut={props.onMouseOut}
            onMouseMove={props.onMouseMove}
            onMouseDown={props.onMouseDown}
            onMouseUp={props.onMouseUp}
            onTouchStart={props.onTouchStart}
            onTouchMove={props.onTouchMove}
            onTouchEnd={props.onTouchEnd}
            label={props.label}
            name={props.name}
            angle={props.angle}
            padding={props.padding}
          >
            {props.children}
          </CartesianAxis>
        </>
      )}
    </Show>
  );
}
