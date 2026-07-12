// Ported from recharts 3.8.1 src/component/Tooltip.tsx (commit 7a23854).
//
// FIRST-LIGHT PORT — renders the floating tooltip box from the active payload.
// Deferred (documented): the <Cursor> highlight (task #19), cross-chart sync
// (useTooltipChartSynchronisation), per-entry custom `content` ELEMENT cloning
// (React.cloneElement has no Solid equivalent — a function `content` is supported,
// an element `content` is rendered as-is without prop injection). Solid
// deviations: `resolveDefaultProps`→`merge`; the settings-dispatch useEffect →
// createEffect; React `createPortal` → `<Portal mount>`; selectors are read via
// useAppSelector accessors; `useElementOffset`'s dependency array is a no-op in
// the Solid port (the ResizeObserver tracks the node directly).
import { createEffect, createMemo, merge, Show } from "solid-js";
import { JSX, Portal } from "@solidjs/web";
import {
  DefaultTooltipContent,
  Formatter,
  NameType,
  Payload,
  Props as DefaultTooltipContentProps,
  TooltipItemSorter,
  ValueType,
} from "./DefaultTooltipContent";
import { TooltipBoundingBox } from "./TooltipBoundingBox";
import { Cursor, CursorDefinition } from "./Cursor";
import { getUniqPayload, UniqueOption } from "../util/payload/getUniqPayload";
import { AllowInDimension, AnimationDuration, Coordinate, EasingInput } from "../util/types";
import { useViewBox } from "../context/chartLayoutContext";
import { useAccessibilityLayer } from "../context/accessibilityContext";
import { useElementOffset } from "../util/useElementOffset";
import { useTooltipPortal } from "../context/tooltipPortalContext";
import { TooltipTrigger } from "../chart/types";
import { useAppSelector, useAppStore } from "../state/hooks";
import { TooltipIndex, TooltipPayload, TooltipPayloadEntry } from "../state/tooltipSlice";
import { AxisId } from "../state/cartesianAxisSlice";
import { selectTooltipEventType } from "../state/selectors/selectTooltipEventType";
import {
  selectActiveCoordinate,
  selectActiveLabel,
  selectIsTooltipActive,
  selectTooltipPayload,
} from "../state/selectors/tooltipSelectors";
import { useTooltipChartSynchronisation } from "../synchronisation/useChartSynchronisation";

export type TooltipContentProps = TooltipProps & {
  label?: string | number;
  payload: TooltipPayload;
  coordinate: Coordinate | undefined;
  active: boolean;
  accessibilityLayer: boolean;
  activeIndex: TooltipIndex | undefined;
};

export type ContentType = JSX.Element | ((props: TooltipContentProps) => JSX.Element);

function defaultUniqBy(
  entry: Payload<ValueType, NameType>,
): Payload<ValueType, NameType>["dataKey"] {
  return entry.dataKey;
}

type PropertiesReadFromContext =
  | "active"
  | "payload"
  | "coordinate"
  | "label"
  | "accessibilityLayer";

export type TooltipProps = Omit<DefaultTooltipContentProps, PropertiesReadFromContext> & {
  active?: boolean;
  allowEscapeViewBox?: AllowInDimension;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  axisId?: AxisId;
  content?: ContentType;
  cursor?: CursorDefinition;
  defaultIndex?: number | TooltipIndex;
  filterNull?: boolean;
  formatter?: Formatter;
  includeHidden?: boolean;
  isAnimationActive?: boolean | "auto";
  itemSorter?: TooltipItemSorter;
  offset?: number | Coordinate;
  payloadUniqBy?: UniqueOption<TooltipPayloadEntry>;
  portal?: HTMLElement | null;
  position?: Partial<Coordinate>;
  reverseDirection?: AllowInDimension;
  separator?: string;
  shared?: boolean;
  trigger?: TooltipTrigger;
  useTranslate3d?: boolean;
  wrapperStyle?: JSX.CSSProperties;
};

const emptyPayload: TooltipPayload = [];

