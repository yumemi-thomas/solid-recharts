// Ported from recharts 3.8.1 src/cartesian/ReferenceArea.tsx (commit 7a23854).
//
// Draws a rectangle spanning a DATA-coordinate range (x1..x2, y1..y2), mapped to
// pixels through the cartesian scale spine. Omitted edges extend to the plot-area
// boundary (rangeMin/rangeMax of the corresponding scale).
//
// Solid deviations (documented):
//  - resolveDefaultProps → `merge`; useEffect add/remove → createEffect + onCleanup.
//  - The registered settings carry a generated `id` (proxy-safe removal).
//  - recharts builds the rect from NullableCoordinate via `@ts-expect-error`
//    (relying on JS `null`→0 arithmetic coercion in rectWithPoints). We make that
//    explicit with `?? 0`, keeping it typed (no assertions). The isInRange discard
//    check still uses the nullable coordinates.
//  - The `label` prop IS wired (CartesianLabelFromLabelProp), and the rect renders
//    inside <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.area}>.
//  - PERMANENT-N/A (by design, NOT deferred): the custom-element `shape` branch
//    (React.cloneElement — use the render-function form). <Label>
//    CHILDREN are not rendered (the `label` prop is).
import { createMemo, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Layer } from "../container/Layer";
import {
  CartesianLabelContextProvider,
  CartesianLabelFromLabelProp,
  type ImplicitLabelType,
} from "../component/Label";
import { rectWithPoints } from "../util/CartesianUtils";
import { IfOverflow } from "../util/IfOverflow";
import { isNumOrStr } from "../util/DataUtils";
import { type RectangleProps, Rectangle } from "../shape/Rectangle";
import type { ReferenceAreaSettings } from "../state/referenceElementsSlice";
import { useAppSelector, useAppStore } from "../state/hooks";
import { selectAxisScale } from "../state/selectors/axisSelectors";
import { useIsPanorama } from "../context/PanoramaContext";
import { useClipPathId } from "../container/ClipPathProvider";
import { svgPropertiesAndEventsKeepCase } from "../util/svgPropertiesAndEvents";
import { useUniqueId } from "../util/useUniqueId";
import { RectanglePosition } from "../util/types";
import { RechartsScale } from "../util/scale/RechartsScale";
import { CartesianScaleHelperImpl } from "../util/scale/CartesianScaleHelper";
import type { AxisId } from "../state/cartesianAxisSlice";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";
import { registerInStore } from "../state/registerInStore";

type ReferenceCoordinateValue = number | string;

export interface ReferenceAreaProps<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> {
  /** Starting X-coordinate (data space). Extends to the left edge if undefined. */
  x1?: XValueType;
  /** Ending X-coordinate (data space). Extends to the right edge if undefined. */
  x2?: XValueType;
  /** Starting Y-coordinate (data space). Extends to the top edge if undefined. */
  y1?: YValueType;
  /** Ending Y-coordinate (data space). Extends to the bottom edge if undefined. */
  y2?: YValueType;
  /** The id of the corresponding y-axis. @defaultValue 0 */
  yAxisId?: AxisId;
  /** The id of the corresponding x-axis. @defaultValue 0 */
  xAxisId?: AxisId;
  /** Defines how to draw the area when it overflows the plot area. @defaultValue 'discard' */
  ifOverflow?: IfOverflow;
  /** Custom render function for the area shape. */
  shape?: (props: RectangleProps) => JSX.Element;
  /** A single label rendered inside the area. @defaultValue false */
  label?: ImplicitLabelType;
  /** Stacking order within the chart's z-index system. @defaultValue DefaultZIndexes.area */
  zIndex?: number;
  class?: string;
  children?: JSX.Element;
}

export type Props<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> = Omit<RectangleProps, "width" | "height" | "x" | "y" | "class"> &
  ReferenceAreaProps<XValueType, YValueType>;

const getRect = (
  hasX1: boolean,
  hasX2: boolean,
  hasY1: boolean,
  hasY2: boolean,
  xAxisScale: RechartsScale,
  yAxisScale: RechartsScale,
  props: { x1?: unknown; x2?: unknown; y1?: unknown; y2?: unknown; ifOverflow: IfOverflow },
): RectanglePosition | null => {
  const scales = new CartesianScaleHelperImpl({ x: xAxisScale, y: yAxisScale });

  const p1x = hasX1
    ? (xAxisScale.map(props.x1, { position: "start" }) ?? null)
    : xAxisScale.rangeMin();
  const p1y = hasY1
    ? (yAxisScale.map(props.y1, { position: "start" }) ?? null)
    : yAxisScale.rangeMin();
  const p2x = hasX2
    ? (xAxisScale.map(props.x2, { position: "end" }) ?? null)
    : xAxisScale.rangeMax();
  const p2y = hasY2
    ? (yAxisScale.map(props.y2, { position: "end" }) ?? null)
    : yAxisScale.rangeMax();

  if (
    props.ifOverflow === "discard" &&
    (!scales.isInRange({ x: p1x, y: p1y }) || !scales.isInRange({ x: p2x, y: p2y }))
  ) {
    return null;
  }

  // recharts passes NullableCoordinate here behind an `@ts-expect-error`; the
  // `?? 0` makes the JS null→0 arithmetic coercion (in rectWithPoints) explicit.
  return rectWithPoints({ x: p1x ?? 0, y: p1y ?? 0 }, { x: p2x ?? 0, y: p2y ?? 0 });
};

