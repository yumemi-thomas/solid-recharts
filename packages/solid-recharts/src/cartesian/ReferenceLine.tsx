// Ported from recharts 3.8.1 src/cartesian/ReferenceLine.tsx (commit 7a23854).
//
// Draws a horizontal/vertical/diagonal line at a DATA coordinate, mapped to
// pixels through the cartesian scale spine (selectAxisScale → RechartsScale).
//
// Solid deviations (documented):
//  - resolveDefaultProps → `merge`; useEffect add/remove → createEffect + onCleanup
//    (the same effect-dispatch registration idiom Line/Bar/Area/SetTooltipEntrySettings use).
//  - The registered settings carry a generated `id` (proxy-safe removal — see
//    referenceElementsSlice); recharts matches by object reference.
//  - `clsx` → single `class` string (Layer takes one string).
//  - The `label` prop IS wired (CartesianLabelFromLabelProp), and the line renders
//    inside <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.line}>.
//  - PERMANENT-N/A (by design, NOT deferred): the custom-element `shape` branch
//    (React.cloneElement — Solid has no element-props introspection; use the
//    render-function form; the default-`<line>` branch is kept). <Label> CHILDREN
//    are not rendered (the `label` prop is).
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createMemo, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import {
  CartesianLabelContextProvider,
  CartesianLabelFromLabelProp,
  type ImplicitLabelType,
} from "../component/Label";
import { rectWithCoords } from "../util/CartesianUtils";
import { IfOverflow } from "../util/IfOverflow";
import { isNumOrStr } from "../util/DataUtils";
import { CartesianViewBoxRequired, Coordinate, RectanglePosition } from "../util/types";
import { useViewBox } from "../context/chartLayoutContext";
import type { ReferenceLineSettings } from "../state/referenceElementsSlice";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  selectAxisScale,
  selectXAxisSettings,
  selectYAxisSettings,
} from "../state/selectors/axisSelectors";
import { useIsPanorama } from "../context/PanoramaContext";
import { useClipPathId } from "../container/ClipPathProvider";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { useUniqueId } from "../util/useUniqueId";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";
import { BandPosition, RechartsScale } from "../util/scale/RechartsScale";
import { CartesianScaleHelper, CartesianScaleHelperImpl } from "../util/scale/CartesianScaleHelper";
import type { AxisId } from "../state/cartesianAxisSlice";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { registerInStore } from "../state/registerInStore";

/**
 * Single point that defines one end of a segment, in data space.
 * @inline
 */
export type ReferenceLineSegment = readonly [
  { x?: number | string; y?: number | string },
  { x?: number | string; y?: number | string },
];

type ReferenceCoordinateValue = number | string;

/** Orientation of the two cartesian axes (xAxis is top/bottom, yAxis is left/right). */
type AxisOrientation = "top" | "bottom" | "left" | "right";

/**
 * Props of the inner `<line>` shape (after svg filtering + endpoint geometry).
 * NOT wrapped in CamelSvgProps: this is a DOM-READY OUTPUT payload (built from
 * svgPropertiesAndEvents, spread verbatim onto <line> / handed to `shape`
 * functions), so its keys are the real kebab attribute names by design.
 */