export const defaultTooltipProps = {
  allowEscapeViewBox: { x: false, y: false },
  animationDuration: 400,
  animationEasing: "ease",
  axisId: 0,
  contentStyle: {},
  cursor: true,
  filterNull: true,
  includeHidden: false,
  isAnimationActive: "auto",
  itemSorter: "name",
  itemStyle: {},
  labelStyle: {},
  offset: 10,
  reverseDirection: { x: false, y: false },
  separator: " : ",
  trigger: "hover",
  useTranslate3d: false,
  wrapperStyle: {},
} as const satisfies Partial<TooltipProps>;

function renderContent(content: ContentType | undefined, props: TooltipContentProps): JSX.Element {
  if (typeof content === "function") {
    return content(props);
  }
  if (content != null) {
    // Deviation: React clones the element and injects props; Solid has no
    // cloneElement, so a provided element renders as-is (prop injection is N/A
    // by design — use the function form for injected props).
    return content;
  }
  return (
    <DefaultTooltipContent
      separator={props.separator}
      contentStyle={props.contentStyle}
      itemStyle={props.itemStyle}
      labelStyle={props.labelStyle}
      wrapperClass={props.wrapperClass}
      labelClass={props.labelClass}
      formatter={props.formatter}
      labelFormatter={props.labelFormatter}
      label={props.label}
      payload={props.payload}
      itemSorter={props.itemSorter}
      accessibilityLayer={props.accessibilityLayer}
    />
  );
}

/**
 * Displays a floating box with the active data values. For cartesian charts it
 * attaches to the categorical axis; the active point comes from mouse/keyboard
 * interaction or, before any interaction, from `defaultIndex`.
 */
