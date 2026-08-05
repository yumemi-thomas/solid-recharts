// Ported from recharts 3.8.1 src/component/Legend.tsx (commit 7a23854).
//
// MINIMAL PORT — renders the legend into the wrapper via a Portal, dispatches the
// legend settings + measured size into the store, and positions the wrapper div.
// Deferred (documented): custom `content` element cloning (a function content is
// supported), onBBoxUpdate, React.memo. Solid deviations: createPortal →
// `<Portal mount>`; useLayoutEffect dispatches → createEffect; hooks return
// accessors; `className`→`class`, React CSSProperties → JSX.CSSProperties.
import { createEffect, createMemo, merge, Show } from "solid-js";
import { JSX, Portal } from "@solidjs/web";
import {
  ContentType,
  DefaultLegendContent,
  HorizontalAlignmentType,
  LegendItemSorter,
  LegendPayload,
  Props as DefaultLegendContentProps,
  VerticalAlignmentType,
} from "./DefaultLegendContent";
import { Margin } from "../util/types";
import { getUniqPayload, UniqueOption } from "../util/payload/getUniqPayload";
import { useLegendPayload } from "../context/legendPayloadContext";
import { useLegendPortal } from "../context/legendPortalContext";
import { ElementOffset, useElementOffset } from "../util/useElementOffset";
import { useChartHeight, useChartWidth, useMargin } from "../context/chartLayoutContext";
import { useAppSelector, useAppStore } from "../state/hooks";
import {
  getCartesianPosition,
  isOutsidePosition,
  type CartesianPosition,
} from "../cartesian/getCartesianPosition";
import { cartesianPositionToCSSTranslate } from "../cartesian/cartesianPositionToCSSTranslate";
import { selectLegendArea } from "../state/selectors/selectLegendArea";
import { selectChartViewBox } from "../state/selectors/selectChartOffsetInternal";
import type { RechartsRootState } from "../state/store";
import type { CartesianLayout } from "../util/types";

function defaultUniqBy(entry: LegendPayload): string | undefined {
  return entry.value;
}

/** number → "<n>px", string → as-is, undefined → "auto". */
function toCssLength(value: number | string | undefined): string {
  if (value == null) {
    return "auto";
  }
  return typeof value === "number" ? `${value}px` : value;
}

export type LegendProps = Omit<DefaultLegendContentProps, "payload" | "layout"> & {
  content?: ContentType;
  wrapperStyle?: JSX.CSSProperties;
  width?: number | string;
  height?: number | string;
  payloadUniqBy?: UniqueOption<LegendPayload>;
  portal?: HTMLElement | null;
  itemSorter?: LegendItemSorter | null;
  layout?: CartesianLayout | "auto";
  position?: CartesianPosition;
  offset?: number;
};

export const legendDefaultProps = {
  align: "center",
  iconSize: 14,
  inactiveColor: "#ccc",
  itemSorter: "value",
  labelStyle: {},
  layout: "auto",
  verticalAlign: "bottom",
  offset: 0,
} as const satisfies Partial<LegendProps>;

// Props passed to a function-form `content`. Mirrors recharts' ContentProps: the
// legend props plus chart-derived margin/dimensions and the final (sorted) payload.
type LegendContentProps = Omit<LegendProps, "layout"> & {
  layout: CartesianLayout;
  margin?: Margin;
  chartWidth?: number;
  chartHeight?: number;
  payload?: ReadonlyArray<LegendPayload>;
};

// Port of recharts' getWidthOrHeight: a horizontal legend takes an explicit width
// or falls back to the available chart width; a vertical legend takes an explicit height.
function getWidthOrHeight(
  layout: CartesianLayout | undefined,
  height: number | string | undefined,
  width: number | string | undefined,
  maxWidth: number,
): { height?: number | string; width?: number | string } | null {
  if (layout === "vertical" && height != null) {
    return { height };
  }
  if (layout === "horizontal") {
    return { width: width || maxWidth };
  }
  return null;
}

function getLayoutForPosition(position: CartesianPosition | undefined): CartesianLayout {
  return position === "left" ||
    position === "right" ||
    position === "insideLeft" ||
    position === "insideRight"
    ? "vertical"
    : "horizontal";
}

function selectPositionViewBox(state: RechartsRootState, position: CartesianPosition | undefined) {
  if (position == null) {
    return null;
  }
  return isOutsidePosition(position) ? selectLegendArea(state) : selectChartViewBox(state);
}

