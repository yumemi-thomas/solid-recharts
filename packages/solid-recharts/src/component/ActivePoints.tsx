// Ported from recharts 3.8.1 src/component/ActivePoints.tsx (commit 7a23854).
// Solid deviations: state is computed in a parent createMemo (plain data only);
// JSX is built in the parent's JSX scope via `renderActivePointsLayerFromState`.
// Mounting a child component that subscribes to tooltip selectors trips STRICT_READ.
// ZIndexLayer deferred.
import type { JSX } from "@solidjs/web";
import { isNullish } from "../util/DataUtils";
import type { ActiveDotProps, ActiveDotType, DataKey } from "../util/types";
import { svgPropertiesNoEventsFromUnknownKeepCase } from "../util/svgPropertiesNoEvents";
import type { TooltipIndex } from "../state/tooltipSlice";

export interface PointType {
  readonly x: number | null;
  readonly y: number | null;
  readonly value?: unknown;
  readonly payload?: unknown;
}

export interface ActivePointsProps {
  points: ReadonlyArray<PointType>;
  mainColor: string | undefined;
  itemDataKey: DataKey<unknown> | undefined;
  activeDot: ActiveDotType;
  clipPath?: string;
  zIndex?: number;
}

export interface ActivePointsLayerArgs extends ActivePointsProps {
  activeTooltipIndex: TooltipIndex | null | undefined;
  activeDataPoints: ReadonlyArray<unknown> | undefined;
}

export interface ActivePointState {
  point: PointType;
  /** Narrowed coordinates of `point` (guaranteed non-null when this state exists). */
  cx: number;
  cy: number;
  childIndex: number;
}

export function findActivePointByIndex(
  points: ReadonlyArray<PointType>,
  activeDot: ActiveDotType,
  activeIndex: TooltipIndex | null | undefined,
): PointType | undefined {
  if (activeDot === false || activeIndex == null) {
    return undefined;
  }
  const indexNum = Number(activeIndex);
  if (!Number.isFinite(indexNum)) {
    return undefined;
  }
  return points[indexNum];
}

/** Resolve the active point from plain inputs (safe inside a parent createMemo). */
export function computeActivePointState(args: ActivePointsLayerArgs): ActivePointState | null {
  if (args.points == null || args.activeDataPoints == null || args.activeDot === false) {
    return null;
  }

  const activeDataPoints = args.activeDataPoints;
  const activePoint = args.points.find((p) => activeDataPoints.includes(p.payload));
  if (isNullish(activePoint) || activePoint.x == null || activePoint.y == null) {
    return null;
  }

  return {
    point: activePoint,
    cx: activePoint.x,
    cy: activePoint.y,
    childIndex: Number(args.activeTooltipIndex ?? 0),
  };
}

function renderActiveDot(activeDot: ActiveDotType, dotProps: ActiveDotProps): JSX.Element {
  if (typeof activeDot === "function") {
    return activeDot(dotProps);
  }
  if (typeof activeDot === "object" && activeDot != null && "type" in activeDot) {
    return activeDot;
  }
  // Default <Dot> uses <Show> internally, which trips STRICT_READ when this
  // layer mounts during tooltip effect-apply — render the circle directly instead.
  // An object-form activeDot's `class`/`className` is dropped by the svg-prop
  // renamer (it allowlists out `class`), so apply it explicitly here.
  const customClass =
    typeof activeDot === "object" && activeDot != null && "class" in activeDot
      ? activeDot.class
      : undefined;
  return (
    <circle
      class={["recharts-dot", customClass]}
      cx={dotProps.cx}
      cy={dotProps.cy}
      r={dotProps.r}
      fill={dotProps.fill}
      stroke={dotProps.stroke}
      stroke-width={dotProps.strokeWidth}
    />
  );
}

/** Render the active-dot layer from pre-resolved state (call in parent JSX). */
export function renderActivePointsLayerFromState(
  state: ActivePointState,
  args: ActivePointsProps,
): JSX.Element {
  const dotProps: ActiveDotProps = {
    index: state.childIndex,
    dataKey: args.itemDataKey,
    cx: state.cx,
    cy: state.cy,
    r: 4,
    fill: args.mainColor ?? "none",
    strokeWidth: 2,
    stroke: "#fff",
    payload: state.point.payload,
    value: state.point.value,
    ...svgPropertiesNoEventsFromUnknownKeepCase(args.activeDot),
  };
  return (
    <g class={["recharts-layer", "recharts-active-dot"]} clip-path={args.clipPath}>
      {renderActiveDot(args.activeDot, dotProps)}
    </g>
  );
}
