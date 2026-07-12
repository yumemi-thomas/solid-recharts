/**
 * @fileOverview Polygon
 *
 * Ported from recharts 3.8.1 src/shape/Polygon.tsx (commit 7a23854).
 * Pure path helpers are copied verbatim. Solid deviations: `className` → `class`
 * (Omit the wide SVG `class`); no destructuring (use `omit` + a keyed `<Show>`
 * to narrow `points` without a non-null `!`); `clsx` → `class={[...]}`;
 * `return null` → `<Show>`.
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Coordinate } from "../util/types";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { roundTemplateLiteral } from "../util/round";

const isValidatePoint = (point: Coordinate | undefined): point is Coordinate => {
  return point != null && point.x === +point.x && point.y === +point.y;
};

const getParsedPoints = (points: ReadonlyArray<Coordinate> = []): Coordinate[][] => {
  let segmentPoints: Coordinate[][] = [[]];

  points.forEach((entry) => {
    const lastLink = segmentPoints[segmentPoints.length - 1];
    if (isValidatePoint(entry)) {
      if (lastLink) {
        lastLink.push(entry);
      }
    } else if (lastLink && lastLink.length > 0) {
      // add another path
      segmentPoints.push([]);
    }
  });

  const firstPoint = points[0];
  const lastLink = segmentPoints[segmentPoints.length - 1];
  if (isValidatePoint(firstPoint) && lastLink) {
    lastLink.push(firstPoint);
  }

  const finalLink = segmentPoints[segmentPoints.length - 1];
  if (finalLink && finalLink.length <= 0) {
    segmentPoints = segmentPoints.slice(0, -1);
  }

  return segmentPoints;
};

const getSinglePolygonPath = (
  points: ReadonlyArray<Coordinate>,
  connectNulls?: boolean,
): string => {
  let segmentPoints = getParsedPoints(points);

  if (connectNulls) {
    segmentPoints = [
      segmentPoints.reduce((res: Coordinate[], segPoints: Coordinate[]) => {
        return [...res, ...segPoints];
      }, []),
    ];
  }

  const polygonPath = segmentPoints
    .map((segPoints) => {
      return segPoints.reduce((path: string, point: Coordinate, index: number) => {
        return roundTemplateLiteral`${path}${index === 0 ? "M" : "L"}${point.x},${point.y}`;
      }, "");
    })
    .join("");

  return segmentPoints.length === 1 ? `${polygonPath}Z` : polygonPath;
};

const getRanglePath = (
  points: ReadonlyArray<Coordinate>,
  baseLinePoints: ReadonlyArray<Coordinate>,
  connectNulls?: boolean,
): string => {
  const outerPath = getSinglePolygonPath(points, connectNulls);

  return `${outerPath.slice(-1) === "Z" ? outerPath.slice(0, -1) : outerPath}L${getSinglePolygonPath(
    Array.from(baseLinePoints).reverse(),
    connectNulls,
  ).slice(1)}`;
};

interface PolygonOwnProps {
  class?: string;
  /**
   * The coordinates of all the vertexes of the polygon, like an array of objects with x and y coordinates.
   */
  points?: ReadonlyArray<Coordinate>;
  baseLinePoints?: ReadonlyArray<Coordinate>;
  connectNulls?: boolean;
}

export type PolygonProps = Omit<
  CamelSvgProps<JSX.PolygonSVGAttributes<SVGPolygonElement>>,
  "points" | "class"
> &
  PolygonOwnProps;

export const Polygon = (props: PolygonProps): JSX.Element => {
  const others = (): Record<string, unknown> => ({
    ...omit(props, "class", "points", "baseLinePoints", "connectNulls"),
  });
  const layerClass = (): Array<string | undefined> => ["recharts-polygon", props.class];

  // Narrow `points` to a non-empty array via keyed Show (no non-null assertion).
  const validPoints = (): ReadonlyArray<Coordinate> | undefined =>
    props.points != null && props.points.length > 0 ? props.points : undefined;
  const validBase = (): ReadonlyArray<Coordinate> | undefined =>
    props.baseLinePoints != null && props.baseLinePoints.length > 0
      ? props.baseLinePoints
      : undefined;

  return (
    <Show when={validPoints()} keyed>
      {(points) => (
        <Show
          when={validBase()}
          keyed
          fallback={(() => {
            const singlePath = getSinglePolygonPath(points, props.connectNulls);
            return (
              <path
                {...svgPropertiesAndEvents(others())}
                fill={singlePath.slice(-1) === "Z" ? props.fill : "none"}
                class={layerClass()}
                d={singlePath}
              />
            );
          })()}
        >
          {(baseLinePoints) => {
            const hasStroke = props.stroke && props.stroke !== "none";
            const rangePath = getRanglePath(points, baseLinePoints, props.connectNulls);
            return (
              <g class={layerClass()}>
                <path
                  {...svgPropertiesAndEvents(others())}
                  fill={rangePath.slice(-1) === "Z" ? props.fill : "none"}
                  stroke="none"
                  d={rangePath}
                />
                <Show when={hasStroke}>
                  <path
                    {...svgPropertiesAndEvents(others())}
                    fill="none"
                    d={getSinglePolygonPath(points, props.connectNulls)}
                  />
                </Show>
                <Show when={hasStroke}>
                  <path
                    {...svgPropertiesAndEvents(others())}
                    fill="none"
                    d={getSinglePolygonPath(baseLinePoints, props.connectNulls)}
                  />
                </Show>
              </g>
            );
          }}
        </Show>
      )}
    </Show>
  );
};