function getOutsidePositionOffset(
  position: CartesianPosition | undefined,
  offset: number,
  box: ElementOffset,
): { top?: number; left?: number } {
  if (position === "top") return { top: box.height + offset };
  if (position === "bottom") return { top: -box.height - offset };
  if (position === "left") return { left: box.width + offset };
  if (position === "right") return { left: -box.width - offset };
  return {};
}

function getDefaultPosition(
  style: JSX.CSSProperties | undefined,
  props: {
    layout: CartesianLayout;
    align: HorizontalAlignmentType;
    verticalAlign: VerticalAlignmentType;
  },
  margin: Margin | undefined,
  chartWidth: number,
  chartHeight: number,
  box: ElementOffset,
): JSX.CSSProperties {
  const { layout, align, verticalAlign } = props;
  let hPos: JSX.CSSProperties = {};
  let vPos: JSX.CSSProperties = {};

  // When the user's wrapperStyle already pins a horizontal/vertical edge, the
  // computed position for that axis is skipped (recharts parity).
  if (style == null || (style.left == null && style.right == null)) {
    if (align === "center" && layout === "vertical") {
      hPos = { left: `${((chartWidth || 0) - box.width) / 2}px` };
    } else {
      hPos =
        align === "right"
          ? { right: `${margin?.right || 0}px` }
          : { left: `${margin?.left || 0}px` };
    }
  }

  if (style == null || (style.top == null && style.bottom == null)) {
    if (verticalAlign === "middle") {
      vPos = { top: `${((chartHeight || 0) - box.height) / 2}px` };
    } else {
      vPos =
        verticalAlign === "bottom"
          ? { bottom: `${margin?.bottom || 0}px` }
          : { top: `${margin?.top || 0}px` };
    }
  }

  return { ...hPos, ...vPos };
}

