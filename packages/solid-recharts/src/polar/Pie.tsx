// Ported from recharts 3.8.1 src/polar/Pie.tsx (commit 7a23854).
//
// MINIMAL PORT — renders one <Sector> per data slice with byte-identical
// geometry. `computePieSectors` is the pure sector-geometry function, ported
// faithfully (sum>0 branch, minAngle redistribution, paddingAngle). It is
// consumed by `pieSelectors.selectPieSectors`.
//
// Solid deviations: `resolveDefaultProps`→`merge`; effect-dispatch registration
// (RegisterGraphicalItemId + SetPolarGraphicalItem) → `createEffect`/`onCleanup`
// pushing PieSettings into the graphicalItems slice (matched by id); the
// `@ts-expect-error`-laden unknown-data spreads are replaced with typed coercion
// (no `any`/`as`).
//
// Tooltip-entry + legend-payload registration + per-sector item-hover dispatch
// are WIRED (item-type tooltip).
// DEFERRED (documented): label / labelLine (PieLabels/LabelList), activeShape /
// inactiveShape / element-form shape, ZIndexLayer (plain <Layer>),
// `maxRadius`/`cornerRadius` rounding edge cases. The function-form custom `shape`
// render prop IS wired (replaces the default <Sector>).
// Cells ARE wired: a <Cell> child (or a data-row `fill`/`stroke`) overrides the
// per-slice fill/stroke/class, merged into entryWithCellInfo like recharts.
import { createEffect, createMemo, For, merge, onCleanup, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector, useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import { useAnimationId } from "../util/useAnimationId";
import { JavascriptAnimate } from "../animation/JavascriptAnimate";
import type { EasingInput } from "../animation/easing";
import type { AnimationDuration } from "../util/types";
import { Layer } from "../container/Layer";
import { Sector } from "../shape/Sector";
import { type CellProps, collectCells } from "../component/Cell";
import { selectPieSectors } from "../state/selectors/pieSelectors";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { SetLegendPayload } from "../state/SetLegendPayload";
import { LegendPayload } from "../component/DefaultLegendContent";
import { TooltipPayloadConfiguration } from "../state/tooltipSlice";
import {
  useMouseClickItemDispatch,
  useMouseEnterItemDispatch,
  useMouseLeaveItemDispatch,
} from "../context/tooltipContext";
import { getTooltipNameProp } from "../util/ChartUtils";
import { PieSettings } from "../state/types/PieSettings";
import { ChartData } from "../state/chartDataSlice";
import { GraphicalItemId } from "../state/graphicalItemsSlice";
import { TooltipPayload } from "../state/tooltipSlice";
import { ChartOffsetInternal, Coordinate, DataKey, LegendType, TooltipType } from "../util/types";
import { getMaxRadius, polarToCartesian } from "../util/PolarUtils";
import { getPercentValue, interpolate, isNumber, isNumOrStr, mathSign } from "../util/DataUtils";
import { getValueByDataKey } from "../util/ChartUtils";

export type PieCoordinate = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  maxRadius: number;
};

/**
 * One computed pie slice. Carries the sector geometry plus the data needed for
 * tooltips/labels (the label/tooltip consumers are deferred in the minimal port).
 */
export interface PieSectorDataItem extends PieCoordinate {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  middleRadius: number;
  cornerRadius: number | undefined;
  paddingAngle: number;
  percent: number;
  name: string | number;
  value: number;
  dataKey: DataKey<unknown> | undefined;
  payload: unknown;
  fill: string;
  stroke: string | undefined;
  /** Per-slice class from a matching <Cell> (if any). */
  class: string | undefined;
  tooltipPayload: TooltipPayload;
  tooltipPosition: Coordinate;
}

/** Spread an unknown data entry into a plain record (`{}` for non-objects). */
const toRecord = (entry: unknown): Record<string, unknown> =>
  typeof entry === "object" && entry != null ? { ...entry } : {};

const getOuterRadius = (
  dataPoint: unknown,
  outerRadius: number | string | ((element: unknown) => number | string),
  maxPieRadius: number,
): number => {
  if (typeof outerRadius === "function") {
    return getPercentValue(outerRadius(dataPoint), maxPieRadius, maxPieRadius * 0.8);
  }
  return getPercentValue(outerRadius, maxPieRadius, maxPieRadius * 0.8);
};

const parseCoordinateOfPie = (
  pieSettings: PieSettings,
  offset: ChartOffsetInternal,
  dataPoint: unknown,
): PieCoordinate => {
  const { top, left, width, height } = offset;
  const maxPieRadius = getMaxRadius(width, height);
  const cx = left + getPercentValue(pieSettings.cx, width, width / 2);
  const cy = top + getPercentValue(pieSettings.cy, height, height / 2);
  const innerRadius = getPercentValue(pieSettings.innerRadius, maxPieRadius, 0);
  const outerRadius = getOuterRadius(dataPoint, pieSettings.outerRadius, maxPieRadius);
  const maxRadius = pieSettings.maxRadius || Math.sqrt(width * width + height * height) / 2;

  return { cx, cy, innerRadius, outerRadius, maxRadius };
};

