// Ported from recharts 3.8.1 src/cartesian/YAxis.tsx (commit 7a23854).
//
// Registration + visual — see XAxis.tsx for the Solid deviations (registration
// via createEffect + defaults resolved like recharts' resolveDefaultProps); the
// visual `<CartesianAxis>` IS rendered at the bottom of this file.
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createEffect, createMemo, Show } from "solid-js";
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
import { CartesianAxis, type CartesianTickEventHandler } from "./CartesianAxis";
import { getCalculatedYAxisWidth } from "../util/YAxisUtils";
import { isLabelContentAFunction } from "../component/Label";
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
  tick?: TickProp<CartesianTickContentProps>;
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
  /** Extra CSS class(es) for the axis layer (recharts: `className`). */
  class?: string;
  /**
   * Font size of the tick text; also feeds the tick-width measurement used to
   * decide how many ticks render without overlapping (recharts `fontSize`).
   */
  fontSize?: number | string;
  /** Letter spacing of the tick text; measured together with `fontSize`. */
  letterSpacing?: number | string;
  /** Axis line / tick color (forwarded to CartesianAxis). */
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
  const tickFormatter = createMemo(() => props.tickFormatter);
  const orientation = createMemo(() =>
    withDefault(props.orientation, yAxisDefaultProps.orientation),
  );
  const unit = createMemo(() => props.unit);
  const mirror = createMemo(() => withDefault(props.mirror, yAxisDefaultProps.mirror));

  if (store != null) {
    registerInStore<YAxisSettings>(
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
      {
        add: (next) => store.actions.cartesianAxis.addYAxis(next),
        replace: (prev, next) => store.actions.cartesianAxis.replaceYAxis({ prev, next }),
        remove: (prev) => store.actions.cartesianAxis.removeYAxis(prev),
      },
    );
  }

  // Visual: render the <CartesianAxis>. Never inside a Brush panorama.
  const isPanorama = useIsPanorama();
  const position = useAppSelector((state) => selectYAxisPosition(state, yAxisId()));
  const size = useAppSelector((state) => selectYAxisSize(state, yAxisId()));
  const ticks = useAppSelector((state) => selectTicksOfAxis(state, "yAxis", yAxisId(), isPanorama));
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

  // Dynamic Y-axis width: when `width="auto"` (and the label is not a function/element),
  // recharts measures the rendered tick-value DOM via `getCalculatedYAxisWidth` and feeds
  // the result back into the store with `updateYAxisWidth`. Mirror that with the codebase's
  // two-arg createEffect(compute, apply): the compute tracks the reactive inputs (ticks +
  // size), the apply does the DOM measurement and the store write (untracked — so it cannot
  // re-trigger itself; the slice's `updateYAxisWidth` + the Math.round equality also guard
  // oscillation).
  let layerEl: SVGGElement | null = null;
  createEffect(
    () => ({
      ticks: ticks(),
      size: size(),
      width: props.width,
      label: props.label,
      id: yAxisId(),
    }),
    (inputs) => {
      if (inputs.width !== "auto" || isLabelContentAFunction(inputs.label)) {
        return;
      }
      const el = layerEl;
      if (el == null || inputs.ticks == null || inputs.size == null || store == null) {
        return;
      }
      const tickNodes = el.getElementsByClassName("recharts-cartesian-axis-tick-value");
      if (tickNodes.length === 0) {
        return;
      }
      const updatedYAxisWidth = getCalculatedYAxisWidth({
        ticks: tickNodes,
        label: undefined,
        labelGapWithTick: 5,
        tickSize: 6,
        tickMargin: 2,
      });
      if (Math.round(inputs.size.width) !== Math.round(updatedYAxisWidth)) {
        store.actions.cartesianAxis.updateYAxisWidth({ id: inputs.id, width: updatedYAxisWidth });
      }
    },
  );

  return (
    <Show when={!isPanorama && !hide() && axisRender()}>
      {(ar) => (
        <>
          <RenderedTicksReporter axisType="yAxis" axisId={yAxisId()} ticks={ar().ticks} />
          <CartesianAxis
            axisType="yAxis"
            layerRef={(el) => {
              layerEl = el;
            }}
            x={ar().position.x}
            y={ar().position.y}
            width={ar().size.width}
            height={ar().size.height}
            orientation={orientation()}
            ticks={ar().ticks}
            tickFormatter={tickFormatter()}
            interval={withDefault(props.interval, yAxisDefaultProps.interval)}
            minTickGap={withDefault(props.minTickGap, yAxisDefaultProps.minTickGap)}
            unit={unit()}
            mirror={mirror()}
            class={props.class}
            fontSize={props.fontSize}
            letterSpacing={props.letterSpacing}
            label={props.label}
            tick={tick()}
            name={props.name}
            stroke={props.stroke}
            strokeOpacity={props.strokeOpacity}
            axisLine={props.axisLine ?? true}
            tickLine={props.tickLine ?? true}
            tickSize={props.tickSize ?? 6}
            tickMargin={props.tickMargin ?? 2}
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
