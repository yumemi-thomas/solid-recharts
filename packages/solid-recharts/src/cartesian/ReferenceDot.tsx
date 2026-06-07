// Ported from recharts 3.8.1 src/cartesian/ReferenceDot.tsx (commit 7a23854).
//
// Draws a circle at a DATA coordinate (x, y), mapped to pixels through the
// cartesian scale spine (CartesianScaleHelperImpl over the x/y RechartsScales).
//
// Solid deviations (documented):
//  - resolveDefaultProps → `merge`; useEffect add/remove → createEffect + onCleanup.
//  - The registered settings carry a generated `id` (proxy-safe removal).
//  - DEFERRED: the `label` prop (component/Label not ported), `zIndex`/ZIndexLayer,
//    the custom-element `shape` branch (React.cloneElement), and the per-dot mouse
//    event callbacks (recharts forwards (dotProps, e) — wired with the Dot vertical's
//    event plumbing later). `children` is not rendered (CartesianLabelContext).
import { createEffect, createMemo, merge, onCleanup, Show } from "solid-js";
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
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { useUniqueId } from "../util/useUniqueId";
import type { AxisId } from "../state/cartesianAxisSlice";
import { Coordinate } from "../util/types";
import { CartesianScaleHelperImpl } from "../util/scale/CartesianScaleHelper";

type ReferenceCoordinateValue = number | string;

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
  class?: string;
  children?: JSX.Element;
}

export type Props<
  XValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
  YValueType extends ReferenceCoordinateValue = ReferenceCoordinateValue,
> = Omit<DotProps, "cx" | "cy" | "clipDot" | "class"> & ReferenceDotProps<XValueType, YValueType>;

function ReportReferenceDot(props: ReferenceDotSettings): JSX.Element {
  const store = useAppStore();
  let prev: ReferenceDotSettings | null = null;

  createEffect(
    (): ReferenceDotSettings => ({
      id: props.id,
      xAxisId: props.xAxisId,
      yAxisId: props.yAxisId,
      ifOverflow: props.ifOverflow,
      x: props.x,
      y: props.y,
      r: props.r,
    }),
    (settings) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.referenceElements.addDot(settings);
      } else if (prev !== settings) {
        store.actions.referenceElements.removeDot(prev);
        store.actions.referenceElements.addDot(settings);
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.referenceElements.removeDot(prev);
      prev = null;
    }
  });

  return null;
}

const renderDot = (option: Props["shape"], props: DotProps): JSX.Element => {
  if (typeof option === "function") {
    return option(props);
  }
  return <Dot {...props} cx={props.cx} cy={props.cy} class="recharts-reference-dot-dot" />;
};

const referenceDotDefaultProps = {
  ifOverflow: "discard",
  xAxisId: 0,
  yAxisId: 0,
  r: 10,
  fill: "#fff",
  stroke: "#ccc",
  // Kebab keys: see ReferenceLine — compound presentation attrs use Solid's kebab form.
  "fill-opacity": 1,
  "stroke-width": 1,
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
      "clip-path": clipPath,
      ...svgPropertiesAndEvents({ ...merged }),
      cx: c.x,
      cy: c.y,
      r: merged.r,
    };
  });

  return (
    <Show when={dotProps()}>
      {(p) => (
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