const parseDeltaAngle = (startAngle: number, endAngle: number): number => {
  const sign = mathSign(endAngle - startAngle);
  const deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);

  return sign * deltaAngle;
};

export function computePieSectors({
  pieSettings,
  displayedData,
  cells,
  offset,
}: {
  pieSettings: PieSettings;
  displayedData: ChartData;
  /** Per-slice <Cell> presentation props, indexed by data position. */
  cells?: ReadonlyArray<CellProps> | undefined;
  offset: ChartOffsetInternal;
}): ReadonlyArray<PieSectorDataItem> | undefined {
  const { cornerRadius, startAngle, endAngle, dataKey, nameKey, tooltipType } = pieSettings;
  const minAngle = Math.abs(pieSettings.minAngle);
  const deltaAngle = parseDeltaAngle(startAngle, endAngle);
  const absDeltaAngle = Math.abs(deltaAngle);
  const paddingAngle = displayedData.length <= 1 ? 0 : (pieSettings.paddingAngle ?? 0);

  const notZeroItemCount = displayedData.filter(
    (entry) => getValueByDataKey(entry, dataKey, 0) !== 0,
  ).length;
  const totalPaddingAngle =
    (absDeltaAngle >= 360 ? notZeroItemCount : notZeroItemCount - 1) * paddingAngle;

  const sum = displayedData.reduce<number>((result, entry) => {
    const val: unknown = getValueByDataKey(entry, dataKey, 0);
    return result + (isNumber(val) ? val : 0);
  }, 0);

  // Only apply minAngle redistribution when at least one non-zero segment's
  // natural angle falls below the minAngle threshold.
  const needsMinAngleAdjustment =
    minAngle > 0 &&
    sum > 0 &&
    displayedData.some((entry) => {
      const val: unknown = getValueByDataKey(entry, dataKey, 0);
      const percent = (isNumber(val) ? val : 0) / sum;
      return val !== 0 && percent * absDeltaAngle < minAngle;
    });
  const effectiveMinAngle = needsMinAngleAdjustment ? minAngle : 0;

  const realTotalAngle = absDeltaAngle - notZeroItemCount * effectiveMinAngle - totalPaddingAngle;

  if (sum <= 0) {
    return undefined;
  }

  let prev: PieSectorDataItem | undefined;
  return displayedData.map((entry: unknown, i: number): PieSectorDataItem => {
    const valRaw: unknown = getValueByDataKey(entry, dataKey, 0);
    const val: number = isNumber(valRaw) ? valRaw : 0;
    const nameRaw: unknown = getValueByDataKey(entry, nameKey, i);
    const name: string | number = isNumOrStr(nameRaw) ? nameRaw : i;
    const coordinate = parseCoordinateOfPie(pieSettings, offset, entry);
    const percent = val / sum;

    // <Cell> props win over the raw data row (recharts merges cells[i].props
    // onto the entry); both can supply fill/stroke/class.
    const entryWithCellInfo = { ...toRecord(entry), ...toRecord(cells?.[i]) };
    const sectorColor =
      typeof entryWithCellInfo.fill === "string" ? entryWithCellInfo.fill : pieSettings.fill;
    const sectorStroke =
      typeof entryWithCellInfo.stroke === "string" ? entryWithCellInfo.stroke : pieSettings.stroke;
    const sectorClass =
      typeof entryWithCellInfo.class === "string" ? entryWithCellInfo.class : undefined;

    let tempStartAngle: number;
    if (i) {
      // prev is defined for i > 0.
      tempStartAngle =
        (prev?.endAngle ?? startAngle) +
        mathSign(deltaAngle) * paddingAngle * (valRaw !== 0 ? 1 : 0);
    } else {
      tempStartAngle = startAngle;
    }

    const tempEndAngle =
      tempStartAngle +
      mathSign(deltaAngle) * ((valRaw !== 0 ? effectiveMinAngle : 0) + percent * realTotalAngle);
    const midAngle = (tempStartAngle + tempEndAngle) / 2;
    const middleRadius = (coordinate.innerRadius + coordinate.outerRadius) / 2;

    const tooltipPayload: TooltipPayload = [
      {
        name,
        value: val,
        payload: entryWithCellInfo,
        dataKey,
        type: tooltipType,
        color: sectorColor,
        fill: sectorColor,
        graphicalItemId: pieSettings.id,
      },
    ];
    const tooltipPosition = polarToCartesian(coordinate.cx, coordinate.cy, middleRadius, midAngle);

    const sector: PieSectorDataItem = {
      ...coordinate,
      percent,
      cornerRadius: typeof cornerRadius === "string" ? parseFloat(cornerRadius) : cornerRadius,
      name,
      tooltipPayload,
      midAngle,
      middleRadius,
      tooltipPosition,
      value: val,
      dataKey,
      startAngle: tempStartAngle,
      endAngle: tempEndAngle,
      payload: entryWithCellInfo,
      paddingAngle: valRaw !== 0 ? mathSign(deltaAngle) * paddingAngle : 0,
      fill: sectorColor,
      stroke: sectorStroke,
      class: sectorClass,
    };
    prev = sector;
    return sector;
  });
}

