/**
 * @fileOverview Curve
 *
 * Ported from recharts 3.8.1 src/shape/Curve.tsx (commit 7a23854).
 * Pure `getPath`/`getCurveFactory` helpers copied verbatim (modulo type
 * adjustments). Solid deviations:
 *   - `className` → `class` (Omit the wide SVG `class`); `clsx` → `class={[...]}`.
 *   - `resolveDefaultProps` → `merge()` defaults via per-prop `?? default`.
 *   - `React.forwardRef` → `ref?: SVGPathElement | ((el: SVGPathElement) => void)`.
 *   - `return null` → `<Show>`.
 *   - `useChartLayout()` returns `Accessor<LayoutType | undefined>` in Solid.
 *   - `svgPropertiesNoEvents(props)` (attributes) + `adaptEventHandlers(props)`
 *     (events, rewrapped props-first) — same split as recharts Curve.
 *   - `noUncheckedIndexedAccess`: `baseLine[index]` is `NullableCoordinate | undefined`
 *     but the `base?:` field in `NullableAreaPoint` already accepts `undefined`.
 *   - Two `@ts-expect-error` from recharts kept: d3's `defined()` changes the
 *     generic type internally but its typings don't reflect that.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  area as shapeArea,
  type Area as D3AreaCurve,
  curveBasis,
  curveBasisClosed,
  curveBasisOpen,
  curveBumpX,
  curveBumpY,
  type CurveFactory,
  curveLinear,
  curveLinearClosed,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  line as shapeLine,
  type Line as D3LineCurve,
} from "d3-shape";
import { isNumber, upperFirst } from "../util/DataUtils";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";
import { svgPropertiesNoEvents } from "../util/svgPropertiesNoEvents";
import { adaptEventHandlers } from "../util/adaptEventHandlers";
import { useChartLayout } from "../context/chartLayoutContext";
import type { Coordinate, LayoutType, NullableCoordinate } from "../util/types";

// ---------------------------------------------------------------------------
// Curve factory lookup
// ---------------------------------------------------------------------------

interface CurveFactories {
  [index: string]: CurveFactory;
}

const CURVE_FACTORIES: CurveFactories = {
  curveBasisClosed,
  curveBasisOpen,
  curveBasis,
  curveBumpX,
  curveBumpY,
  curveLinearClosed,
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
};

/**
 * @inline
 */
export type CurveType =
  | "basis"
  | "basisClosed"
  | "basisOpen"
  | "bumpX"
  | "bumpY"
  | "bump"
  | "linear"
  | "linearClosed"
  | "natural"
  | "monotoneX"
  | "monotoneY"
  | "monotone"
  | "step"
  | "stepBefore"
  | "stepAfter"
  | CurveFactory;

/**
 * @inline
 */
export type BaseLineType = number | ReadonlyArray<NullableCoordinate>;

type AreaPoint = Coordinate & { base: Coordinate };
type NullableAreaPoint = NullableCoordinate & { base?: NullableCoordinate };

const defined = (p: NullableCoordinate): p is Coordinate =>
  isWellBehavedNumber(p.x) && isWellBehavedNumber(p.y);

const areaDefined = (d: NullableAreaPoint): d is AreaPoint =>
  d.base != null && defined(d.base) && defined(d);

const getX = (p: Coordinate): number => p.x;
const getY = (p: Coordinate): number => p.y;

const getCurveFactory = (type: CurveType, layout: LayoutType | undefined): CurveFactory => {
  if (typeof type === "function") {
    return type;
  }

  const name = `curve${upperFirst(type)}`;

  if ((name === "curveMonotone" || name === "curveBump") && layout) {
    const factory = CURVE_FACTORIES[`${name}${layout === "vertical" ? "Y" : "X"}`];
    if (factory) {
      return factory;
    }
  }
  return CURVE_FACTORIES[name] ?? curveLinear;
};

// ---------------------------------------------------------------------------
// getPath — exported pure helper
// ---------------------------------------------------------------------------

type GetPathProps = Pick<CurveOwnProps, "type" | "points" | "baseLine" | "layout" | "connectNulls">;

export const defaultCurveProps = {
  connectNulls: false,
  type: "linear",
} as const satisfies Partial<CurveOwnProps>;

/**
 * Calculate the path of curve. Returns null if points is an empty array.
 * @return path or null
 */