export const Tooltip = (props: TooltipProps): JSX.Element => {
  const merged = merge(defaultTooltipProps, props);
  const store = useAppStore();
  const viewBox = useViewBox();
  const accessibilityLayer = useAccessibilityLayer();
  const tooltipPortalFromContext = useTooltipPortal();
  const [lastBoundingBox, updateBoundingBox] = useElementOffset();

  const defaultIndexAsString = (): TooltipIndex | undefined =>
    typeof merged.defaultIndex === "number" ? String(merged.defaultIndex) : merged.defaultIndex;

  // merge() keeps an explicit `trigger={undefined}` as undefined (unlike React's
  // resolveDefaultProps, which would apply the default). The interaction selectors
  // gate on `trigger === "hover"`, so resolve the default explicitly.
  const resolvedTrigger = (): TooltipTrigger => merged.trigger ?? defaultTooltipProps.trigger;

  // Push the Tooltip's settings into the store so the interaction selectors can
  // read shared/trigger/axisId/active/defaultIndex.
  createEffect(
    () => ({
      shared: merged.shared,
      trigger: resolvedTrigger(),
      axisId: merged.axisId,
      active: merged.active,
      defaultIndex: defaultIndexAsString(),
    }),
    (settings) => {
      store?.actions.tooltip.setTooltipSettingsState(settings);
    },
  );

  const tooltipEventType = useAppSelector((state) => selectTooltipEventType(state, merged.shared));
  const activeState = useAppSelector((state) =>
    selectIsTooltipActive(state, tooltipEventType(), resolvedTrigger(), defaultIndexAsString()),
  );
  const payloadFromState = useAppSelector((state) =>
    selectTooltipPayload(state, tooltipEventType(), resolvedTrigger(), defaultIndexAsString()),
  );
  const labelFromState = useAppSelector((state) =>
    selectActiveLabel(state, tooltipEventType(), resolvedTrigger(), defaultIndexAsString()),
  );
  const coordinate = useAppSelector((state) =>
    selectActiveCoordinate(state, tooltipEventType(), resolvedTrigger(), defaultIndexAsString()),
  );

  const finalIsActive = (): boolean => merged.active ?? activeState()?.isActive ?? false;
  const finalLabel = (): string | number | undefined =>
    tooltipEventType() === "axis" ? labelFromState() : undefined;

  // Emit cross-chart tooltip sync events when this chart's active tooltip
  // changes (no-op unless a syncId is set). Mirrors recharts' Tooltip call.
  useTooltipChartSynchronisation(
    tooltipEventType,
    resolvedTrigger,
    coordinate,
    finalLabel,
    () => activeState()?.activeIndex ?? undefined,
    finalIsActive,
  );

  const finalPayload = createMemo<TooltipPayload>(() => {
    if (!finalIsActive()) {
      return emptyPayload;
    }
    const payload = payloadFromState() ?? emptyPayload;
    const filterNull = props.filterNull ?? defaultTooltipProps.filterNull;
    if (filterNull && payload.length) {
      return getUniqPayload(
        payload.filter(
          (entry) => entry.value != null && (entry.hide !== true || merged.includeHidden),
        ),
        merged.payloadUniqBy,
        defaultUniqBy,
      );
    }
    return payload;
  });

  const portal = (): HTMLElement | null => props.portal ?? tooltipPortalFromContext();

  return (
    <>
      {/* The cursor is an SVG highlight (renders inline, NOT in the HTML portal),
          shown alongside the box while the tooltip is active. */}
      <Show when={finalIsActive() ? tooltipEventType() : undefined}>
        {(eventType) => (
          <Cursor
            cursor={merged.cursor}
            tooltipEventType={eventType()}
            coordinate={coordinate()}
            payload={finalPayload()}
            index={activeState()?.activeIndex ?? undefined}
          />
        )}
      </Show>
      <Show when={viewBox() && tooltipEventType() && portal()}>
        {(mount) => {
          // Built as a plain object (spreading the Solid merge() proxy leaks a
          // MERGE_SOURCE symbol into the bag handed to a function-form `content`).
          const contentProps = (): TooltipContentProps => ({
            accessibilityLayer: accessibilityLayer(),
            active: finalIsActive(),
            activeIndex: activeState()?.activeIndex ?? undefined,
            allowEscapeViewBox: merged.allowEscapeViewBox,
            animationDuration: merged.animationDuration,
            animationEasing: merged.animationEasing,
            axisId: merged.axisId,
            content: merged.content,
            contentStyle: merged.contentStyle,
            coordinate: coordinate(),
            cursor: merged.cursor,
            filterNull: merged.filterNull,
            formatter: merged.formatter,
            includeHidden: merged.includeHidden,
            isAnimationActive: merged.isAnimationActive,
            // merge() leaves explicit `undefined`; React defaultProps would still apply defaults.
            itemSorter: props.itemSorter ?? defaultTooltipProps.itemSorter,
            itemStyle: merged.itemStyle,
            label: finalLabel(),
            labelStyle: merged.labelStyle,
            labelFormatter: merged.labelFormatter,
            offset: merged.offset,
            payload: finalPayload(),
            payloadUniqBy: merged.payloadUniqBy,
            position: merged.position,
            reverseDirection: merged.reverseDirection,
            separator: merged.separator,
            trigger: merged.trigger,
            useTranslate3d: merged.useTranslate3d,
            wrapperStyle: merged.wrapperStyle,
          });
          return (
            <Portal mount={mount()}>
              <TooltipBoundingBox
                allowEscapeViewBox={merged.allowEscapeViewBox}
                animationDuration={merged.animationDuration}
                animationEasing={merged.animationEasing}
                isAnimationActive={merged.isAnimationActive}
                active={finalIsActive()}
                coordinate={coordinate()}
                hasPayload={finalPayload().length > 0}
                offset={merged.offset}
                position={merged.position}
                reverseDirection={merged.reverseDirection}
                useTranslate3d={merged.useTranslate3d}
                viewBox={viewBox() ?? { x: 0, y: 0, width: 0, height: 0 }}
                wrapperStyle={merged.wrapperStyle}
                lastBoundingBox={lastBoundingBox()}
                innerRef={updateBoundingBox}
                hasPortalFromProps={Boolean(props.portal)}
              >
                {renderContent(merged.content, contentProps())}
              </TooltipBoundingBox>
            </Portal>
          );
        }}
      </Show>
    </>
  );
};
