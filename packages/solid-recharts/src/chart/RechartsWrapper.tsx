// Ported from recharts 3.8.1 src/chart/RechartsWrapper.tsx (commit 7a23854).
//
// FULLY WIRED (the original render-only scaffold has since grown the real
// behavior): mouse/keyboard/touch event dispatch, cross-chart synchronisation,
// ResponsiveContainer-context sizing, and the tooltip/legend portal contexts.
// Renders the `recharts-wrapper` div + `ReportChartSize` (which drives the
// Surface dimensions) + children.
import { createMemo, createSignal, flush, onCleanup, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { ReportChartSize } from "../context/chartLayoutContext";
import { TooltipPortalContext } from "../context/tooltipPortalContext";
import { LegendPortalContext } from "../context/legendPortalContext";
import { useResponsiveContainerContext } from "../component/ResponsiveContainer";
import { useAppStore } from "../state/hooks";
import { getRelativeCoordinate } from "../util/getRelativeCoordinate";
import {
  selectActivePropsFromChartPointer,
  selectAllGraphicalItemsSettings,
} from "../state/selectors/tooltipSelectors";
import { selectTooltipCoordinate } from "../state/selectors/touchSelectors";
import {
  DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME,
  DATA_ITEM_INDEX_ATTRIBUTE_NAME,
} from "../util/Constants";
import { selectTooltipEventType } from "../state/selectors/selectTooltipEventType";
import {
  dispatchKeyDown,
  handleBlurEvent,
  handleFocusEvent,
} from "../state/keyboardEventsMiddleware";
import { dispatchExternalEvent } from "../state/externalEventsMiddleware";
import { dispatchMouseClick, dispatchMouseMove } from "../state/mouseEventsMiddleware";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";
import type { ExternalMouseEvents } from "./types";
import type { ChartStyle, Percent } from "../util/types";
import type { ExternalEventActionPayload } from "../state/externalEventsMiddleware";
import {
  useBrushChartSynchronisation,
  useSynchronisedEventsFromOtherCharts,
} from "../synchronisation/useChartSynchronisation";

export interface RechartsWrapperProps extends ExternalMouseEvents {
  children: JSX.Element;
  width: number | Percent | undefined;
  height: number | Percent | undefined;
  responsive: boolean;
  class?: string;
  style?: ChartStyle;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  dispatchTouchEvents?: boolean;
}

function styleDimension(value: ChartStyle[keyof ChartStyle]): number | string | undefined {
  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

function kebabCaseStyleName(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function cssValue(value: string | number | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (value === 0) {
    return "0";
  }
  return typeof value === "number" ? `${value}px` : value;
}

function styleObjectToString(style: ChartStyle | undefined): string {
  if (style == null) {
    return "";
  }
  return Object.entries(style)
    .filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    )
    .map(([key, value]) => `${kebabCaseStyleName(key)}: ${cssValue(value)}`)
    .join("; ");
}

function styleEntry(key: string, value: string | number | undefined): string | undefined {
  const formatted = cssValue(value);
  return formatted == null ? undefined : `${key}: ${formatted}`;
}

function joinStyle(parts: ReadonlyArray<string | undefined>): string {
  return parts.filter((part): part is string => part != null && part.length > 0).join("; ");
}

export const RechartsWrapper = (props: RechartsWrapperProps): JSX.Element => {
  // The wrapper div doubles as the Tooltip's portal target (as in recharts, where
  // the same node is passed to setTooltipPortal). The ref sets a signal that the
  // TooltipPortalContext exposes reactively, then forwards to the caller's ref.
  const [tooltipPortal, setTooltipPortal] = createSignal<HTMLElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = createSignal<number | undefined>(undefined, {
    ownedWrite: true,
  });
  const [measuredHeight, setMeasuredHeight] = createSignal<number | undefined>(undefined, {
    ownedWrite: true,
  });
  let wrapperEl: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const store = useAppStore();
  const responsiveContainerCalculations = useResponsiveContainerContext();

  // Subscribe this chart to cross-chart synchronisation (tooltip + brush). No-op
  // unless a syncId is set; creates the chart's event-emitter symbol.
  useSynchronisedEventsFromOtherCharts();
  useBrushChartSynchronisation();

  const width = (): number | Percent | undefined =>
    responsiveContainerCalculations != null && responsiveContainerCalculations.width > 0
      ? responsiveContainerCalculations.width
      : props.width;

  const height = (): number | Percent | undefined =>
    responsiveContainerCalculations != null && responsiveContainerCalculations.height > 0
      ? responsiveContainerCalculations.height
      : props.height;

  const wrapperStyle = (): string =>
    joinStyle([
      "position: relative",
      "cursor: default",
      styleObjectToString(props.style),
      styleEntry("width", width()),
      styleEntry("height", height()),
    ]);

  const divWidth = (): number | string | undefined => width() ?? styleDimension(props.style?.width);
  const divHeight = (): number | string | undefined =>
    height() ?? styleDimension(props.style?.height);

  const setContainerSize = (newWidth: number, newHeight: number): void => {
    const roundedWidth = Math.round(newWidth);
    const roundedHeight = Math.round(newHeight);
    if (untrack(measuredWidth) === roundedWidth && untrack(measuredHeight) === roundedHeight) {
      return;
    }
    setMeasuredWidth(roundedWidth);
    setMeasuredHeight(roundedHeight);
    flush();
  };

  const measureOnce = (el: HTMLDivElement): void => {
    const { width: containerWidth, height: containerHeight } = el.getBoundingClientRect();
    setContainerSize(containerWidth, containerHeight);
  };

  const beginResponsiveMeasurement = (el: HTMLDivElement): void => {
    measureOnce(el);
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry == null) {
        return;
      }
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setContainerSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(el);
  };

  const setWrapperRef = (el: HTMLDivElement) => {
    wrapperEl = el;
    setTooltipPortal(el);
    const scale = el.offsetWidth === 0 ? 1 : el.getBoundingClientRect().width / el.offsetWidth;
    if (isWellBehavedNumber(scale)) {
      store?.actions.layout.setScale(scale);
    }
    const forwarded = props.ref;
    if (typeof forwarded === "function") {
      forwarded(el);
    }
    if (props.responsive) {
      beginResponsiveMeasurement(el);
      return;
    }
    if (typeof divWidth() === "string" || typeof divHeight() === "string") {
      measureOnce(el);
    }
  };

  const reportedWidth = createMemo((): number | Percent | undefined => {
    if (props.responsive) {
      return measuredWidth();
    }
    const currentWidth = divWidth();
    const currentHeight = divHeight();
    if (typeof currentWidth === "string" || typeof currentHeight === "string") {
      return measuredWidth();
    }
    if (typeof currentWidth === "number" && typeof currentHeight === "number") {
      return currentWidth;
    }
    return undefined;
  });

  const reportedHeight = createMemo((): number | Percent | undefined => {
    if (props.responsive) {
      return measuredHeight();
    }
    const currentWidth = divWidth();
    const currentHeight = divHeight();
    if (typeof currentWidth === "string" || typeof currentHeight === "string") {
      return measuredHeight();
    }
    if (typeof currentWidth === "number" && typeof currentHeight === "number") {
      return currentHeight;
    }
    return undefined;
  });

  const dispatchExternalMouseHandler = (
    handler: ExternalMouseEvents[keyof Pick<
      ExternalMouseEvents,
      | "onClick"
      | "onContextMenu"
      | "onDoubleClick"
      | "onMouseDown"
      | "onMouseEnter"
      | "onMouseLeave"
      | "onMouseMove"
      | "onMouseUp"
    >],
    event: MouseEvent,
  ): void => {
    if (store != null) {
      const payload: ExternalEventActionPayload<MouseEvent> = { handler, reactEvent: event };
      dispatchExternalEvent(store, payload);
    }
  };

  const dispatchExternalTouchHandler = (
    handler: ExternalMouseEvents[keyof Pick<
      ExternalMouseEvents,
      "onTouchStart" | "onTouchMove" | "onTouchEnd"
    >],
    event: TouchEvent,
  ): void => {
    if (store != null) {
      const payload: ExternalEventActionPayload<TouchEvent> = { handler, reactEvent: event };
      dispatchExternalEvent(store, payload);
    }
  };

  const handleMouseMove = (event: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    if (store == null) {
      return;
    }
    dispatchMouseMove(store, {
      clientX: event.clientX,
      clientY: event.clientY,
      currentTarget: event.currentTarget,
    });
    dispatchExternalMouseHandler(props.onMouseMove, event);
  };

  const handleMouseEnter = (event: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    if (store == null) {
      return;
    }
    dispatchMouseMove(store, {
      clientX: event.clientX,
      clientY: event.clientY,
      currentTarget: event.currentTarget,
    });
    dispatchExternalMouseHandler(props.onMouseEnter, event);
  };

  const handleMouseLeave = (event: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    store?.actions.tooltip.mouseLeaveChart();
    flush();
    if (store != null) {
      dispatchExternalMouseHandler(props.onMouseLeave, event);
    }
  };

  // mouseout bubbles from chart children; jsdom visibility specs dismiss via
  // fireEvent.mouseOut on the trigger element (recharts reference: Tooltip.visibility).
  const handleMouseOut = (event: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    const related = event.relatedTarget;
    if (related == null || !(related instanceof Node) || !event.currentTarget.contains(related)) {
      handleMouseLeave(event);
    }
  };

  const handleNativeMouseOut = (event: MouseEvent): void => {
    const el = wrapperEl;
    if (el == null) {
      return;
    }
    const related = event.relatedTarget;
    if (related == null || !(related instanceof Node) || !el.contains(related)) {
      store?.actions.tooltip.mouseLeaveChart();
      flush();
    }
  };

  const handleNativeMouseLeave = (): void => {
    store?.actions.tooltip.mouseLeaveChart();
    flush();
  };

  const attachWrapperListeners = (el: HTMLDivElement): void => {
    el.addEventListener("mouseout", handleNativeMouseOut);
    el.addEventListener("mouseleave", handleNativeMouseLeave);
  };

  onCleanup(() => {
    resizeObserver?.disconnect();
    const el = wrapperEl;
    if (el != null) {
      el.removeEventListener("mouseout", handleNativeMouseOut);
      el.removeEventListener("mouseleave", handleNativeMouseLeave);
    }
  });

  const dispatchExternalMouseEvent = (
    handler: RechartsWrapperProps["onClick"],
    event: MouseEvent,
  ): void => {
    dispatchExternalMouseHandler(handler, event);
  };

  const handleClick = (event: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    if (store == null) {
      return;
    }
    dispatchMouseClick(store, {
      clientX: event.clientX,
      clientY: event.clientY,
      currentTarget: event.currentTarget,
    });
    // Solid 2.0 defers store propagation to a flush boundary; the external
    // handler (dispatchExternalEvent) reads store.state synchronously, so flush
    // the click-driven active-tooltip write first or the handler sees stale state.
    flush();
    dispatchExternalMouseHandler(props.onClick, event);
  };

  const handleContextMenu = (event: MouseEvent): void => {
    dispatchExternalMouseEvent(props.onContextMenu, event);
  };

  const handleDoubleClick = (event: MouseEvent): void => {
    dispatchExternalMouseEvent(props.onDoubleClick, event);
  };

  const handleMouseDown = (event: MouseEvent): void => {
    dispatchExternalMouseEvent(props.onMouseDown, event);
  };

  const handleMouseUp = (event: MouseEvent): void => {
    dispatchExternalMouseEvent(props.onMouseUp, event);
  };

  // Touch — Solid replacement for touchEventsMiddleware (axis + item paths).
  const handleTouchMove = (event: TouchEvent & { currentTarget: HTMLDivElement }): void => {
    if (store == null || event.touches.length === 0) {
      return;
    }
    const eventType = selectTooltipEventType(store.state, store.state.tooltip.settings.shared);
    const touch = event.touches[0];
    if (touch == null) {
      return;
    }
    if (eventType === "axis") {
      const pointer = getRelativeCoordinate({
        clientX: touch.clientX,
        clientY: touch.clientY,
        currentTarget: event.currentTarget,
      });
      const activeProps = selectActivePropsFromChartPointer(store.state, pointer);
      if (activeProps?.activeIndex != null) {
        store.actions.tooltip.setMouseOverAxisIndex({
          activeIndex: activeProps.activeIndex,
          activeDataKey: undefined,
          activeCoordinate: activeProps.activeCoordinate,
        });
      }
      return;
    }
    if (eventType === "item") {
      if (props.dispatchTouchEvents === false) {
        dispatchExternalTouchHandler(props.onTouchMove, event);
        return;
      }
      if (document.elementFromPoint == null) {
        return;
      }
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target == null || !("getAttribute" in target)) {
        return;
      }
      const itemIndex = target.getAttribute(DATA_ITEM_INDEX_ATTRIBUTE_NAME);
      const graphicalItemId =
        target.getAttribute(DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME) ?? undefined;
      const settings = selectAllGraphicalItemsSettings(store.state).find(
        (item) => item.id === graphicalItemId,
      );
      if (itemIndex == null || settings == null || graphicalItemId == null) {
        return;
      }
      const coordinate = selectTooltipCoordinate(store.state, itemIndex, graphicalItemId);
      store.actions.tooltip.setActiveMouseOverItemIndex({
        activeDataKey: settings.dataKey,
        activeIndex: itemIndex,
        activeCoordinate: coordinate,
        activeGraphicalItemId: graphicalItemId,
      });
    }
    dispatchExternalTouchHandler(props.onTouchMove, event);
  };

  const handleTouchStart = (event: TouchEvent): void => {
    if (store != null) {
      dispatchExternalTouchHandler(props.onTouchStart, event);
    }
  };

  const handleTouchEnd = (event: TouchEvent): void => {
    if (store != null) {
      dispatchExternalTouchHandler(props.onTouchEnd, event);
    }
  };

  // Keyboard tooltip navigation (the Solid replacement for keyboardEventsMiddleware):
  // arrow keys move the active index, Enter toggles, focus/blur seed/clear it.
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (store != null) {
      dispatchKeyDown(store, event.key);
    }
  };
  const onFocus = (): void => {
    if (store != null) {
      handleFocusEvent(store);
    }
  };
  const onBlur = (): void => {
    if (store != null) {
      handleBlurEvent(store);
    }
  };

  return (
    <TooltipPortalContext value={tooltipPortal}>
      <LegendPortalContext value={tooltipPortal}>
        <ReportChartSize width={reportedWidth()} height={reportedHeight()} />
        <div
          class={["recharts-wrapper", props.class]}
          style={wrapperStyle()}
          ref={(el) => {
            setWrapperRef(el);
            attachWrapperListeners(el);
          }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onDblClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseOut={handleMouseOut}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          tabindex={0}
        >
          {props.children}
        </div>
      </LegendPortalContext>
    </TooltipPortalContext>
  );
};