const renderRect = (option: ReferenceAreaProps["shape"], props: RectangleProps): JSX.Element => {
  if (typeof option === "function") {
    return option(props);
  }
  return <Rectangle {...props} class="recharts-reference-area-rect" />;
};

function ReportReferenceArea(props: ReferenceAreaSettings): JSX.Element {
  const store = useAppStore();
  if (store != null) {
    registerInStore<ReferenceAreaSettings>(
      () => ({
        id: props.id,
        xAxisId: props.xAxisId,
        yAxisId: props.yAxisId,
        ifOverflow: props.ifOverflow,
        x1: props.x1,
        x2: props.x2,
        y1: props.y1,
        y2: props.y2,
      }),
      {
        add: (next) => store.actions.referenceElements.addArea(next),
        // No replace action on the slice; a change is remove-then-add (recharts idiom).
        replace: (prev, next) => {
          store.actions.referenceElements.removeArea(prev);
          store.actions.referenceElements.addArea(next);
        },
        remove: (prev) => store.actions.referenceElements.removeArea(prev),
      },
    );
  }

  return null;
}

const referenceAreaDefaultProps = {
  ifOverflow: "discard",
  xAxisId: 0,
  yAxisId: 0,
  radius: 0,
  fill: "#ccc",
  stroke: "none",
  fillOpacity: 0.5,
  strokeWidth: 1,
  label: false,
} as const satisfies Partial<Props>;

function ReferenceAreaImpl(props: Props): JSX.Element {
  const merged = merge(referenceAreaDefaultProps, props);
  const clipPathId = useClipPathId();
  const isPanorama = useIsPanorama();
  const xAxisScale = useAppSelector((s) => selectAxisScale(s, "xAxis", merged.xAxisId, isPanorama));
  const yAxisScale = useAppSelector((s) => selectAxisScale(s, "yAxis", merged.yAxisId, isPanorama));

  const rect = createMemo<RectanglePosition | null>(() => {
    const xs = xAxisScale();
    const ys = yAxisScale();
    if (xs == null || ys == null) {
      return null;
    }
    const hasX1 = isNumOrStr(merged.x1);
    const hasX2 = isNumOrStr(merged.x2);
    const hasY1 = isNumOrStr(merged.y1);
    const hasY2 = isNumOrStr(merged.y2);
    if (!hasX1 && !hasX2 && !hasY1 && !hasY2 && merged.shape == null) {
      return null;
    }
    return getRect(hasX1, hasX2, hasY1, hasY2, xs, ys, {
      x1: merged.x1,
      x2: merged.x2,
      y1: merged.y1,
      y2: merged.y2,
      ifOverflow: merged.ifOverflow,
    });
  });

  // The memo returns the rect PROPS (or null) — all reactive prop reads (the svg
  // spread) happen in this tracking scope. Show keys on it; the callback only
  // reads the memo accessor + the (static) shape, so no untracked reads.
  const rectProps = createMemo<RectangleProps | null>(() => {
    const r = rect();
    if (r == null && merged.shape == null) {
      return null;
    }
    const clipPath = merged.ifOverflow === "hidden" ? `url(#${clipPathId})` : undefined;
    return {
      clipPath,
      ...svgPropertiesAndEventsKeepCase({ ...merged }),
      ...(r ?? {}),
    };
  });

  return (
    <Show when={rectProps()}>
      {(p) => (
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.area}>
          <Layer class="recharts-reference-area">
            {renderRect(merged.shape, p())}
            <Show when={rect()}>
              {(box) => (
                <CartesianLabelContextProvider
                  x={box().x}
                  y={box().y}
                  width={box().width}
                  height={box().height}
                  upperWidth={box().width}
                  lowerWidth={box().width}
                >
                  <CartesianLabelFromLabelProp label={merged.label} />
                </CartesianLabelContextProvider>
              )}
            </Show>
          </Layer>
        </ZIndexLayer>
      )}
    </Show>
  );
}

/**
 * Draws a rectangular area on the chart spanning a data-coordinate range (the
 * cartesian-aware version of {@link Rectangle}).
 */
export function ReferenceArea<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
>(props: Props<XValueType, YValueType>): JSX.Element {
  const merged = merge(referenceAreaDefaultProps, props);
  const id = useUniqueId("recharts-reference-area");
  return (
    <>
      <ReportReferenceArea
        id={id}
        yAxisId={merged.yAxisId}
        xAxisId={merged.xAxisId}
        ifOverflow={merged.ifOverflow}
        x1={merged.x1}
        x2={merged.x2}
        y1={merged.y1}
        y2={merged.y2}
      />
      <ReferenceAreaImpl {...props} />
    </>
  );
}

ReferenceArea.displayName = "ReferenceArea";
