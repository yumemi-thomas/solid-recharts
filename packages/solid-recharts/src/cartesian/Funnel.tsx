// Ported from recharts 3.8.1 src/cartesian/Funnel.tsx (commit 7a23854).
//
// MINIMAL PORT — a stack of trapezoids whose widths track the dataKey value
// (largest on top), reused by FunnelChart. `computeFunnelTrapezoids` is the pure
// geometry function, ported faithfully (incl. `reversed` and the `lastShapeType`
// triangle/rectangle tail). Funnel has no axes: its settings are resolved from
// props and fed straight to the selector (no graphical-items slice registration).
//
// Solid deviations: `resolveDefaultProps`→`merge`; `findAllByType(children, Cell)`
// → `collectCells` (the CellReader port); the `@ts-expect-error` ranged-value casts
// → typed narrowing. Cells + per-row fill/stroke ARE wired (cell → data → prop).
// Tooltip (item-type) registration + per-trapezoid hover dispatch are wired.
// DEFERRED (documented): animation (renders the settled trapezoids), custom
// activeShape (renders the default <Trapezoid>), labels (LabelList),
// legend (recharts registers none for Funnel either), ZIndexLayer, and the
// per-trapezoid `name` SVG attribute (blocked on the svgPropertiesAndEvents
// camelCase/kebab allowlist TODO — `name` isn't forwarded yet).
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import { Layer } from "../container/Layer";
import { Trapezoid } from "../shape/Trapezoid";
import { collectCells } from "../component/Cell";
import {
  CartesianLabelListContextProvider,
  LabelListFromLabelProp,
  type CartesianLabelListEntry,
  type ImplicitLabelListType,
} from "../component/LabelList";
import { selectActiveIndex } from "../state/selectors/tooltipSelectors";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { TooltipPayload, TooltipPayloadConfiguration } from "../state/tooltipSlice";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import {
  ChartOffsetInternal,
  Coordinate,
  CartesianViewBoxRequired,
  DataKey,
  LegendType,
  TooltipType,
  TrapezoidViewBox,
} from "../util/types";
import { getPercentValue } from "../util/DataUtils";
import { getValueByDataKey } from "../util/ChartUtils";
import { ChartData } from "../state/chartDataSlice";
import {
  type ResolvedFunnelSettings,
  selectFunnelTrapezoids,
} from "../state/selectors/funnelSelectors";

export type FunnelTrapezoidItem = TrapezoidViewBox & {
  value?: number | string;
  payload?: unknown;
  tooltipPosition: Coordinate;
  name: string;
  labelViewBox: TrapezoidViewBox;
  parentViewBox: CartesianViewBoxRequired;
  val: number | ReadonlyArray<number>;
  tooltipPayload: TooltipPayload;
  /** Resolved fill (cell → data row → funnel prop). */
  fill?: string;
  stroke?: string;
  /** The data row's `name` rides through as an SVG attribute on the path. */
  [key: string]: unknown;
};

const getRealWidthHeight = (
  customWidth: number | string | undefined,
  offset: ChartOffsetInternal,
): { realWidth: number; realHeight: number; offsetX: number; offsetY: number } => {
  const { width, height, left, top } = offset;
  return {
    realWidth: getPercentValue(customWidth, width, width),
    realHeight: height,
    offsetX: left,
    offsetY: top,
  };
};

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