/**
 * recharts renders sectors through `JavascriptAnimate` even when animation is
 * disabled; at the final frame (t = 1, no previous sectors) each sector's sweep
 * is `interpolate(0, endAngle - startAngle, 1)` — which ROUNDS the delta to 4
 * decimals — and the result is accumulated from the first sector's startAngle.
 * That rounding-then-accumulate is what gives recharts its exact float profile
 * (e.g. the closing sector lands at 255.0003, not 255). We replicate just this
 * final frame so geometry is byte-identical without porting the animation engine.
 */
export function toAnimatedSectors(
  sectors: ReadonlyArray<PieSectorDataItem>,
  prevSectors: ReadonlyArray<PieSectorDataItem> | null,
  t: number,
): ReadonlyArray<PieSectorDataItem> {
  const first = sectors[0];
  let curAngle: number = first?.startAngle ?? 0;
  return sectors.map((entry, index): PieSectorDataItem => {
    const prev = prevSectors?.[index];
    const paddingAngle = index > 0 ? entry.paddingAngle : 0;
    const deltaAngle = prev
      ? interpolate(prev.endAngle - prev.startAngle, entry.endAngle - entry.startAngle, t)
      : interpolate(0, entry.endAngle - entry.startAngle, t);
    const startAngle = curAngle + paddingAngle;
    const endAngle = curAngle + deltaAngle + paddingAngle;
    curAngle = endAngle;
    return { ...entry, startAngle, endAngle };
  });
}

/** The settled (t=1, no previous) frame — the byte-identical enter-animation end. */
export function toFinalFrameSectors(
  sectors: ReadonlyArray<PieSectorDataItem>,
): ReadonlyArray<PieSectorDataItem> {
  return toAnimatedSectors(sectors, null, 1);
}

export interface PieProps<DataPointType = Record<string, unknown>, DataValueType = unknown> {
  cx?: number | string;
  cy?: number | string;
  startAngle?: number;
  endAngle?: number;
  paddingAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string | ((element: unknown) => number | string);
  cornerRadius?: number | string;
  data?: ChartData;
  dataKey?: DataKey<DataPointType, DataValueType>;
  nameKey?: DataKey<DataPointType>;
  name?: string | number;
  fill?: string;
  stroke?: string;
  legendType?: LegendType;
  tooltipType?: TooltipType;
  minAngle?: number;
  maxRadius?: number;
  hide?: boolean;
  /**
   * Custom sector shape (function form): called per slice with its computed
   * geometry + payload, its return replaces the default <Sector>. (recharts also
   * accepts an element / activeShape — those forms are deferred, see header.)
   */
  shape?: (item: PieSectorDataItem) => JSX.Element;
  isAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: AnimationDuration;
  animationEasing?: EasingInput;
  id?: string;
  class?: string;
  angleAxisId?: GraphicalItemId | number;
  radiusAxisId?: GraphicalItemId | number;
  /** <Cell> children supplying per-slice fill/stroke/class overrides. */
  children?: JSX.Element;
}

export const pieDefaultProps = {
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: "ease",
  isAnimationActive: "auto",
  cx: "50%",
  cy: "50%",
  dataKey: "value",
  endAngle: 360,
  fill: "#808080",
  hide: false,
  innerRadius: 0,
  legendType: "rect",
  minAngle: 0,
  nameKey: "name",
  outerRadius: "80%",
  paddingAngle: 0,
  startAngle: 0,
  stroke: "#fff",
} as const satisfies Partial<PieProps>;

