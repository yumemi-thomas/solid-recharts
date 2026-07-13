// Partial seed of recharts 3.8.1 src/util/ChartUtils.ts (commit 7a23854).
//
// ChartUtils is a large barrel; most of it couples to legend/tooltip/stack state
// slices (deferred to T3) or victory-vendor d3-shape. We seed ONLY the leaf pieces
// that pure consumers need today, growing incrementally (same approach as types.ts).
// Kept byte-identical so importers match the reference path (`./ChartUtils`).
import { sortBy } from "./collectionUtils";
import { get } from "./objectPath";
import {
  type Series,
  type SeriesPoint,
  stack as shapeStack,
  stackOffsetExpand,
  stackOffsetNone,
  stackOffsetSilhouette,
  stackOffsetWiggle,
  stackOrderNone,
} from "d3-shape";
import { isNan, isNotNil, isNullish, isNumber, isNumOrStr, mathSign } from "./DataUtils";
import { getSliced } from "./getSliced";
import { isWellBehavedNumber } from "./isWellBehavedNumber";
import type {
  AxisTick,
  AxisDomainTypeInput,
  AxisType,
  CategoricalDomainItem,
  CartesianLayout,
  DataKey,
  LayoutType,
  NumberDomain,
  PolarLayout,
  RangeObj,
  RelativePointer,
  StackOffsetType,
  TickItem,
} from "./types";
import type { RechartsScale } from "./scale/RechartsScale";
import type { BaseAxisWithScale } from "../state/selectors/axisSelectors";
import type { TooltipEntrySettings, TooltipPayloadEntry } from "../state/tooltipSlice";
import type { ValueType } from "../component/DefaultTooltipContent";
import type { LegendSettings } from "../state/legendSlice";
import type { Size } from "./types";
import type { AllStackGroups } from "./stacks/stackTypes";

// Domain-string patterns: `dataMin - <n>` / `dataMax + <n>` (used by
// util/isDomainSpecifiedByUser to detect a user-extended numerical domain).
export const MIN_VALUE_REG = /^dataMin[\s]*-[\s]*([0-9]+([.]{1}[0-9]+){0,1})$/;
export const MAX_VALUE_REG = /^dataMax[\s]*\+[\s]*([0-9]+([.]{1}[0-9]+){0,1})$/;

// Stack identifiers. A user-provided `stackId` (string or number) is normalized
// to a string internally so stacks group reliably.
export type StackId = string | number;
export type NormalizedStackId = string;

