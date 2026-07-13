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
// Per-tick pointer/touch events ARE wired (props-first `(tickItem, index, event)`,
// forwarded onto each tick `<Layer>`). FUNCTION-form `tick` IS wired (called with
// the reference's renderTickItem content props — x/y/cx/cy/radius/payload/anchors).
// Object-form `axisLine`/`tickLine` presentation merge IS wired (extra props
// restyle the shapes; geometry stays computed, matching the reference order).
// DEFERRED (documented): ELEMENT-form `tick` (Solid can't React.cloneElement an
// evaluated element to inject computed x/y/payload — use the function form
// instead). NOTE: the reference PolarAngleAxis renders no axis `label` title
// either (only PolarRadiusAxis does) — no gap there.
import { For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { useAppSelector, useAppStore } from "../state/hooks";
import { Layer } from "../container/Layer";
import { Dot, type DotProps } from "../shape/Dot";
import { Polygon, type PolygonProps } from "../shape/Polygon";
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
import { registerInStore } from "../state/registerInStore";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";

const eps = 1e-5;
const COS_45 = Math.cos(degreeToRadian(45));

/** The object form of `axisLine`/`tickLine`: presentation props only (`class`
 * and geometry are omitted — the axis owns class and computes geometry;
 * recharts merges the same way). Typed as the intersection of the shapes the
 * object is spread into (Polygon for polygon axis lines, Dot for circle ones),
 * so the JSX spreads type-check without assertions. */
export type PolarAxisLineObjectProps = Omit<PolygonProps, "class" | "children" | "ref" | "points"> &
  Omit<DotProps, "class" | "children" | "ref" | "cx" | "cy" | "r">;

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
  /**
   * Tick labels: boolean toggles the default `<Text>`; a function is called per
   * tick with {@link PolarAngleTickContentProps} (recharts' renderTickItem props).
   * ELEMENT form is unsupported (Solid cannot clone-and-inject computed props).
   */
  tick?: TickProp<PolarAngleTickContentProps>;
  tickCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  /** Tick lines: boolean toggles them; an object supplies extra presentation
   * props merged onto each tick `<line>` (recharts SVGProps form). */
  tickLine?: boolean | PolarAxisLineObjectProps;
  tickSize?: number;
  /** The axis line: boolean toggles it; an object supplies extra presentation
   * props merged onto the Polygon/Dot shape (recharts SVGProps form). */
  axisLine?: boolean | PolarAxisLineObjectProps;
  axisLineType?: "polygon" | "circle";
  orientation?: "inner" | "outer";
  reversed?: boolean;
  allowDecimals?: boolean;
  name?: string;
  stroke?: string;
  hide?: boolean;
  niceTicks?: NiceTicksAlgorithm;
  /** Z-index layering (reference default: DefaultZIndexes.axis). */
  zIndex?: number;
  class?: string;
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

/** Props-first per-tick event handler: `(tickItem, index, event)` (recharts convention). */
export type PolarTickEventHandler<E extends Event> = (
  data: TickItem,
  index: number,
  event: E,
) => void;

/**
 * The props a PolarAngleAxis passes to a function-form `tick` renderer, matching
 * the object recharts' renderTickItem builds (axis svg props + anchors + geometry).
 */
export interface PolarAngleTickContentProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  radius: number;
  index: number;
  payload: TickItem;
  textAnchor: TextAnchor;
  verticalAnchor: TextVerticalAnchor;
  orientation: "inner" | "outer";
  /** Tick rotation angle; the port does not expose the axis `angle` prop, so 0. */
  angle: number;
  stroke: string;
  fill: string | undefined;
}