export function computeFunnelTrapezoids({
  dataKey,
  nameKey,
  displayedData,
  tooltipType,
  lastShapeType,
  reversed,
  offset,
  customWidth,
  graphicalItemId,
}: {
  dataKey: DataKey<unknown> | undefined;
  nameKey: DataKey<unknown> | undefined;
  offset: ChartOffsetInternal;
  displayedData: ReadonlyArray<Record<string, unknown>>;
  tooltipType?: TooltipType;
  lastShapeType?: "triangle" | "rectangle";
  reversed?: boolean;
  customWidth: number | string | undefined;
  graphicalItemId: string;
}): ReadonlyArray<FunnelTrapezoidItem> {
  const { realHeight, realWidth, offsetX, offsetY } = getRealWidthHeight(customWidth, offset);
  const values = displayedData.map((entry) => asNumber(getValueByDataKey(entry, dataKey, 0)));
  const maxValue = Math.max(...values);
  const len = displayedData.length;
  const rowHeight = realHeight / len;
  const parentViewBox: CartesianViewBoxRequired = {
    x: offset.left,
    y: offset.top,
    width: offset.width,
    height: offset.height,
  };

  let trapezoids: ReadonlyArray<FunnelTrapezoidItem> = displayedData.map(
    (entry, i): FunnelTrapezoidItem => {
      const rawVal: unknown = getValueByDataKey(entry, dataKey, 0);
      const name = String(getValueByDataKey(entry, nameKey, i));
      let val = asNumber(Array.isArray(rawVal) ? rawVal[0] : rawVal);
      let nextVal: number;

      if (i !== len - 1) {
        const nextDataValue: unknown = getValueByDataKey(displayedData[i + 1], dataKey, 0);
        if (typeof nextDataValue === "number") {
          nextVal = nextDataValue;
        } else if (Array.isArray(nextDataValue)) {
          val = asNumber(nextDataValue[0]);
          nextVal = asNumber(nextDataValue[1]);
        } else {
          nextVal = 0;
        }
      } else if (Array.isArray(rawVal) && rawVal.length === 2) {
        val = asNumber(rawVal[0]);
        nextVal = asNumber(rawVal[1]);
      } else if (lastShapeType === "rectangle") {
        nextVal = val;
      } else {
        nextVal = 0;
      }

      const x =
        maxValue === 0 ? offsetX : ((maxValue - val) * realWidth) / (2 * maxValue) + offsetX;
      const y = rowHeight * i + offsetY;
      const upperWidth = maxValue === 0 ? 0 : (val / maxValue) * realWidth;
      const lowerWidth = maxValue === 0 ? 0 : (nextVal / maxValue) * realWidth;

      const tooltipPayload: TooltipPayload = [
        { name, value: val, payload: entry, dataKey, type: tooltipType, graphicalItemId },
      ];
      const tooltipPosition: Coordinate = { x: x + upperWidth / 2, y: y + rowHeight / 2 };
      const trapezoidViewBox: TrapezoidViewBox = {
        x,
        y,
        upperWidth,
        lowerWidth,
        width: Math.max(upperWidth, lowerWidth),
        height: rowHeight,
      };

      return {
        // Data/cell fields first (fill/stroke/name); computed geometry wins after,
        // matching recharts' `omit(entry, ['width'])` (keeps the trapezoid width).
        ...entry,
        ...trapezoidViewBox,
        name,
        val,
        value: val,
        tooltipPayload,
        tooltipPosition,
        payload: entry,
        parentViewBox,
        labelViewBox: trapezoidViewBox,
      };
    },
  );

  if (reversed) {
    trapezoids = trapezoids.map((entry, index): FunnelTrapezoidItem => {
      const reversedViewBox: TrapezoidViewBox = {
        x: entry.x - (entry.lowerWidth - entry.upperWidth) / 2,
        y: entry.y - index * rowHeight + (len - 1 - index) * rowHeight,
        upperWidth: entry.lowerWidth,
        lowerWidth: entry.upperWidth,
        width: Math.max(entry.lowerWidth, entry.upperWidth),
        height: rowHeight,
      };
      return {
        ...entry,
        ...reversedViewBox,
        tooltipPosition: {
          ...entry.tooltipPosition,
          y: entry.y - index * rowHeight + (len - 1 - index) * rowHeight + rowHeight / 2,
        },
        labelViewBox: reversedViewBox,
      };
    });
  }

  return trapezoids;
}

export interface FunnelProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  dataKey?: DataKey<DataPointType, DataValueType>;
  nameKey?: DataKey<DataPointType>;
  data?: ChartData;
  width?: string | number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  name?: string | number;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  lastShapeType?: "triangle" | "rectangle";
  reversed?: boolean;
  hide?: boolean;
  isAnimationActive?: boolean | "auto";
  /** Custom trapezoid renderer (function form); replaces the default <Trapezoid>. */
  shape?: (item: FunnelTrapezoidItem) => JSX.Element;
  /** Custom renderer (function form) for the active (hovered) trapezoid. */
  activeShape?: (item: FunnelTrapezoidItem) => JSX.Element;
  /** Labels rendered from a `label` prop (in addition to <LabelList> children). */
  label?: ImplicitLabelListType;
  id?: string;
  class?: string;
  /** <Cell> children supplying per-trapezoid fill/stroke/class overrides. */
  children?: JSX.Element;
}

export const funnelDefaultProps = {
  fill: "#808080",
  stroke: "#fff",
  hide: false,
  isAnimationActive: "auto",
  lastShapeType: "triangle",
  legendType: "rect",
  nameKey: "name",
  reversed: false,
} as const satisfies Partial<FunnelProps>;