export const Legend = (props: LegendProps): JSX.Element => {
  const merged = merge(legendDefaultProps, props);
  const layout = (): CartesianLayout =>
    props.layout != null && props.layout !== "auto"
      ? props.layout
      : getLayoutForPosition(props.position);
  const store = useAppStore();
  const contextPayload = useLegendPayload();
  const legendPortalFromContext = useLegendPortal();
  const margin = useMargin();
  const chartWidth = useChartWidth();
  const chartHeight = useChartHeight();
  const positionViewBox = useAppSelector((state) => selectPositionViewBox(state, props.position));
  const [lastBoundingBox, updateBoundingBox] = useElementOffset();

  // Push the legend settings into the store (drives the offset's legend space).
  createEffect(
    () => ({
      align: merged.align,
      layout: layout(),
      verticalAlign: merged.verticalAlign,
      itemSorter: merged.itemSorter,
      position: props.position,
      offset: merged.offset,
    }),
    (settings) => {
      store?.actions.legend.setLegendSettings(settings);
    },
  );

  // Report the measured size; reset to 0 on cleanup. (When a portal is supplied
  // from props, nothing needs the size, matching recharts.)
  createEffect(
    () => ({ width: lastBoundingBox().width, height: lastBoundingBox().height }),
    (size) => {
      if (props.portal == null && (props.position == null || isOutsidePosition(props.position))) {
        store?.actions.legend.setLegendSize(size);
      }
    },
  );

  const portal = (): HTMLElement | null => props.portal ?? legendPortalFromContext();

  const finalPayload = createMemo<ReadonlyArray<LegendPayload>>(() =>
    getUniqPayload(contextPayload() ?? [], merged.payloadUniqBy, defaultUniqBy),
  );

  // Props handed to a function-form `content`. Built as a plain object (spreading
  // the Solid `merge()` proxy leaks a MERGE_SOURCE symbol and doesn't materialize
  // keys); reads finalPayload()/chart dims so the enclosing reactive insert re-runs
  // when the payload populates.
  const buildContentProps = (): LegendContentProps => {
    const w = chartWidth() ?? 0;
    const h = chartHeight() ?? 0;
    const m = margin();
    const maxWidth = w - (m?.left ?? 0) - (m?.right ?? 0);
    const widthOrHeight = getWidthOrHeight(layout(), merged.height, merged.width, maxWidth);
    return {
      align: merged.align,
      iconSize: merged.iconSize,
      inactiveColor: merged.inactiveColor,
      itemSorter: merged.itemSorter,
      labelStyle: merged.labelStyle,
      layout: layout(),
      verticalAlign: merged.verticalAlign,
      content: merged.content,
      offset: merged.offset,
      ...(merged.iconType == null ? {} : { iconType: merged.iconType }),
      ...(merged.formatter == null ? {} : { formatter: merged.formatter }),
      ...(merged.onClick == null ? {} : { onClick: merged.onClick }),
      ...(merged.onMouseEnter == null ? {} : { onMouseEnter: merged.onMouseEnter }),
      ...(merged.onMouseLeave == null ? {} : { onMouseLeave: merged.onMouseLeave }),
      ...(merged.wrapperStyle == null ? {} : { wrapperStyle: merged.wrapperStyle }),
      ...(merged.payloadUniqBy == null ? {} : { payloadUniqBy: merged.payloadUniqBy }),
      ...(merged.portal == null ? {} : { portal: merged.portal }),
      ...(props.position == null ? {} : { position: props.position }),
      ...widthOrHeight,
      margin: m,
      chartWidth: w,
      chartHeight: h,
      payload: finalPayload(),
    };
  };

  const outerStyle = (): JSX.CSSProperties => {
    if (props.portal != null) {
      return merged.wrapperStyle ?? {};
    }
    const w = chartWidth();
    const h = chartHeight();
    const m = margin();
    const maxWidth = (w ?? 0) - (m?.left ?? 0) - (m?.right ?? 0);
    const widthOrHeight = getWidthOrHeight(layout(), merged.height, merged.width, maxWidth);
    const vb = positionViewBox();
    const positionResult =
      props.position == null || vb == null
        ? null
        : getCartesianPosition({
            viewBox: vb,
            position: props.position,
            offset: merged.offset,
          });
    const outsideOffset = getOutsidePositionOffset(
      props.position,
      merged.offset,
      lastBoundingBox(),
    );
    const positionStyle: JSX.CSSProperties = positionResult
      ? {
          width: "max-content",
          height: "max-content",
          "max-width": toCssLength(
            layout() === "vertical" ? (vb?.width ?? 0) / 2 : (vb?.width ?? 0),
          ),
          "max-height": toCssLength(
            layout() === "horizontal" ? (vb?.height ?? 0) / 2 : (vb?.height ?? 0),
          ),
          "overflow-y": "auto",
          top: toCssLength(positionResult.y + (outsideOffset.top ?? 0)),
          left: toCssLength(positionResult.x + (outsideOffset.left ?? 0)),
          transform: cartesianPositionToCSSTranslate(
            positionResult.horizontalAnchor,
            positionResult.verticalAnchor,
          ),
        }
      : getDefaultPosition(
          merged.wrapperStyle,
          { layout: layout(), align: merged.align, verticalAlign: merged.verticalAlign },
          m,
          w ?? 0,
          h ?? 0,
          lastBoundingBox(),
        );
    return {
      position: "absolute",
      // Matches recharts: a horizontal legend without an explicit width fills the
      // available chart width (maxWidth) via getWidthOrHeight; otherwise "auto".
      width: toCssLength(widthOrHeight?.width ?? merged.width),
      height: toCssLength(widthOrHeight?.height ?? merged.height),
      ...positionStyle,
      ...merged.wrapperStyle,
    };
  };

  return (
    <Show
      when={
        portal() != null &&
        contextPayload() != null &&
        chartWidth() != null &&
        chartHeight() != null &&
        (props.position == null || positionViewBox() != null)
          ? portal()
          : null
      }
    >
      {(mount) => (
        <Portal mount={mount()}>
          <div class="recharts-legend-wrapper" style={outerStyle()} ref={updateBoundingBox}>
            <Show
              when={typeof merged.content === "function" ? merged.content : null}
              fallback={
                <DefaultLegendContent
                  payload={finalPayload()}
                  iconSize={merged.iconSize}
                  iconType={merged.iconType}
                  layout={layout()}
                  align={merged.align}
                  verticalAlign={merged.verticalAlign}
                  inactiveColor={merged.inactiveColor}
                  formatter={merged.formatter}
                  labelStyle={merged.labelStyle}
                  onClick={merged.onClick}
                  onMouseEnter={merged.onMouseEnter}
                  onMouseLeave={merged.onMouseLeave}
                />
              }
            >
              {(contentFn) => <>{contentFn()(buildContentProps())}</>}
            </Show>
          </div>
        </Portal>
      )}
    </Show>
  );
};
