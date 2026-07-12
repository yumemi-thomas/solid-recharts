/**
 * @fileOverview Sector
 *
 * Ported from recharts 3.8.1 src/shape/Sector.tsx (commit 7a23854).
 * Pure geometry helpers copied verbatim. Solid deviations: `resolveDefaultProps`
 * → per-prop `?? default` accessors; `className` → `class` (Omit the wide SVG
 * `class`); `clsx` → `class={[...]}`; `return null` → `<Show>`.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { GeometrySector, GeometrySectorWithCornerRadius } from "../util/types";
import { polarToCartesian, RADIAN } from "../util/PolarUtils";
import { getPercentValue, mathSign } from "../util/DataUtils";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { roundTemplateLiteral } from "../util/round";

const getDeltaAngle = (startAngle: number, endAngle: number): number => {
  const sign = mathSign(endAngle - startAngle);
  const deltaAngle = Math.min(Math.abs(endAngle - startAngle), 359.999);

  return sign * deltaAngle;
};

interface TangentCircleDef {
  cx: number;
  cy: number;
  radius: number;
  angle: number;
  sign: number;
  isExternal?: boolean;
  cornerRadius: number;
  cornerIsExternal?: boolean;
}

const getTangentCircle = ({
  cx,
  cy,
  radius,
  angle,
  sign,
  isExternal,
  cornerRadius,
  cornerIsExternal,
}: TangentCircleDef) => {
  const centerRadius = cornerRadius * (isExternal ? 1 : -1) + radius;
  const theta = Math.asin(cornerRadius / centerRadius) / RADIAN;
  const centerAngle = cornerIsExternal ? angle : angle + sign * theta;
  const center = polarToCartesian(cx, cy, centerRadius, centerAngle);
  // The coordinate of point which is tangent to the circle
  const circleTangency = polarToCartesian(cx, cy, radius, centerAngle);
  // The coordinate of point which is tangent to the radius line
  const lineTangencyAngle = cornerIsExternal ? angle - sign * theta : angle;
  const lineTangency = polarToCartesian(
    cx,
    cy,
    centerRadius * Math.cos(theta * RADIAN),
    lineTangencyAngle,
  );
  return { center, circleTangency, lineTangency, theta };
};

const getSectorPath = ({
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
}: GeometrySector): string => {
  const angle = getDeltaAngle(startAngle, endAngle);

  // When the angle of sector equals to 360, star point and end point coincide
  const tempEndAngle = startAngle + angle;
  const outerStartPoint = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEndPoint = polarToCartesian(cx, cy, outerRadius, tempEndAngle);

  let path = roundTemplateLiteral`M ${outerStartPoint.x},${outerStartPoint.y}
    A ${outerRadius},${outerRadius},0,
    ${+(Math.abs(angle) > 180)},${+(startAngle > tempEndAngle)},
    ${outerEndPoint.x},${outerEndPoint.y}
  `;

  if (innerRadius > 0) {
    const innerStartPoint = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEndPoint = polarToCartesian(cx, cy, innerRadius, tempEndAngle);
    path += roundTemplateLiteral`L ${innerEndPoint.x},${innerEndPoint.y}
            A ${innerRadius},${innerRadius},0,
            ${+(Math.abs(angle) > 180)},${+(startAngle <= tempEndAngle)},
            ${innerStartPoint.x},${innerStartPoint.y} Z`;
  } else {
    path += roundTemplateLiteral`L ${cx},${cy} Z`;
  }

  return path;
};

const getSectorWithCorner = ({
  cx,
  cy,
  innerRadius,
  outerRadius,
  cornerRadius,
  forceCornerRadius,
  cornerIsExternal,
  startAngle,
  endAngle,
}: GeometrySectorWithCornerRadius): string => {
  const sign = mathSign(endAngle - startAngle);
  const {
    circleTangency: soct,
    lineTangency: solt,
    theta: sot,
  } = getTangentCircle({
    cx,
    cy,
    radius: outerRadius,
    angle: startAngle,
    sign,
    cornerRadius,
    cornerIsExternal,
  });
  const {
    circleTangency: eoct,
    lineTangency: eolt,
    theta: eot,
  } = getTangentCircle({
    cx,
    cy,
    radius: outerRadius,
    angle: endAngle,
    sign: -sign,
    cornerRadius,
    cornerIsExternal,
  });
  const outerArcAngle = cornerIsExternal
    ? Math.abs(startAngle - endAngle)
    : Math.abs(startAngle - endAngle) - sot - eot;

  if (outerArcAngle < 0) {
    if (forceCornerRadius) {
      return roundTemplateLiteral`M ${solt.x},${solt.y}
        a${cornerRadius},${cornerRadius},0,0,1,${cornerRadius * 2},0
        a${cornerRadius},${cornerRadius},0,0,1,${-cornerRadius * 2},0
      `;
    }
    return getSectorPath({
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
    });
  }

  let path = roundTemplateLiteral`M ${solt.x},${solt.y}
    A${cornerRadius},${cornerRadius},0,0,${+(sign < 0)},${soct.x},${soct.y}
    A${outerRadius},${outerRadius},0,${+(outerArcAngle > 180)},${+(sign < 0)},${eoct.x},${eoct.y}
    A${cornerRadius},${cornerRadius},0,0,${+(sign < 0)},${eolt.x},${eolt.y}
  `;

  if (innerRadius > 0) {
    const {
      circleTangency: sict,
      lineTangency: silt,
      theta: sit,
    } = getTangentCircle({
      cx,
      cy,
      radius: innerRadius,
      angle: startAngle,
      sign,
      isExternal: true,
      cornerRadius,
      cornerIsExternal,
    });
    const {
      circleTangency: eict,
      lineTangency: eilt,
      theta: eit,
    } = getTangentCircle({
      cx,
      cy,
      radius: innerRadius,
      angle: endAngle,
      sign: -sign,
      isExternal: true,
      cornerRadius,
      cornerIsExternal,
    });
    const innerArcAngle = cornerIsExternal
      ? Math.abs(startAngle - endAngle)
      : Math.abs(startAngle - endAngle) - sit - eit;

    if (innerArcAngle < 0 && cornerRadius === 0) {
      return `${path}L${cx},${cy}Z`;
    }

    path += roundTemplateLiteral`L${eilt.x},${eilt.y}
      A${cornerRadius},${cornerRadius},0,0,${+(sign < 0)},${eict.x},${eict.y}
      A${innerRadius},${innerRadius},0,${+(innerArcAngle > 180)},${+(sign > 0)},${sict.x},${sict.y}
      A${cornerRadius},${cornerRadius},0,0,${+(sign < 0)},${silt.x},${silt.y}Z`;
  } else {
    path += roundTemplateLiteral`L${cx},${cy}Z`;
  }

  return path;
};

interface SectorOwnProps {
  class?: string;
  /** The x-coordinate of center. @default 0 */
  cx?: number;
  /** The y-coordinate of center. @default 0 */
  cy?: number;
  /** The inner radius of the sector. @default 0 */
  innerRadius?: number;
  /** The outer radius of the sector. @default 0 */
  outerRadius?: number;
  /** The start angle of the sector. @default 0 */
  startAngle?: number;
  /** The end angle of the sector. @default 0 */
  endAngle?: number;
  /** The radius of corners. @default 0 */
  cornerRadius?: number;
  /** Whether force to render round corner when the angle of sector is very small. @default false */
  forceCornerRadius?: boolean;
  cornerIsExternal?: boolean;
}