export function Funnel<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: FunnelProps<DataPointType, DataValueType>,
): JSX.Element {
  const merged = merge(funnelDefaultProps, props);
  const id = useUniqueId("recharts-funnel", props.id);

  const cells = collectCells(() => props.children);

  // Funnel-level presentation that each trapezoid inherits (data/cell props win).
  const presentationProps = createMemo<Record<string, unknown>>(() => ({
    fill: merged.fill,
    stroke: merged.stroke,
    "stroke-width": merged.strokeWidth,
  }));

  const funnelSettings = createMemo<ResolvedFunnelSettings>(() => ({
    dataKey: merged.dataKey,
    nameKey: merged.nameKey,
    data: merged.data,
    tooltipType: merged.tooltipType,
    lastShapeType: merged.lastShapeType,
    reversed: merged.reversed,
    customWidth: merged.width,
    cells: cells(),
    presentationProps: presentationProps(),
    id,
  }));

  const trapezoids = useAppSelector((state) => selectFunnelTrapezoids(state, funnelSettings()));

  // Item-type tooltip: the trapezoids carry their own payload; hovering one
  // activates the tooltip for that row.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data,
    getPosition: (index) => trapezoids()?.[Number(index)]?.tooltipPosition,
    settings: {
      stroke: merged.stroke,
      strokeWidth: merged.strokeWidth,
      fill: merged.fill,
      dataKey: merged.dataKey,
      name: merged.name,
      nameKey: merged.nameKey,
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
      graphicalItemId: id,
    },
  }));

  const onItemEnter = useMouseEnterItemDispatch(undefined, merged.dataKey, id);
  const onItemLeave = useMouseLeaveItemDispatch(undefined);
  const onItemClick = useMouseClickItemDispatch(undefined, merged.dataKey, id);

  // Active (hovered) trapezoid index for `activeShape` (item-type tooltip).
  const activeItemIndex = useAppSelector((state) =>
    selectActiveIndex(state, "item", state.tooltip.settings.trigger, undefined),
  );

  // One LabelList entry per trapezoid (its labelViewBox + name/payload), provided
  // to <LabelList> children and the `label` prop via context.
  const labelListEntries = createMemo<ReadonlyArray<CartesianLabelListEntry>>(() =>
    (trapezoids() ?? []).map((entry) => {
      const viewBox: TrapezoidViewBox = entry.labelViewBox;
      return {
        ...viewBox,
        value: entry.name,
        payload: entry.payload,
        parentViewBox: entry.parentViewBox,
        viewBox,
        fill: entry.fill,
      };
    }),
  );

  // Captured once (a render prop rarely changes); reading it in the <For> callback
  // would be an untracked prop read.
  const shape = merged.shape;
  const activeShape = merged.activeShape;

  const layerClass = (): string =>
    ["recharts-trapezoids", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <CartesianLabelListContextProvider value={labelListEntries}>
        <Show when={!merged.hide && trapezoids()}>
          {(items) => (
            <Show when={items().length > 0}>
              <Layer class={layerClass()}>
                <For each={items()}>
                  {(entry, i) => {
                    // recharts: render `activeShape` for the hovered trapezoid, else
                    // the user `shape`, else the default <Trapezoid>.
                    const isActive = (): boolean =>
                      Boolean(activeShape) && activeItemIndex() === String(i());
                    return (
                      <Layer
                        class="recharts-funnel-trapezoid"
                        onMouseEnter={onItemEnter(
                          {
                            tooltipPosition: entry.tooltipPosition,
                            tooltipPayload: entry.tooltipPayload,
                          },
                          i(),
                        )}
                        onMouseLeave={onItemLeave(
                          {
                            tooltipPosition: entry.tooltipPosition,
                            tooltipPayload: entry.tooltipPayload,
                          },
                          i(),
                        )}
                        onClick={onItemClick(
                          {
                            tooltipPosition: entry.tooltipPosition,
                            tooltipPayload: entry.tooltipPayload,
                          },
                          i(),
                        )}
                      >
                        {isActive() && activeShape ? (
                          activeShape(entry)
                        ) : shape ? (
                          shape(entry)
                        ) : (
                          <Trapezoid
                            x={entry.x}
                            y={entry.y}
                            upperWidth={entry.upperWidth}
                            lowerWidth={entry.lowerWidth}
                            height={entry.height}
                            fill={typeof entry.fill === "string" ? entry.fill : merged.fill}
                            stroke={typeof entry.stroke === "string" ? entry.stroke : merged.stroke}
                          />
                        )}
                      </Layer>
                    );
                  }}
                </For>
              </Layer>
            </Show>
          )}
        </Show>
        <LabelListFromLabelProp label={merged.label} />
        {props.children}
      </CartesianLabelListContextProvider>
    </>
  );
}