export function getNormalizedStackId(
  publicStackId: StackId | undefined,
): NormalizedStackId | undefined {
  return publicStackId == null ? undefined : String(publicStackId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

export type BarPositionPosition = {
  /** Offset, always measured from the zero position (not between bars). */
  offset: number;
  /** Size of the bar (0 if the input data is undefined; NaN if it is NaN). */
  size: number;
};

export function getValueByDataKey<DataPointType, DataValueType>(
  obj: DataPointType | null | undefined,
  dataKey: DataKey<DataPointType, DataValueType> | undefined,
  defaultValue: DataValueType,
): DataValueType;
export function getValueByDataKey<DataPointType, DataValueType>(
  obj: DataPointType | null | undefined,
  dataKey: DataKey<DataPointType, DataValueType> | undefined,
  defaultValue?: DataValueType,
): DataValueType | undefined;
export function getValueByDataKey<DataPointType, DataValueType>(
  obj: DataPointType | null | undefined,
  dataKey: DataKey<DataPointType, DataValueType> | undefined,
  defaultValue?: DataValueType,
): DataValueType | undefined {
  if (isNullish(obj) || isNullish(dataKey)) {
    return defaultValue;
  }

  if (isNumOrStr(dataKey)) {
    // `get` resolves deep string paths (e.g. 'a.b', 'arr[1].y'); a runtime path
    // can't prove its value's type, so its generic overload is the declared
    // boundary that pins the public return type.
    return get<DataValueType>(obj, dataKey, defaultValue);
  }

  if (typeof dataKey === "function") {
    return dataKey(obj);
  }

  return defaultValue;
}

export const isCategoricalAxis = (layout: LayoutType, axisType: AxisType): boolean =>
  (layout === "horizontal" && axisType === "xAxis") ||
  (layout === "vertical" && axisType === "yAxis") ||
  (layout === "centric" && axisType === "angleAxis") ||
  (layout === "radial" && axisType === "radiusAxis");

export type AxisPropsNeededForTicksGenerator = {
  axisType?: AxisType;
  categoricalDomain?: ReadonlyArray<unknown>;
  duplicateDomain?: ReadonlyArray<unknown>;
  isCategorical?: boolean;
  niceTicks?: ReadonlyArray<AxisTick>;
  range?: ReadonlyArray<number>;
  realScaleType?: string;
  scale: RechartsScale | undefined;
  tickCount?: number;
  ticks?: ReadonlyArray<AxisTick>;
  type?: "number" | "category";
};

export const getTicksOfAxis = (
  axis: undefined | AxisPropsNeededForTicksGenerator,
  isGrid?: boolean,
  isAll?: boolean,
): ReadonlyArray<TickItem> | null => {
  if (!axis) {
    return null;
  }
  const {
    duplicateDomain,
    type,
    range,
    scale,
    realScaleType,
    isCategorical,
    categoricalDomain,
    tickCount,
    ticks,
    niceTicks,
    axisType,
  } = axis;

  if (!scale) {
    return null;
  }

  const offsetForBand =
    realScaleType === "scaleBand" && scale.bandwidth ? scale.bandwidth() / 2 : 2;
  let offset =
    (isGrid || isAll) && type === "category" && scale.bandwidth
      ? scale.bandwidth() / offsetForBand
      : 0;

  if (axisType === "angleAxis" && range && range.length >= 2) {
    const first = range[0];
    const second = range[1];
    if (first != null && second != null) {
      offset = mathSign(first - second) * 2 * offset;
    }
  }

  if (isGrid && (ticks || niceTicks)) {
    return (ticks || niceTicks || [])
      .map((entry: AxisTick, index: number): TickItem | null => {
        const scaleContent = duplicateDomain ? duplicateDomain.indexOf(entry) : entry;
        const scaled = scale.map(scaleContent);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return {
          coordinate: scaled + offset,
          value: entry,
          offset,
          index,
        };
      })
      .filter(isNotNil);
  }

  if (isCategorical && categoricalDomain) {
    return categoricalDomain
      .map((entry: unknown, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return {
          coordinate: scaled + offset,
          value: entry,
          index,
          offset,
        };
      })
      .filter(isNotNil);
  }

  if (scale.ticks && !isAll && tickCount != null) {
    return scale
      .ticks(tickCount)
      .map((entry: number, index: number): TickItem | null => {
        const scaled = scale.map(entry);
        if (!isWellBehavedNumber(scaled)) {
          return null;
        }
        return { coordinate: scaled + offset, value: entry, index, offset };
      })
      .filter(isNotNil);
  }

  return scale
    .domain()
    .map((entry: CategoricalDomainItem, index: number): TickItem | null => {
      const scaled = scale.map(entry);
      if (!isWellBehavedNumber(scaled)) {
        return null;
      }
      const value =
        duplicateDomain != null && typeof entry === "number" ? duplicateDomain[entry] : entry;
      return {
        coordinate: scaled + offset,
        value,
        index,
        offset,
      };
    })
    .filter(isNotNil);
};

/**
 * Both value and domain are tuples of two numbers — but the type stays as array
 * of numbers until we have better support in the rest of the app.
 * @param value input that will be truncated
 * @param domain boundaries
 * @returns tuple of two numbers
 */
export const truncateByDomain = <T>(
  value: SeriesPoint<T>,
  domain: ReadonlyArray<number>,
): [number, number] | SeriesPoint<T> => {
  if (!domain || domain.length !== 2 || !isNumber(domain[0]) || !isNumber(domain[1])) {
    return value;
  }

  const minValue = Math.min(domain[0], domain[1]);
  const maxValue = Math.max(domain[0], domain[1]);

  const result: [number, number] = [value[0], value[1]];
  if (!isNumber(value[0]) || value[0] < minValue) {
    result[0] = minValue;
  }

  if (!isNumber(value[1]) || value[1] > maxValue) {
    result[1] = maxValue;
  }

  if (result[0] > maxValue) {
    result[0] = maxValue;
  }

  if (result[1] < minValue) {
    result[1] = minValue;
  }

  return result;
};

// Value→tick lookup cache, keyed on the ticks array reference. getCateCoordinateOfLine
// is called once per data point; a linear findEntryInArray scan there is O(points²)
// across a full series when allowDuplicatedCategory=false (ticks.length ≈ points).
// The axis-ticks selector memoizes the ticks array, so this map is built once per
// render and reused for every point lookup, making it O(points). First value wins,
// mirroring Array.find.
const tickByValueCache = new WeakMap<ReadonlyArray<TickItem>, Map<unknown, TickItem>>();
function findTickByValue(ticks: ReadonlyArray<TickItem>, value: unknown): TickItem | undefined {
  // Map uses SameValueZero and would match NaN, while the upstream Array.find
  // lookup uses strict equality (NaN !== NaN). Preserve that fallback behavior.
  if (typeof value === "number" && Number.isNaN(value)) {
    return undefined;
  }
  let map = tickByValueCache.get(ticks);
  if (map == null) {
    map = new Map<unknown, TickItem>();
    for (const tick of ticks) {
      if (tick != null && !map.has(tick.value)) {
        map.set(tick.value, tick);
      }
    }
    tickByValueCache.set(ticks, map);
  }
  return map.get(value);
}

export function getCateCoordinateOfLine<T>({
  axis,
  ticks,
  bandSize,
  entry,
  index,
  dataKey,
}: {
  axis: {
    dataKey?: DataKey<T>;
    allowDuplicatedCategory?: boolean;
    type?: AxisDomainTypeInput;
    scale: RechartsScale;
  };
  ticks: ReadonlyArray<TickItem> | undefined;
  bandSize: number;
  entry: T;
  index: number;
  dataKey?: DataKey<T>;
}): number | null {
  if (axis.type === "category") {
    // find coordinate of category axis by the value of category.
    // Deviation: the reference reads `entry[axis.dataKey]` directly (with two
    // `@ts-expect-error` comments noting it should arguably use getValueByDataKey).
    // We keep the same direct-access behavior, narrowing the key to a string/number
    // and the entry to a record (no `any`). `entry` is unconstrained so this also
    // accepts the row-erased `unknown` data points that computeLinePoints passes.
    const axisDataKey = axis.dataKey;
    if (
      !axis.allowDuplicatedCategory &&
      (typeof axisDataKey === "string" || typeof axisDataKey === "number") &&
      isRecord(entry)
    ) {
      const key: string | number = axisDataKey;
      const cellValue = entry[key];
      if (!isNullish(cellValue)) {
        const matchedTick = ticks ? findTickByValue(ticks, cellValue) : undefined;

        if (matchedTick) {
          return matchedTick.coordinate + bandSize / 2;
        }
      }
    }

    return ticks?.[index] ? ticks[index].coordinate + bandSize / 2 : null;
  }

  const value = getValueByDataKey(entry, !isNullish(dataKey) ? dataKey : axis.dataKey);

  const scaled = axis.scale.map(value);
  if (!isNumber(scaled)) {
    return null;
  }
  return scaled;
}

export const getCateCoordinateOfBar = ({
  axis,
  ticks,
  offset,
  bandSize,
  entry,
  index,
}: {
  axis: BaseAxisWithScale;
  ticks: ReadonlyArray<TickItem>;
  offset: number;
  bandSize: number;
  entry: unknown;
  index: number;
}): number | null => {
  if (axis.type === "category") {
    const tick = ticks[index];
    return tick ? tick.coordinate + offset : null;
  }
  // getValueByDataKey does not validate the output type.
  const value = getValueByDataKey(entry, axis.dataKey, axis.scale.domain()[index]);

  if (isNullish(value)) {
    return null;
  }

  const scaled = axis.scale.map(value);
  if (!isNumber(scaled)) {
    return null;
  }
  return scaled - bandSize / 2 + offset;
};

// Deviation: reference returns `number | unknown` (≡ unknown) and reads
// `domain[0]`/`domain[1]` with `@ts-expect-error`; the domain items are
// CategoricalDomainItem, so they are coerced with `Number()` for the number-axis
// branch (numbers pass through unchanged).
export const getBaseValueOfBar = ({ numericAxis }: { numericAxis: BaseAxisWithScale }): unknown => {
  const domain = numericAxis.scale.domain();

  if (numericAxis.type === "number") {
    const minValue = Math.min(Number(domain[0]), Number(domain[1]));
    const maxValue = Math.max(Number(domain[0]), Number(domain[1]));

    if (minValue <= 0 && maxValue >= 0) {
      return 0;
    }
    if (maxValue < 0) {
      return maxValue;
    }

    return minValue;
  }

  return domain[0];
};

/**
 * Calculate the size between two categories.
 * @param  axis  The options of axis
 * @param  ticks The ticks of axis
 * @param  isBar if items in axis are bars
 * @return Size
 */
export const getBandSizeOfAxis = (
  axis?: BaseAxisWithScale,
  ticks?: ReadonlyArray<TickItem>,
  isBar?: boolean,
): number | undefined => {
  if (axis && axis.scale && axis.scale.bandwidth) {
    const bandWidth = axis.scale.bandwidth();

    if (!isBar || bandWidth > 0) {
      return bandWidth;
    }
  }

  if (axis && ticks && ticks.length >= 2) {
    const orderedTicks: ReadonlyArray<TickItem> = sortBy(ticks, [(o: TickItem) => o.coordinate]);
    let bandSize = Infinity;

    for (let i = 1, len = orderedTicks.length; i < len; i++) {
      const cur = orderedTicks[i];
      const prev = orderedTicks[i - 1];

      bandSize = Math.min((cur?.coordinate || 0) - (prev?.coordinate || 0), bandSize);
    }

    return bandSize === Infinity ? 0 : bandSize;
  }

  return isBar ? undefined : 0;
};

/**
 * Assembles one tooltip payload entry from the registered entry settings plus the
 * resolved dataKey/payload/value/name. Deviations: `payload: any` → `unknown`;
 * `value: ValueType` → `ValueType | undefined` (recharts passes `any`-typed
 * values; the port coerces them at the call site and `Payload.value` is optional).
 */
export function getTooltipEntry({
  tooltipEntrySettings,
  dataKey,
  payload,
  value,
  name,
}: {
  tooltipEntrySettings: TooltipEntrySettings;
  dataKey: DataKey<unknown> | undefined;
  payload: unknown;
  value: ValueType | null | undefined;
  // recharts' tooltip entry name is the raw nameKey value (NameType = string | number),
  // not stringified — keep numeric names numeric.
  name: string | number | undefined;
}): TooltipPayloadEntry {
  return {
    ...tooltipEntrySettings,
    dataKey,
    payload,
    value: value ?? undefined,
    name,
  };
}

/**
 * The tooltip entry name: an explicit `name` prop wins; otherwise a string dataKey
 * is used; a function dataKey yields no name. Deviations: `nameFromItem: any` →
 * `unknown`; `DataKey<any>` → `DataKey<unknown>`; the `String(nameFromItem)` cast
 * is guarded by `isNumOrStr` (names are string/number — a non-primitive yields no
 * name rather than recharts' `[object Object]`).
 */
export function getTooltipNameProp(
  nameFromItem: unknown,
  dataKey: DataKey<unknown> | undefined,
): string | undefined {
  if (isNumOrStr(nameFromItem)) {
    return String(nameFromItem);
  }
  if (typeof dataKey === "string") {
    return dataKey;
  }
  return undefined;
}

type OffsetSides = { top: number; right: number; bottom: number; left: number };

/**
 * Grows the plot-area offset to make room for the legend, based on its align /
 * verticalAlign / layout and measured size. A `center`/`middle` legend overlays
 * the plot (no offset). Ported from recharts.
 */
export const appendOffsetOfLegend = (
  offset: OffsetSides,
  legendSettings: LegendSettings,
  legendSize: Size,
): OffsetSides => {
  const { width: boxWidth, height: boxHeight } = legendSize;
  const { align, verticalAlign, layout } = legendSettings;

  if (
    (layout === "vertical" || (layout === "horizontal" && verticalAlign === "middle")) &&
    align !== "center" &&
    isNumber(offset[align])
  ) {
    return { ...offset, [align]: offset[align] + (boxWidth || 0) };
  }

  if (
    (layout === "horizontal" || (layout === "vertical" && align === "center")) &&
    verticalAlign !== "middle" &&
    isNumber(offset[verticalAlign])
  ) {
    return { ...offset, [verticalAlign]: offset[verticalAlign] + (boxHeight || 0) };
  }

  return offset;
};

/** The 1-D pointer position along the tooltip (categorical) axis. */
export const calculateCartesianTooltipPos = (
  coordinate: RelativePointer,
  layout: CartesianLayout,
): number | undefined => {
  if (layout === "horizontal") {
    return coordinate.relativeX;
  }
  if (layout === "vertical") {
    return coordinate.relativeY;
  }
  return undefined;
};

export const calculatePolarTooltipPos = (
  rangeObj: RangeObj,
  layout: PolarLayout,
): number | undefined => {
  if (layout === "centric") {
    return rangeObj.angle;
  }
  return rangeObj.radius;
};

// ---- Stacks (ported from recharts ChartUtils stack section) -----------------
//
// d3-shape's offset accessor receives the full `Series<Datum, Key>[]` (a 3-D
// array): series[i] is a Series, series[i][j] a mutable [number, number] point.
// victory-vendor's current types model this correctly, so no casts/@ts-expect-error
// are needed (recharts' @ts-expect-error was for older DefinitelyTyped types).
type StackDatum = Record<string, unknown>;
type StackKey = DataKey<unknown>;
type OffsetAccessor = (series: Series<StackDatum, StackKey>[], order: number[]) => void;

/**
 * Stacks all positive numbers above zero and all negative numbers below zero.
 * If all values are positive this behaves the same as the 'none' stacker.
 */
export const offsetSign: OffsetAccessor = (series) => {
  const n = series.length;
  const m = series[0]?.length ?? 0;
  if (n <= 0 || m <= 0) {
    return;
  }
  for (let j = 0; j < m; ++j) {
    let positive = 0;
    let negative = 0;
    for (let i = 0; i < n; ++i) {
      const col = series[i]?.[j];
      if (col == null) {
        continue;
      }
      const value = isNan(col[1]) ? col[0] : col[1];
      if (value >= 0) {
        col[0] = positive;
        positive += value;
        col[1] = positive;
      } else {
        col[0] = negative;
        negative += value;
        col[1] = negative;
      }
    }
  }
};

/**
 * Replaces all negative values with zero when stacking.
 * If all values are positive this behaves the same as the 'none' stacker.
 */
export const offsetPositive: OffsetAccessor = (series) => {
  const n = series.length;
  const m = series[0]?.length ?? 0;
  if (n <= 0 || m <= 0) {
    return;
  }
  for (let j = 0; j < m; ++j) {
    let positive = 0;
    for (let i = 0; i < n; ++i) {
      const col = series[i]?.[j];
      if (col == null) {
        continue;
      }
      const value = isNan(col[1]) ? col[0] : col[1];
      if (value >= 0) {
        col[0] = positive;
        positive += value;
        col[1] = positive;
      } else {
        col[0] = 0;
        col[1] = 0;
      }
    }
  }
};

const STACK_OFFSET_MAP: Record<StackOffsetType, OffsetAccessor> = {
  sign: offsetSign,
  expand: stackOffsetExpand,
  none: stackOffsetNone,
  silhouette: stackOffsetSilhouette,
  wiggle: stackOffsetWiggle,
  positive: offsetPositive,
};

/**
 * Runs d3-shape's stack over the displayed data for the given dataKeys, applying
 * the recharts offset and post-processing ranged ([min,max]) data points.
 */
export const getStackedData = (
  data: ReadonlyArray<StackDatum>,
  dataKeys: ReadonlyArray<StackKey>,
  offsetType: StackOffsetType,
): ReadonlyArray<Series<StackDatum, StackKey>> => {
  const offsetAccessor: OffsetAccessor = STACK_OFFSET_MAP[offsetType] ?? offsetSign;
  // Track whether any value is a [min, max] tuple during the (unavoidable) value
  // accessor pass, so the ranged-data fixup below can be skipped entirely for the
  // common scalar case instead of running a second full series×points scan.
  let hasRangedValues = false;
  const stack = shapeStack<StackDatum, StackKey>()
    .keys(dataKeys)
    .value((d, key) => {
      const raw = getValueByDataKey(d, key, 0);
      if (Array.isArray(raw) && raw.length === 2) {
        hasRangedValues = true;
      }
      return Number(raw);
    })
    .order(stackOrderNone)
    .offset(offsetAccessor);

  const result = stack(data);

  // Ranged data: when a value is a [min, max] tuple, use it directly (no stacking).
  if (hasRangedValues) {
    result.forEach((s, seriesIndex) => {
      s.forEach((point, pointIndex) => {
        const value = getValueByDataKey(data[pointIndex], dataKeys[seriesIndex], 0);
        if (value != null && Array.isArray(value) && value.length === 2) {
          const lo: unknown = value[0];
          const hi: unknown = value[1];
          if (isNumber(lo) && isNumber(hi)) {
            point[0] = lo;
            point[1] = hi;
          }
        }
      });
    });
  }

  return result;
};

const getDomainOfSingle = (data: ReadonlyArray<ReadonlyArray<unknown>>): number[] => {
  // Reduce loop, not `Math.min(...flat)`: spreading a data-sized array throws a V8
  // RangeError past ~100k elements. Empty input yields [Infinity, -Infinity],
  // matching the previous Math.min/Math.max-of-empty behavior.
  let min = Infinity;
  let max = -Infinity;
  for (const value of data.flat(2)) {
    if (isNumber(value)) {
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }
  }
  return [min, max];
};

const makeDomainFinite = (domain: NumberDomain): NumberDomain => [
  domain[0] === Infinity ? 0 : domain[0],
  domain[1] === -Infinity ? 0 : domain[1],
];

/** The numerical domain spanned by every stacked series across all stack groups. */
export const getDomainOfStackGroups = (
  stackGroups: AllStackGroups | undefined,
  startIndex: number,
  endIndex: number,
): NumberDomain | undefined => {
  if (stackGroups == null || Object.keys(stackGroups).length === 0) {
    return undefined;
  }
  return makeDomainFinite(
    Object.keys(stackGroups).reduce<NumberDomain>(
      (result, stackId): NumberDomain => {
        const group = stackGroups[stackId];
        if (!group) {
          return result;
        }
        const domain = group.stackedData.reduce<NumberDomain>(
          (res, entry): NumberDomain => {
            const sliced = getSliced(entry, startIndex, endIndex);
            const s = getDomainOfSingle(sliced);
            if (!isNumber(s[0]) || !isNumber(s[1])) {
              return res;
            }
            return [Math.min(res[0], s[0]), Math.max(res[1], s[1])];
          },
          [Infinity, -Infinity],
        );
        return [Math.min(domain[0], result[0]), Math.max(domain[1], result[1])];
      },
      [Infinity, -Infinity],
    ),
  );
};