/** The per-tick pointer handlers PolarAngleAxis forwards onto each tick `<Layer>`. */
export interface PolarAngleAxisTickEvents {
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

interface AngleTickProps extends PolarAngleAxisTickEvents {
  entry: TickItem;
  index: number;
  cx: number;
  cy: number;
  radius: number;
  orientation: "inner" | "outer";
  tickSize: number;
  tickLine: boolean | PolarAxisLineObjectProps;
  tick: TickProp<PolarAngleTickContentProps>;
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
  // The props recharts' renderTickItem hands to a function-form `tick`.
  const tickContentProps = (): PolarAngleTickContentProps => ({
    x: lineCoord().x2,
    y: lineCoord().y2,
    cx: props.cx,
    cy: props.cy,
    radius: props.radius,
    index: props.index,
    payload: props.entry,
    textAnchor: getTickTextAnchor(props.entry, props.orientation),
    verticalAnchor: getTickTextVerticalAnchor(props.entry),
    orientation: props.orientation,
    angle: 0,
    stroke: "none",
    fill: props.stroke,
  });
  return (
    <Layer
      class="recharts-polar-angle-axis-tick"
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
      <Show when={props.tickLine}>
        {/* Object-form tickLine: extra presentation props merged AFTER the
            defaults but BEFORE the coords (reference tickLineProps order —
            the object can restyle, not reposition). Kebab via the canonical
            helper since this is an intrinsic <line>. */}
        <line
          class="recharts-polar-angle-axis-tick-line"
          fill="none"
          stroke={props.stroke}
          {...(typeof props.tickLine === "object" && props.tickLine != null
            ? svgPropertiesNoEvents({ ...props.tickLine })
            : {})}
          x1={lineCoord().x1}
          y1={lineCoord().y1}
          x2={lineCoord().x2}
          y2={lineCoord().y2}
        />
      </Show>
      {/* Function-form tick: call with recharts' tick-content props. Ternary (not
        <Show>) so the constant branch doesn't trip STRICT_READ. ELEMENT-form is
        unsupported (Solid can't clone-and-inject computed props into an evaluated
        node) — use the function form instead. */}
      {typeof props.tick === "function" ? (
        props.tick(tickContentProps())
      ) : (
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
      )}
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

  if (store != null) {
    registerInStore<AngleAxisSettings>(
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
          // DEVIATION: the settings slice shares the cartesian tick renderer type,
          // so a polar function-form renderer is recorded as `true` (presence only —
          // the renderer itself stays local to this component's render; no selector
          // reads the function back out of the store).
          tick: typeof merged.tick === "function" ? true : merged.tick,
          niceTicks: merged.niceTicks,
        };
      },
      {
        // addAngleAxis overwrites by id, so it doubles as replace-on-change.
        add: (next) => store.actions.polarAxis.addAngleAxis(next),
        replace: (_prev, next) => store.actions.polarAxis.addAngleAxis(next),
        remove: (prev) => store.actions.polarAxis.removeAngleAxis(prev),
      },
    );
  }

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
        // ZIndexLayer INSIDE the gate <Show> (a Portal must not get a reactive
        // Show child — see Bar). Reference default = DefaultZIndexes.axis.
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.axis}>
          <Layer class={axisClass()}>
            <Show when={merged.axisLine}>
              {/* Object-form axisLine: extra presentation props (camelCase — the
                shape components kebab them) merged AFTER the defaults but
                BEFORE the geometry (reference axisLineProps order). */}
              <Show
                when={merged.axisLineType === "circle"}
                fallback={
                  <Polygon
                    class="recharts-polar-angle-axis-line"
                    fill="none"
                    stroke={merged.stroke}
                    {...(typeof merged.axisLine === "object" && merged.axisLine != null
                      ? merged.axisLine
                      : {})}
                    points={axisLinePoints(rd())}
                  />
                }
              >
                <Dot
                  class="recharts-polar-angle-axis-line"
                  fill="none"
                  stroke={merged.stroke}
                  {...(typeof merged.axisLine === "object" && merged.axisLine != null
                    ? merged.axisLine
                    : {})}
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
                    onTouchStart={props.onTouchStart}
                    onTouchMove={props.onTouchMove}
                    onTouchEnd={props.onTouchEnd}
                  />
                )}
              </For>
            </Layer>
          </Layer>
        </ZIndexLayer>
      )}
    </Show>
  );
}
