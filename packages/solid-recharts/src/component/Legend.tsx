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
import { LayoutType, Margin } from "../util/types";
import { getUniqPayload, UniqueOption } from "../util/payload/getUniqPayload";
import { useLegendPayload } from "../context/legendPayloadContext";
import { useLegendPortal } from "../context/legendPortalContext";
import { ElementOffset, useElementOffset } from "../util/useElementOffset";
import { useChartHeight, useChartWidth, useMargin } from "../context/chartLayoutContext";
import { useAppStore } from "../state/hooks";

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

export type LegendProps = Omit<DefaultLegendContentProps, "payload"> & {
  content?: ContentType;
  wrapperStyle?: JSX.CSSProperties;
  width?: number | string;
  height?: number | string;
  payloadUniqBy?: UniqueOption<LegendPayload>;
  portal?: HTMLElement | null;
  itemSorter?: LegendItemSorter | null;
};

export const legendDefaultProps = {
  align: "center",
  iconSize: 14,
  inactiveColor: "#ccc",
  itemSorter: "value",
  layout: "horizontal",
  verticalAlign: "bottom",
} as const satisfies Partial<LegendProps>;

function getDefaultPosition(
  props: {
    layout: LayoutType;
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

  if (align === "center" && layout === "vertical") {
    hPos = { left: `${((chartWidth || 0) - box.width) / 2}px` };
  } else {
    hPos =
      align === "right" ? { right: `${margin?.right || 0}px` } : { left: `${margin?.left || 0}px` };
  }

  if (verticalAlign === "middle") {
    vPos = { top: `${((chartHeight || 0) - box.height) / 2}px` };
  } else {
    vPos =
      verticalAlign === "bottom"
        ? { bottom: `${margin?.bottom || 0}px` }
        : { top: `${margin?.top || 0}px` };
  }

  return { ...hPos, ...vPos };
}

export const Legend = (props: LegendProps): JSX.Element => {
  const merged = merge(legendDefaultProps, props);
  const store = useAppStore();
  const contextPayload = useLegendPayload();
  const legendPortalFromContext = useLegendPortal();
  const margin = useMargin();
  const chartWidth = useChartWidth();
  const chartHeight = useChartHeight();
  const [lastBoundingBox, updateBoundingBox] = useElementOffset();

  // Push the legend settings into the store (drives the offset's legend space).
  createEffect(
    () => ({
      align: merged.align,
      layout: merged.layout,
      verticalAlign: merged.verticalAlign,
      itemSorter: merged.itemSorter,
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
      if (props.portal == null) {
        store?.actions.legend.setLegendSize(size);
      }
    },
  );

  const portal = (): HTMLElement | null => props.portal ?? legendPortalFromContext();

  const finalPayload = createMemo<ReadonlyArray<LegendPayload>>(() =>
    getUniqPayload(contextPayload() ?? [], merged.payloadUniqBy, defaultUniqBy),
  );

  const outerStyle = (): JSX.CSSProperties => {
    if (props.portal != null) {
      return merged.wrapperStyle ?? {};
    }
    const w = chartWidth();
    const h = chartHeight();
    return {
      position: "absolute",
      width: toCssLength(merged.width),
      height: toCssLength(merged.height),
      ...getDefaultPosition(
        { layout: merged.layout, align: merged.align, verticalAlign: merged.verticalAlign },
        margin(),
        w ?? 0,
        h ?? 0,
        lastBoundingBox(),
      ),
      ...merged.wrapperStyle,
    };
  };

  return (
    <Show
      when={
        portal() != null &&
        contextPayload() != null &&
        chartWidth() != null &&
        chartHeight() != null
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
                  layout={merged.layout}
                  align={merged.align}
                  verticalAlign={merged.verticalAlign}
                  inactiveColor={merged.inactiveColor}
                  formatter={merged.formatter}
                  labelStyle={merged.labelStyle}
                />
              }
            >
              {(contentFn) => contentFn()({ ...merged, payload: finalPayload() })}
            </Show>
          </div>
        </Portal>
      )}
    </Show>
  );
};
