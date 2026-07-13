// Ported from recharts 3.8.1 src/polar/PolarRadiusAxis.tsx (commit 7a23854).
//
// MINIMAL PORT — registers a RadiusAxisSettings into the polarAxis slice and
// renders the axis line (a single <line> from the min to max tick radius along
// `angle`) + one <Text> label per tick. Pure geometry helpers copied verbatim.
//
// Solid deviations: `resolveDefaultProps`→`merge`; SetRadiusAxisSettings effect
// → `createEffect`/`onCleanup` (add overwrites by id); `clsx`→joined string.
// The axis `label` (title) IS wired via PolarLabelContext + PolarLabelFromLabelProp,
// and the per-tick mouse handlers ARE wired (props-first `(tickItem, index, event)`).
// FUNCTION-form `tick` IS wired (called with recharts' renderTickItem content props).
// Object-form `axisLine` presentation merge IS wired (extra props restyle the
// line; geometry stays computed). ZIndexLayer wrap IS wired (reference default
// DefaultZIndexes.axis).
// DEFERRED (documented): ELEMENT-form `tick` (Solid can't clone-and-inject
// computed props into an evaluated node — use the function form instead).
import { For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { useAppSelector, useAppStore } from "../state/hooks";
import { Layer } from "../container/Layer";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
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
import type { PolarAxisLineObjectProps, PolarTickEventHandler } from "./PolarAngleAxis";
import { registerInStore } from "../state/registerInStore";

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
  /** Per-tick pointer handlers, called props-first `(tickItem, index, event)`. */
  onClick?: PolarTickEventHandler<MouseEvent>;
  onMouseEnter?: PolarTickEventHandler<MouseEvent>;
  onMouseLeave?: PolarTickEventHandler<MouseEvent>;
  onMouseOver?: PolarTickEventHandler<MouseEvent>;
  onMouseOut?: PolarTickEventHandler<MouseEvent>;
  onMouseMove?: PolarTickEventHandler<MouseEvent>;
  onMouseDown?: PolarTickEventHandler<MouseEvent>;
  onMouseUp?: PolarTickEventHandler<MouseEvent>;
  onTouchStart?: PolarTickEventHandler<TouchEvent>;
  onTouchMove?: PolarTickEventHandler<TouchEvent>;
  onTouchEnd?: PolarTickEventHandler<TouchEvent>;
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
  /**
   * Tick labels: boolean toggles the default `<Text>`; a function is called per
   * tick with {@link PolarRadiusTickContentProps} (recharts' renderTickItem props).
   * ELEMENT form is unsupported (Solid cannot clone-and-inject computed props).
   */
  tick?: TickProp<PolarRadiusTickContentProps>;
  tickCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  /** The axis line: boolean toggles it; an object supplies extra presentation
   * props merged onto the `<line>` (recharts SVGProps form). */
  axisLine?: boolean | PolarAxisLineObjectProps;
  allowDecimals?: boolean;
  allowDuplicatedCategory?: boolean;
  allowDataOverflow?: boolean;
  reversed?: boolean;
  includeHidden?: boolean;
  niceTicks?: NiceTicksAlgorithm;
  name?: string;
  stroke?: string;
  hide?: boolean;
  /** Z-index layering (reference default: DefaultZIndexes.axis). */
  zIndex?: number;
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

/**
 * The props a PolarRadiusAxis passes to a function-form `tick` renderer, matching
 * the object recharts' renderTickItem builds (axis svg props + anchor + geometry).
 */
export interface PolarRadiusTickContentProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  angle: number;
  orientation: TickOrientation;
  index: number;
  payload: TickItem;
  textAnchor: "start" | "end" | "middle";
  /** recharts rotates the tick text by `90 - angle` around (x, y). */
  transform: string;
  stroke: string;
  fill: string | undefined;
}

/** Per-tick mouse handlers PolarRadiusAxis forwards onto each tick `<Layer>`. */
export interface PolarRadiusAxisTickEvents {
  onClick?: PolarTickEventHandler<MouseEvent>;
  onMouseEnter?: PolarTickEventHandler<MouseEvent>;
  onMouseLeave?: PolarTickEventHandler<MouseEvent>;
  onMouseOver?: PolarTickEventHandler<MouseEvent>;
  onMouseOut?: PolarTickEventHandler<MouseEvent>;
  onMouseMove?: PolarTickEventHandler<MouseEvent>;
  onMouseDown?: PolarTickEventHandler<MouseEvent>;
  onMouseUp?: PolarTickEventHandler<MouseEvent>;
  onTouchStart?: PolarTickEventHandler<TouchEvent>;
  onTouchMove?: PolarTickEventHandler<TouchEvent>;
  onTouchEnd?: PolarTickEventHandler<TouchEvent>;
}