export function Pie<DataPointType = Record<string, unknown>, DataValueType = unknown>(
  props: PieProps<DataPointType, DataValueType>,
): JSX.Element {
  const store = useAppStore();
  const merged = merge(pieDefaultProps, props);
  const id = useUniqueId("recharts-pie", props.id);
  // Custom sector shape render prop (function form), captured once.
  const shape = merged.shape;

  let prev: PieSettings | null = null;

  createEffect(
    (): PieSettings => ({
      id,
      type: "pie",
      data: merged.data,
      dataKey: merged.dataKey,
      hide: merged.hide,
      angleAxisId: merged.angleAxisId ?? 0,
      radiusAxisId: merged.radiusAxisId ?? 0,
      name: merged.name,
      nameKey: merged.nameKey,
      tooltipType: merged.tooltipType,
      legendType: merged.legendType,
      fill: merged.fill,
      stroke: merged.stroke,
      cx: merged.cx,
      cy: merged.cy,
      startAngle: merged.startAngle,
      endAngle: merged.endAngle,
      paddingAngle: merged.paddingAngle,
      minAngle: merged.minAngle,
      innerRadius: merged.innerRadius,
      outerRadius: merged.outerRadius,
      cornerRadius: merged.cornerRadius,
      maxRadius: merged.maxRadius,
    }),
    (settings) => {
      if (store == null) {
        return;
      }
      if (prev === null) {
        store.actions.graphicalItems.addPolarGraphicalItem(settings);
      } else if (prev !== settings) {
        store.actions.graphicalItems.replacePolarGraphicalItem({ prev, next: settings });
      }
      prev = settings;
    },
  );

  onCleanup(() => {
    if (prev && store != null) {
      store.actions.graphicalItems.removePolarGraphicalItem(prev);
      prev = null;
    }
  });

  // Per-slice <Cell> overrides (collected from children, in data order).
  const cells = collectCells(() => props.children);
  const sectors = useAppSelector((state) => selectPieSectors(state, id, cells()));

  // Layer takes a single class string (user-class forwarding parity with clsx).
  const layerClass = (): string =>
    ["recharts-pie", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Item-type tooltip: one payload per sector, positioned at the sector's middle.
  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: sectors()?.map((s) => s.tooltipPayload),
    getPosition: (index) => sectors()?.[Number(index)]?.tooltipPosition,
    settings: {
      stroke: merged.stroke,
      fill: merged.fill,
      dataKey: merged.dataKey,
      nameKey: merged.nameKey,
      name: getTooltipNameProp(merged.name, merged.dataKey),
      hide: merged.hide,
      type: merged.tooltipType,
      color: merged.fill,
      unit: "",
      graphicalItemId: id,
    },
  }));

  // Legend: one entry per sector (name + sector color).
  const legendPayload = createMemo<ReadonlyArray<LegendPayload>>(
    () =>
      sectors()?.map(
        (s): LegendPayload => ({
          value: getTooltipNameProp(s.name, merged.dataKey),
          color: s.fill,
          type: merged.legendType,
          payload: typeof s.payload === "object" && s.payload != null ? s.payload : undefined,
          dataKey: merged.dataKey,
        }),
      ) ?? [],
  );

  const onItemEnter = useMouseEnterItemDispatch(undefined, merged.dataKey, id);
  const onItemLeave = useMouseLeaveItemDispatch(undefined);
  const onItemClick = useMouseClickItemDispatch(undefined, merged.dataKey, id);

  // Enter animation: the sectors grow from their start angle. A new id (sectors
  // changed) restarts via the keyed <Show>; at isAnimationActive=false the engine
  // jumps to t=1 → toAnimatedSectors(_, null, 1) === the byte-identical final frame.
  const animationId = useAnimationId(() => sectors(), "recharts-pie-");
  let prevSectors: ReadonlyArray<PieSectorDataItem> | null = null;

  return (
    <>
      <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
      <SetLegendPayload id={id} legendPayload={legendPayload()} />
      <Show when={!merged.hide && sectors()}>
        {(secs) => (
          <Show when={animationId()} keyed>
            {(animId) => (
              <JavascriptAnimate
                animationId={animId}
                duration={merged.animationDuration}
                easing={merged.animationEasing}
                isActive={merged.isAnimationActive}
                begin={merged.animationBegin}
              >
                {(t) => {
                  const frame = toAnimatedSectors(untrack(secs), prevSectors, t);
                  prevSectors = frame;
                  return (
                    <Layer class={layerClass()}>
                      <For each={frame}>
                        {(entry, i) => (
                          <Layer
                            class="recharts-pie-sector"
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
                            {shape ? (
                              shape(entry)
                            ) : (
                              <Sector
                                cx={entry.cx}
                                cy={entry.cy}
                                innerRadius={entry.innerRadius}
                                outerRadius={entry.outerRadius}
                                startAngle={entry.startAngle}
                                endAngle={entry.endAngle}
                                cornerRadius={entry.cornerRadius ?? 0}
                                fill={entry.fill}
                                stroke={entry.stroke}
                                class={entry.class}
                                data-recharts-item-index={i()}
                                data-recharts-item-id={id}
                              />
                            )}
                          </Layer>
                        )}
                      </For>
                    </Layer>
                  );
                }}
              </JavascriptAnimate>
            )}
          </Show>
        )}
      </Show>
    </>
  );
}