/**
 * SVG cx, cy are `string | number | undefined`, but internally we use `number`, so we
 * override the types here.
 */
export type SectorProps = Omit<
  CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>,
  "cx" | "cy" | "class"
> &
  SectorOwnProps;

export const Sector = (props: SectorProps): JSX.Element => {
  const cx = (): number => props.cx ?? 0;
  const cy = (): number => props.cy ?? 0;
  const innerRadius = (): number => props.innerRadius ?? 0;
  const outerRadius = (): number => props.outerRadius ?? 0;
  const startAngle = (): number => props.startAngle ?? 0;
  const endAngle = (): number => props.endAngle ?? 0;
  const cornerRadius = (): number => props.cornerRadius ?? 0;
  const forceCornerRadius = (): boolean => props.forceCornerRadius ?? false;
  const cornerIsExternal = (): boolean => props.cornerIsExternal ?? false;

  const valid = (): boolean => !(outerRadius() < innerRadius() || startAngle() === endAngle());

  const path = (): string => {
    const deltaRadius = outerRadius() - innerRadius();
    const cr = getPercentValue(cornerRadius(), deltaRadius, 0, true);

    if (cr > 0 && Math.abs(startAngle() - endAngle()) < 360) {
      return getSectorWithCorner({
        cx: cx(),
        cy: cy(),
        innerRadius: innerRadius(),
        outerRadius: outerRadius(),
        cornerRadius: Math.min(cr, deltaRadius / 2),
        forceCornerRadius: forceCornerRadius(),
        cornerIsExternal: cornerIsExternal(),
        startAngle: startAngle(),
        endAngle: endAngle(),
      });
    }
    return getSectorPath({
      cx: cx(),
      cy: cy(),
      innerRadius: innerRadius(),
      outerRadius: outerRadius(),
      startAngle: startAngle(),
      endAngle: endAngle(),
    });
  };

  const passthrough = (): Record<string, unknown> => ({
    ...omit(props, "class"),
    cx: cx(),
    cy: cy(),
    innerRadius: innerRadius(),
    outerRadius: outerRadius(),
    cornerRadius: cornerRadius(),
    forceCornerRadius: forceCornerRadius(),
    cornerIsExternal: cornerIsExternal(),
    startAngle: startAngle(),
    endAngle: endAngle(),
  });

  return (
    <Show when={valid()}>
      <path
        {...svgPropertiesAndEvents(passthrough())}
        class={["recharts-sector", props.class]}
        d={path()}
      />
    </Show>
  );
};
