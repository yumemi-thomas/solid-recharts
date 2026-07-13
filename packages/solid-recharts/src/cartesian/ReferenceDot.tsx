// Ported from recharts 3.8.1 src/cartesian/ReferenceDot.tsx (commit 7a23854).
//
// Draws a circle at a DATA coordinate (x, y), mapped to pixels through the
// cartesian scale spine (CartesianScaleHelperImpl over the x/y RechartsScales).
//
// Solid deviations (documented):
//  - resolveDefaultProps → `merge`; useEffect add/remove → createEffect + onCleanup.
//  - The registered settings carry a generated `id` (proxy-safe removal).
//  - Mouse handlers are wrapped props-first (`(dotProps, e)`) on the default dot
//    via adaptEventHandlers (recharts does this inside Dot; the port's Dot
//    forwards raw delegated handlers).
//  - PERMANENT-N/A (by design, NOT deferred): the custom-element `shape` branch
//    (React.cloneElement — use the render-function form);
//    `children` is not rendered (CartesianLabelContext).
import { createMemo, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import { Dot, type DotProps } from "../shape/Dot";
import {
  CartesianLabelContextProvider,
  CartesianLabelFromLabelProp,
  type ImplicitLabelType,
} from "../component/Label";
import { isNumOrStr } from "../util/DataUtils";
import { IfOverflow } from "../util/IfOverflow";
import type { ReferenceDotSettings } from "../state/referenceElementsSlice";
import { useAppSelector, useAppStore } from "../state/hooks";
import { selectAxisScale } from "../state/selectors/axisSelectors";
import { useIsPanorama } from "../context/PanoramaContext";
import { useClipPathId } from "../container/ClipPathProvider";
import { svgPropertiesAndEventsKeepCase } from "../util/svgPropertiesAndEvents";
import { adaptEventHandlers } from "../util/adaptEventHandlers";
import { useUniqueId } from "../util/useUniqueId";
import type { AxisId } from "../state/cartesianAxisSlice";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { Coordinate } from "../util/types";
import { CartesianScaleHelperImpl } from "../util/scale/CartesianScaleHelper";
import { registerInStore } from "../state/registerInStore";

type ReferenceCoordinateValue = number | string;

/**
 * ReferenceDot mouse handlers are called props-first: `(dotProps, event)` (recharts parity).
 * The event's `currentTarget` is the rendered `<circle>`, so the event satisfies
 * `SVGMousePointer` and can be passed to {@link getRelativeCoordinate} directly.
 */
export type ReferenceDotEventHandler = (
  dotProps: DotProps,
  event: MouseEvent & { currentTarget: SVGCircleElement },
) => void;

/** Touch variant of {@link ReferenceDotEventHandler} — also called props-first. */
export type ReferenceDotTouchEventHandler = (
  dotProps: DotProps,
  event: TouchEvent & { currentTarget: SVGCircleElement },
) => void;

export interface ReferenceDotProps<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> {
  /** The radius of the dot in pixels. @defaultValue 10 */
  r?: number;
  /** The x-coordinate (data space) of the center of the dot. */
  x?: XValueType;
  /** The y-coordinate (data space) of the center of the dot. */
  y?: YValueType;
  /** The id of the corresponding y-axis. @defaultValue 0 */
  yAxisId?: AxisId;
  /** The id of the corresponding x-axis. @defaultValue 0 */
  xAxisId?: AxisId;
  /** Defines how to draw the dot when it overflows the plot area. @defaultValue 'discard' */
  ifOverflow?: IfOverflow;
  /** Custom render function for the dot shape. */
  shape?: (props: DotProps) => JSX.Element;
  /** A single label rendered around the dot. @defaultValue false */
  label?: ImplicitLabelType;
  /** Stacking order within the chart's z-index system. @defaultValue DefaultZIndexes.scatter */
  zIndex?: number;
  class?: string;
  children?: JSX.Element;
  /** The customized event handler of click on the dot. */
  onClick?: ReferenceDotEventHandler;
  /** The customized event handler of mousedown on the dot. */
  onMouseDown?: ReferenceDotEventHandler;
  /** The customized event handler of mouseup on the dot. */
  onMouseUp?: ReferenceDotEventHandler;
  /** The customized event handler of mouseover on the dot. */
  onMouseOver?: ReferenceDotEventHandler;
  /** The customized event handler of mouseout on the dot. */
  onMouseOut?: ReferenceDotEventHandler;
  /** The customized event handler of mouseenter on the dot. */
  onMouseEnter?: ReferenceDotEventHandler;
  /** The customized event handler of mousemove on the dot. */
  onMouseMove?: ReferenceDotEventHandler;
  /** The customized event handler of mouseleave on the dot. */
  onMouseLeave?: ReferenceDotEventHandler;
  /** The customized event handler of touchstart on the dot. */
  onTouchStart?: ReferenceDotTouchEventHandler;
  /** The customized event handler of touchmove on the dot. */
  onTouchMove?: ReferenceDotTouchEventHandler;
  /** The customized event handler of touchend on the dot. */
  onTouchEnd?: ReferenceDotTouchEventHandler;
}

export type Props<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> = Omit<
  DotProps,
  | "cx"
  | "cy"
  | "clipDot"
  | "class"
  // Redeclared above with the recharts props-first `(dotProps, event)` signature.
  | "onClick"
  | "onMouseDown"
  | "onMouseUp"
  | "onMouseOver"
  | "onMouseOut"
  | "onMouseEnter"
  | "onMouseMove"
  | "onMouseLeave"
  | "onTouchStart"
  | "onTouchMove"
  | "onTouchEnd"
> &
  ReferenceDotProps<XValueType, YValueType>;

function ReportReferenceDot(props: ReferenceDotSettings): JSX.Element {
  const store = useAppStore();
  if (store != null) {
    registerInStore<ReferenceDotSettings>(
      () => ({
        id: props.id,
        xAxisId: props.xAxisId,
        yAxisId: props.yAxisId,
        ifOverflow: props.ifOverflow,
        x: props.x,
        y: props.y,
        r: props.r,
      }),
      {
        add: (next) => store.actions.referenceElements.addDot(next),
        // No replace action on the slice; a change is remove-then-add (recharts idiom).
        replace: (prev, next) => {
          store.actions.referenceElements.removeDot(prev);
          store.actions.referenceElements.addDot(next);
        },
        remove: (prev) => store.actions.referenceElements.removeDot(prev),
      },
    );
  }

  return null;
}

const renderDot = (option: Props["shape"], props: DotProps): JSX.Element => {
  if (typeof option === "function") {
    return option(props);
  }
  // recharts' Dot rewraps its event handlers props-first via adaptEventHandlers
  // (a user's onClick is called `(dotProps, event)`); the port's Dot forwards raw
  // delegated handlers, so the wrapping happens here on the default-dot branch
  // (a custom `shape` receives the raw props, as in recharts).
  const dotProps: DotProps = { ...props, class: "recharts-reference-dot-dot" };
  return (
    <Dot {...dotProps} {...(adaptEventHandlers(dotProps) ?? {})} cx={props.cx} cy={props.cy} />
  );
};

const referenceDotDefaultProps = {
  ifOverflow: "discard",
  xAxisId: 0,
  yAxisId: 0,
  r: 10,
  fill: "#fff",
  stroke: "#ccc",
  fillOpacity: 1,
  strokeWidth: 1,
  label: false,
} as const satisfies Partial<Props>;

function ReferenceDotImpl(props: Props): JSX.Element {
  const merged = merge(referenceDotDefaultProps, props);
  const clipPathId = useClipPathId();
  const isPanorama = useIsPanorama();
  const xAxisScale = useAppSelector((s) => selectAxisScale(s, "xAxis", merged.xAxisId, isPanorama));
  const yAxisScale = useAppSelector((s) => selectAxisScale(s, "yAxis", merged.yAxisId, isPanorama));

  const coordinate = createMemo<Coordinate | null>(() => {
    const xv = merged.x;
    const yv = merged.y;
    const xs = xAxisScale();
    const ys = yAxisScale();
    if (!isNumOrStr(xv) || !isNumOrStr(yv) || xs == null || ys == null) {
      return null;
    }
    const scales = new CartesianScaleHelperImpl({ x: xs, y: ys });
    const result = scales.map({ x: xv, y: yv }, { position: "middle" });
    if (merged.ifOverflow === "discard" && !scales.isInRange(result)) {
      return null;
    }
    return result;
  });

  // The memo returns the dot PROPS (or null) — all reactive prop reads (the svg
  // spread) happen in this tracking scope, so the Show callback has no untracked
  // reads beyond the (static) shape.
  const dotProps = createMemo<DotProps | null>(() => {
    const c = coordinate();
    if (!c) {
      return null;
    }
    const clipPath = merged.ifOverflow === "hidden" ? `url(#${clipPathId})` : undefined;
    return {
      clipPath,
      ...svgPropertiesAndEventsKeepCase({ ...merged }),
      cx: c.x,
      cy: c.y,
      r: merged.r,
    };
  });

  return (
    <Show when={dotProps()}>
      {(p) => (
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.scatter}>
          <Layer class="recharts-reference-dot">
            {renderDot(merged.shape, p())}
            <CartesianLabelContextProvider
              x={(p().cx ?? 0) - merged.r}
              y={(p().cy ?? 0) - merged.r}
              width={2 * merged.r}
              height={2 * merged.r}
              upperWidth={2 * merged.r}
              lowerWidth={2 * merged.r}
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
 * Draws a circle on the chart at a data coordinate (the cartesian-aware version
 * of {@link Dot}). ReferenceDot maps the provided data coordinates to pixels
 * through the chart's scales.
 */
export function ReferenceDot<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
>(props: Props<XValueType, YValueType>): JSX.Element {
  const merged = merge(referenceDotDefaultProps, props);
  const id = useUniqueId("recharts-reference-dot");
  return (
    <>
      <ReportReferenceDot
        id={id}
        y={merged.y}
        x={merged.x}
        r={merged.r}
        yAxisId={merged.yAxisId}
        xAxisId={merged.xAxisId}
        ifOverflow={merged.ifOverflow}
      />
      <ReferenceDotImpl {...props} />
    </>
  );
}

ReferenceDot.displayName = "ReferenceDot";