export type LineShapeProps = Partial<JSX.LineSVGAttributes<SVGLineElement>> & {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

export interface ReferenceLineProps<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> {
  /** If defined, renders a horizontal line at this (data-space) y position. */
  y?: YValueType;
  /** If defined, renders a vertical line at this (data-space) x position. */
  x?: XValueType;
  /** Tuple of coordinates. If defined, renders a diagonal line segment. */
  segment?: readonly [{ x?: XValueType; y?: YValueType }, { x?: XValueType; y?: YValueType }];
  /** Where within a band the line is drawn (band scales only). @defaultValue 'middle' */
  position?: BandPosition;
  /** The id of the corresponding y-axis. @defaultValue 0 */
  yAxisId?: AxisId;
  /** The id of the corresponding x-axis. @defaultValue 0 */
  xAxisId?: AxisId;
  /** Defines how to draw the line when it overflows the plot area. @defaultValue 'discard' */
  ifOverflow?: IfOverflow;
  /** Custom render function for the line shape. */
  shape?: (props: LineShapeProps) => JSX.Element;
  /** A single label rendered along the line. @defaultValue false */
  label?: ImplicitLabelType;
  /** Stacking order within the chart's z-index system. @defaultValue DefaultZIndexes.line */
  zIndex?: number;
  class?: string;
  children?: JSX.Element;
}

export type Props<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> = Omit<CamelSvgProps<JSX.LineSVGAttributes<SVGLineElement>>, "x" | "y" | "class" | "children"> &
  ReferenceLineProps<XValueType, YValueType>;

const getHorizontalLineEndPoints = (
  yCoord: number | string,
  ifOverflow: IfOverflow,
  position: BandPosition | undefined,
  yAxisOrientation: AxisOrientation | undefined,
  yAxisScale: RechartsScale,
  viewBox: CartesianViewBoxRequired,
): ReadonlyArray<Coordinate> | null => {
  const { x, width } = viewBox;
  const coord = yAxisScale.map(yCoord, { position });
  if (!isWellBehavedNumber(coord)) {
    return null;
  }
  if (ifOverflow === "discard" && !yAxisScale.isInRange(coord)) {
    return null;
  }
  const points = [
    { x: x + width, y: coord },
    { x, y: coord },
  ];
  return yAxisOrientation === "left" ? points.reverse() : points;
};

const getVerticalLineEndPoints = (
  xCoord: number | string,
  ifOverflow: IfOverflow,
  position: BandPosition | undefined,
  xAxisOrientation: AxisOrientation | undefined,
  xAxisScale: RechartsScale,
  viewBox: CartesianViewBoxRequired,
): ReadonlyArray<Coordinate> | null => {
  const { y, height } = viewBox;
  const coord = xAxisScale.map(xCoord, { position });
  if (!isWellBehavedNumber(coord)) {
    return null;
  }
  if (ifOverflow === "discard" && !xAxisScale.isInRange(coord)) {
    return null;
  }
  const points = [
    { x: coord, y: y + height },
    { x: coord, y },
  ];
  return xAxisOrientation === "top" ? points.reverse() : points;
};

const getSegmentLineEndPoints = (
  segment: ReferenceLineSegment,
  ifOverflow: IfOverflow,
  position: BandPosition | undefined,
  scales: CartesianScaleHelper,
): ReadonlyArray<Coordinate> | null => {
  const points: [Coordinate, Coordinate] = [
    scales.mapWithFallback(segment[0], { position, fallback: "rangeMin" }),
    scales.mapWithFallback(segment[1], { position, fallback: "rangeMax" }),
  ];
  if (ifOverflow === "discard" && points.some((p) => !scales.isInRange(p))) {
    return null;
  }
  return points;
};

type EndPointsPropsSubset = {
  x?: number | string;
  y?: number | string;
  segment?: ReferenceLineSegment;
  ifOverflow: IfOverflow;
};

export const getEndPoints = (
  xAxisScale: RechartsScale,
  yAxisScale: RechartsScale,
  viewBox: CartesianViewBoxRequired,
  position: BandPosition | undefined,
  xAxisOrientation: AxisOrientation | undefined,
  yAxisOrientation: AxisOrientation | undefined,
  props: EndPointsPropsSubset,
): ReadonlyArray<Coordinate> | null => {
  const { x: xCoord, y: yCoord, segment, ifOverflow } = props;
  const isFixedX = isNumOrStr(xCoord);
  const isFixedY = isNumOrStr(yCoord);

  if (isFixedY) {
    return getHorizontalLineEndPoints(
      yCoord,
      ifOverflow,
      position,
      yAxisOrientation,
      yAxisScale,
      viewBox,
    );
  }
  if (isFixedX) {
    return getVerticalLineEndPoints(
      xCoord,
      ifOverflow,
      position,
      xAxisOrientation,
      xAxisScale,
      viewBox,
    );
  }
  if (segment != null && segment.length === 2) {
    return getSegmentLineEndPoints(
      segment,
      ifOverflow,
      position,
      new CartesianScaleHelperImpl({ x: xAxisScale, y: yAxisScale }),
    );
  }
  return null;
};

const renderLine = (
  option: ReferenceLineProps["shape"],
  lineProps: LineShapeProps,
): JSX.Element => {
  if (typeof option === "function") {
    return option(lineProps);
  }
  if (
    !isWellBehavedNumber(lineProps.x1) ||
    !isWellBehavedNumber(lineProps.y1) ||
    !isWellBehavedNumber(lineProps.x2) ||
    !isWellBehavedNumber(lineProps.y2)
  ) {
    return null;
  }
  return <line {...lineProps} class="recharts-reference-line-line" />;
};

function ReportReferenceLine(props: ReferenceLineSettings): JSX.Element {
  const store = useAppStore();
  if (store != null) {
    registerInStore<ReferenceLineSettings>(
      () => ({
        id: props.id,
        xAxisId: props.xAxisId,
        yAxisId: props.yAxisId,
        ifOverflow: props.ifOverflow,
        x: props.x,
        y: props.y,
        segment: props.segment,
      }),
      {
        add: (next) => store.actions.referenceElements.addLine(next),
        // The referenceElements slice has no replace action; the change is a
        // remove of the old settings followed by an add of the new (recharts idiom).
        replace: (prev, next) => {
          store.actions.referenceElements.removeLine(prev);
          store.actions.referenceElements.addLine(next);
        },
        remove: (prev) => store.actions.referenceElements.removeLine(prev),
      },
    );
  }

  return null;
}

const referenceLineDefaultProps = {
  ifOverflow: "discard",
  xAxisId: 0,
  yAxisId: 0,
  fill: "none",
  stroke: "#ccc",
  fillOpacity: 1,
  strokeWidth: 1,
  position: "middle",
  label: false,
} as const satisfies Partial<Props>;

function ReferenceLineImpl(props: Props): JSX.Element {
  const merged = merge(referenceLineDefaultProps, props);
  const isPanorama = useIsPanorama();
  const clipPathId = useClipPathId();
  const viewBox = useViewBox();
  const xAxis = useAppSelector((s) => selectXAxisSettings(s, merged.xAxisId));
  const yAxis = useAppSelector((s) => selectYAxisSettings(s, merged.yAxisId));
  const xAxisScale = useAppSelector((s) => selectAxisScale(s, "xAxis", merged.xAxisId, isPanorama));
  const yAxisScale = useAppSelector((s) => selectAxisScale(s, "yAxis", merged.yAxisId, isPanorama));

  const coords = createMemo<{ x1: number; y1: number; x2: number; y2: number } | null>(() => {
    const vb = viewBox();
    const xs = xAxisScale();
    const ys = yAxisScale();
    const xAxisSettings = xAxis();
    const yAxisSettings = yAxis();
    if (
      clipPathId == null ||
      vb == null ||
      xs == null ||
      ys == null ||
      xAxisSettings == null ||
      yAxisSettings == null
    ) {
      return null;
    }
    const endPoints = getEndPoints(
      xs,
      ys,
      vb,
      merged.position,
      xAxisSettings.orientation,
      yAxisSettings.orientation,
      {
        x: merged.x,
        y: merged.y,
        segment: merged.segment,
        ifOverflow: merged.ifOverflow,
      },
    );
    if (!endPoints) {
      return null;
    }
    const point1 = endPoints[0];
    const point2 = endPoints[1];
    if (point1 == null || point2 == null) {
      return null;
    }
    return { x1: point1.x, y1: point1.y, x2: point2.x, y2: point2.y };
  });

  // The memo returns the line PROPS (or null) — all reactive prop reads (the svg
  // spread) happen in this tracking scope, so the Show callback has no untracked
  // reads beyond the (static) shape.
  const rendered = createMemo<{ line: LineShapeProps; rect: RectanglePosition } | null>(() => {
    const c = coords();
    if (!c) {
      return null;
    }
    const clipPath = merged.ifOverflow === "hidden" ? `url(#${clipPathId})` : undefined;
    const line: LineShapeProps = {
      "clip-path": clipPath,
      ...svgPropertiesAndEvents({ ...merged }),
      x1: c.x1,
      y1: c.y1,
      x2: c.x2,
      y2: c.y2,
    };
    return { line, rect: rectWithCoords({ x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 }) };
  });

  return (
    <Show when={rendered()}>
      {(r) => (
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.line}>
          <Layer class="recharts-reference-line">
            {renderLine(merged.shape, r().line)}
            <CartesianLabelContextProvider
              x={r().rect.x}
              y={r().rect.y}
              width={r().rect.width}
              height={r().rect.height}
              upperWidth={r().rect.width}
              lowerWidth={r().rect.width}
            >
              <CartesianLabelFromLabelProp label={merged.label} />
            </CartesianLabelContextProvider>
          </Layer>
        </ZIndexLayer>
      )}
    </Show>
  );
}

/**
 * Draws a line on the chart at a data coordinate (the cartesian-aware version of
 * an SVG `<line>`). ReferenceLine maps the provided data coordinates to pixels
 * through the chart's scales.
 */
export function ReferenceLine<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
>(props: Props<XValueType, YValueType>): JSX.Element {
  const merged = merge(referenceLineDefaultProps, props);
  const id = useUniqueId("recharts-reference-line");
  return (
    <>
      <ReportReferenceLine
        id={id}
        yAxisId={merged.yAxisId}
        xAxisId={merged.xAxisId}
        ifOverflow={merged.ifOverflow}
        x={merged.x}
        y={merged.y}
        segment={merged.segment}
      />
      <ReferenceLineImpl {...props} />
    </>
  );
}

ReferenceLine.displayName = "ReferenceLine";