export const getPath = ({
  type = defaultCurveProps.type,
  points = [],
  baseLine,
  layout,
  connectNulls = defaultCurveProps.connectNulls,
}: GetPathProps): string | null => {
  const curveFactory = getCurveFactory(type, layout);
  const formatPoints: ReadonlyArray<NullableCoordinate> = connectNulls
    ? points.filter(defined)
    : points;

  // When dealing with an area chart (where `baseLine` is an array),
  // we need to pair points with their corresponding `baseLine` points first.
  // This is to ensure that we filter points and their baseline counterparts together,
  // preventing errors from mismatched array lengths and ensuring `defined` checks both.
  // Narrow to the array form by EXCLUDING number/nullish rather than
  // `Array.isArray` — the latter widens a ReadonlyArray to `any[]` (a TS
  // limitation), which would make `baseLine[index]` an unsafe `any`. After this
  // guard, baseLine is `ReadonlyArray<NullableCoordinate>`.
  if (typeof baseLine !== "number" && baseLine != null) {
    let lineFunction: D3AreaCurve<AreaPoint>;

    // noUncheckedIndexedAccess: baseLine[index] is NullableCoordinate | undefined,
    // which is compatible with `base?: NullableCoordinate` in NullableAreaPoint.
    const areaPoints: ReadonlyArray<NullableAreaPoint> = points.map((entry, index) => ({
      ...entry,
      base: baseLine[index],
    }));

    if (layout === "vertical") {
      lineFunction = shapeArea<AreaPoint>()
        .y(getY)
        .x1(getX)
        .x0((d) => d.base.x);
    } else {
      lineFunction = shapeArea<AreaPoint>()
        .x(getX)
        .y1(getY)
        .y0((d) => d.base.y);
    }
    /*
     * What happens here is that the `.defined()` call will make it so that this function can accept
     * nullable points, and internally it will filter them out and skip when generating the path.
     * So on the input it accepts NullableCoordinate, but it never calls getX/getY on null points because of the defined() filter.
     *
     * The d3 type definition has only one generic so it doesn't allow to describe this properly.
     * However. d3 types are mutable, but we can pretend that they are not, and we can pretend
     * that calling defined() returns a new function with a different generic type.
     */
    // @ts-expect-error the defined call changes the generic type internally but d3 types don't reflect that
    const nullableLineFunction: D3AreaCurve<NullableAreaPoint> = lineFunction
      .defined(areaDefined)
      .curve(curveFactory);

    const finalPoints: ReadonlyArray<NullableAreaPoint> = connectNulls
      ? areaPoints.filter(areaDefined)
      : areaPoints;

    return nullableLineFunction(finalPoints);
  }

  let lineFunction: D3LineCurve<Coordinate> | D3AreaCurve<Coordinate>;
  if (layout === "vertical" && isNumber(baseLine)) {
    lineFunction = shapeArea<Coordinate>().y(getY).x1(getX).x0(baseLine);
  } else if (isNumber(baseLine)) {
    lineFunction = shapeArea<Coordinate>().x(getX).y1(getY).y0(baseLine);
  } else {
    lineFunction = shapeLine<Coordinate>().x(getX).y(getY);
  }

  // @ts-expect-error the defined call changes the generic type internally but d3 types don't reflect that
  const nullableLineFunction: D3LineCurve<NullableCoordinate> = lineFunction
    .defined(defined)
    .curve(curveFactory);

  return nullableLineFunction(formatPoints);
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CurveOwnProps {
  class?: string;
  /**
   * The interpolation type of curve. Allows custom interpolation function.
   *
   * @defaultValue linear
   * @link https://d3js.org/d3-shape/curve
   */
  type?: CurveType;
  /**
   * This option affects the interpolation algorithm when the `type` prop is set to 'monotone'.
   * It also specifies the type of baseline when the curve is closed.
   */
  layout?: LayoutType;
  /**
   * Baseline of the area:
   * - number: uses the corresponding axis value as a flat baseline;
   * - an array of coordinates: describes a custom baseline path.
   */
  baseLine?: BaseLineType;
  /**
   * The coordinates of all the points in the curve, like an array of objects with x and y coordinates.
   */
  points?: ReadonlyArray<NullableCoordinate>;
  /**
   * Whether to connect the curve across null points.
   *
   * @defaultValue false
   */
  connectNulls?: boolean;
  path?: string;
  /**
   * Ref callback or element ref for the underlying <path> element.
   * (Replaces React's `pathRef: Ref<SVGPathElement>`.)
   */
  pathRef?: SVGPathElement | ((el: SVGPathElement) => void);
  /**
   * The pattern of dashes and gaps used to paint the line.
   *
   * @example strokeDasharray="5 5"
   * @example strokeDasharray={10}
   */
  strokeDasharray?: string | number;
}

export type CurveProps = Omit<CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>, "class"> &
  CurveOwnProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Curve = (props: CurveProps): JSX.Element => {
  const layoutFromContext = useChartLayout();

  const hasPoints = (): boolean => props.points != null && props.points.length > 0;
  const hasPath = (): boolean => props.path != null && props.path.length > 0;

  const realPath = (): string | null | undefined => {
    if (hasPoints()) {
      return getPath({
        type: props.type,
        points: props.points,
        baseLine: props.baseLine,
        layout: props.layout ?? layoutFromContext(),
        connectNulls: props.connectNulls,
      });
    }
    return props.path;
  };

  // Convert null → undefined so the `d` attr is simply omitted (null is not a
  // valid SVG attribute value here, but d3 can return null for empty point sets).
  const dAttr = (): string | undefined => {
    const p = realPath();
    return p === null ? undefined : p;
  };

  // `strokeDasharray` (camelCase) is forwarded by the spread — svgPropertiesNoEvents
  // renames it to the kebab `stroke-dasharray` DOM attribute (see svg-attribute-rename).
  const others = (): Record<string, unknown> => ({
    ...omit(
      props,
      "class",
      "type",
      "layout",
      "baseLine",
      "points",
      "connectNulls",
      "path",
      "pathRef",
    ),
  });

  // recharts Curve spreads `svgPropertiesNoEvents(props)` for attributes and
  // `adaptEventHandlers(props)` for events — the latter rewraps each handler to be
  // called with `(props, event)` (props-first). We mirror that split: attributes
  // from `others()` (the manual omit), events from the FULL props so handlers
  // receive the complete curve props as recharts does (Line.spec relies on this).
  return (
    <Show when={hasPoints() || hasPath()}>
      <path
        {...svgPropertiesNoEvents(others())}
        {...(adaptEventHandlers(props) ?? {})}
        class={["recharts-curve", props.class]}
        d={dAttr()}
        ref={props.pathRef}
      />
    </Show>
  );
};