interface RadiusTickProps extends PolarRadiusAxisTickEvents {
  entry: TickItem;
  index: number;
  cx: number;
  cy: number;
  angle: number;
  orientation: TickOrientation;
  tick: TickProp<PolarRadiusTickContentProps>;
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
    <Layer
      class="recharts-polar-radius-axis-tick"
      onClick={(e) => props.onClick?.(props.entry, props.index, e)}
      onMouseEnter={(e) => props.onMouseEnter?.(props.entry, props.index, e)}
      onMouseLeave={(e) => props.onMouseLeave?.(props.entry, props.index, e)}
      onMouseOver={(e) => props.onMouseOver?.(props.entry, props.index, e)}
      onMouseOut={(e) => props.onMouseOut?.(props.entry, props.index, e)}
      onMouseMove={(e) => props.onMouseMove?.(props.entry, props.index, e)}
      onMouseDown={(e) => props.onMouseDown?.(props.entry, props.index, e)}
      onMouseUp={(e) => props.onMouseUp?.(props.entry, props.index, e)}
      onTouchStart={(e) => props.onTouchStart?.(props.entry, props.index, e)}
      onTouchMove={(e) => props.onTouchMove?.(props.entry, props.index, e)}
      onTouchEnd={(e) => props.onTouchEnd?.(props.entry, props.index, e)}
    >
      {/* Function-form tick: call with recharts' tick-content props. Ternary (not
        <Show>) so the constant branch doesn't trip STRICT_READ. ELEMENT-form is
        unsupported (Solid can't clone-and-inject computed props into an evaluated
        node) — use the function form instead. */}
      {typeof props.tick === "function" ? (
        props.tick({
          x: coord().x,
          y: coord().y,
          cx: props.cx,
          cy: props.cy,
          angle: props.angle,
          orientation: props.orientation,
          index: props.index,
          payload: props.entry,
          textAnchor: getTickTextAnchor(props.orientation),
          transform: `rotate(${90 - props.angle}, ${coord().x}, ${coord().y})`,
          stroke: "none",
          fill: props.stroke,
        })
      ) : (
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
      )}
    </Layer>
  );
};

export function PolarRadiusAxis<DataPointType = unknown, DataValueType = unknown>(
  props: PolarRadiusAxisProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const layout = usePolarChartLayout();
  const merged = merge(polarRadiusAxisDefaultProps, props);

  if (store != null) {
    registerInStore<RadiusAxisSettings>(
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
          // DEVIATION: the settings slice shares the cartesian tick renderer type,
          // so a polar function-form renderer is recorded as `true` (presence only —
          // the renderer itself stays local to this component's render; no selector
          // reads the function back out of the store).
          tick: typeof merged.tick === "function" ? true : merged.tick,
          niceTicks: merged.niceTicks,
        };
      },
      {
        // addRadiusAxis overwrites by id, so it doubles as replace-on-change.
        add: (next) => store.actions.polarAxis.addRadiusAxis(next),
        replace: (_prev, next) => store.actions.polarAxis.addRadiusAxis(next),
        remove: (prev) => store.actions.polarAxis.removeRadiusAxis(prev),
      },
    );
  }

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
        // ZIndexLayer INSIDE the gate <Show> (a Portal must not get a reactive
        // Show child — see Bar). Reference default = DefaultZIndexes.axis.
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.axis}>
          <Layer class={axisClass()}>
            <Show when={merged.axisLine}>
              {/* Object-form axisLine: extra presentation props merged AFTER the
                defaults but BEFORE the coords (reference order — restyle, not
                reposition). Kebab via the canonical helper (intrinsic <line>). */}
              <line
                class="recharts-polar-radius-axis-line"
                fill="none"
                stroke={merged.stroke}
                {...(typeof merged.axisLine === "object" && merged.axisLine != null
                  ? svgPropertiesNoEvents({ ...merged.axisLine })
                  : {})}
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
                      tick={merged.tick}
                      stroke={merged.stroke}
                      tickFormatter={merged.tickFormatter}
                      onClick={props.onClick}
                      onMouseEnter={props.onMouseEnter}
                      onMouseLeave={props.onMouseLeave}
                      onMouseOver={props.onMouseOver}
                      onMouseOut={props.onMouseOut}
                      onMouseMove={props.onMouseMove}
                      onMouseDown={props.onMouseDown}
                      onMouseUp={props.onMouseUp}
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
        </ZIndexLayer>
      )}
    </Show>
  );
}
