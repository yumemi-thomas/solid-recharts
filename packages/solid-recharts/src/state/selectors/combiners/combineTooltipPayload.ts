// Ported from recharts 3.8.1 src/state/selectors/combiners/combineTooltipPayload.ts.
//
// Deviations (all to remove `any`): values pulled from data via getValueByDataKey
// are `unknown`, so they're coerced to the declared ValueType/name shapes with
// the type guards below (recharts leans on `any`); the function-dataKey branch of
// parseDataKey uses a user-defined type guard instead of a cast. The Scatter
// "array of arrays" payload path is ported faithfully but only exercised once
// Scatter lands (Line/Bar/Area take the single-object `else` branch).
import {
  TooltipEntrySettings,
  TooltipIndex,
  TooltipPayload,
  TooltipPayloadConfiguration,
  TooltipPayloadEntry,
  TooltipPayloadSearcher,
} from "../../tooltipSlice";
import { ChartData, ChartDataState } from "../../chartDataSlice";
import { DataKey, TooltipEventType } from "../../../util/types";
import { findEntryInArray, isNumOrStr } from "../../../util/DataUtils";
import { getTooltipEntry, getValueByDataKey } from "../../../util/ChartUtils";
import { getSliced } from "../../../util/getSliced";
import { ActiveLabel } from "../../../synchronisation/types";
import { ValueType } from "../../../component/DefaultTooltipContent";

type TooltipPayloadItemLike = {
  name: TooltipEntrySettings["name"];
  unit: TooltipEntrySettings["unit"];
  dataKey: DataKey<unknown> | undefined;
  payload: unknown;
  color: string | undefined;
  fill: string | undefined;
};

function isReadonlyArray(value: unknown): value is ReadonlyArray<unknown> {
  return Array.isArray(value);
}

function isDataKeyFunction(value: unknown): value is (obj: unknown) => unknown {
  return typeof value === "function";
}

/** Coerce an `unknown` data value to the declared ValueType (else undefined). */
function coerceValueType(value: unknown): ValueType | undefined {
  if (isNumOrStr(value)) {
    return value;
  }
  if (isReadonlyArray(value) && value.every(isNumOrStr)) {
    return value;
  }
  return undefined;
}

/** Like reference getValueByDataKey consumption: preserve explicit null for filterNull=false. */
function tooltipEntryValue(value: unknown): ValueType | null | undefined {
  if (value === null) {
    return null;
  }
  return coerceValueType(value);
}

function toName(value: unknown): string | number | undefined {
  // recharts keeps the raw nameKey value (number or string), not a stringified copy.
  return isNumOrStr(value) ? value : undefined;
}

function parseName(value: unknown): TooltipEntrySettings["name"] {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
}

function parseUnit(value: unknown): TooltipEntrySettings["unit"] {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function parseDataKey(value: unknown): DataKey<unknown> | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (isDataKeyFunction(value)) {
    return (obj) => value(obj);
  }
  return undefined;
}

function parseColor(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function parseTooltipPayloadItem(item: unknown): TooltipPayloadItemLike | undefined {
  if (item == null || typeof item !== "object") {
    return undefined;
  }

  const name = "name" in item ? parseName(item.name) : undefined;
  const unit = "unit" in item ? parseUnit(item.unit) : undefined;
  const dataKey = "dataKey" in item ? parseDataKey(item.dataKey) : undefined;
  const payload = "payload" in item ? item.payload : undefined;
  const color = "color" in item ? parseColor(item.color) : undefined;
  const fill = "fill" in item ? parseColor(item.fill) : undefined;

  return { name, unit, dataKey, payload, color, fill };
}

function selectFinalData(
  dataDefinedOnItem: unknown,
  dataDefinedOnChart: ChartData | undefined,
): unknown {
  // Prefer the graphical item's own data; otherwise fall back to chart-level data.
  if (dataDefinedOnItem != null) {
    return dataDefinedOnItem;
  }
  return dataDefinedOnChart;
}

export const combineTooltipPayload = (
  tooltipPayloadConfigurations: ReadonlyArray<TooltipPayloadConfiguration>,
  activeIndex: TooltipIndex,
  chartDataState: ChartDataState,
  tooltipAxisDataKey: DataKey<unknown> | undefined,
  activeLabel: ActiveLabel,
  tooltipPayloadSearcher: TooltipPayloadSearcher | undefined,
  tooltipEventType: TooltipEventType | undefined,
): TooltipPayload | undefined => {
  if (activeIndex == null || tooltipPayloadSearcher == null) {
    return undefined;
  }
  const { chartData, computedData, dataStartIndex, dataEndIndex } = chartDataState;

  const init: Array<TooltipPayloadEntry> = [];

  return tooltipPayloadConfigurations.reduce(
    (agg, { dataDefinedOnItem, settings }): Array<TooltipPayloadEntry> => {
      const finalData = selectFinalData(dataDefinedOnItem, chartData);

      const sliced = isReadonlyArray(finalData)
        ? getSliced(finalData, dataStartIndex, dataEndIndex)
        : finalData;

      const finalDataKey: DataKey<unknown> | undefined = settings?.dataKey ?? tooltipAxisDataKey;
      const finalNameKey: DataKey<unknown> | undefined = settings?.nameKey;
      let tooltipPayload: unknown;
      if (
        tooltipAxisDataKey &&
        isReadonlyArray(sliced) &&
        // Scatter provides arrays-of-arrays; findEntryInArray can't handle that.
        !isReadonlyArray(sliced[0]) &&
        // 'axis' searches by dataKey + label (order may not match data); 'item'
        // searches by index.
        tooltipEventType === "axis"
      ) {
        tooltipPayload = findEntryInArray(sliced, tooltipAxisDataKey, activeLabel);
        if (tooltipPayload == null) {
          tooltipPayload = tooltipPayloadSearcher(sliced, activeIndex, computedData, finalNameKey);
        }
      } else {
        tooltipPayload = tooltipPayloadSearcher(sliced, activeIndex, computedData, finalNameKey);
      }

      if (isReadonlyArray(tooltipPayload)) {
        tooltipPayload.forEach((item) => {
          const parsedItem = parseTooltipPayloadItem(item);
          const itemName = parsedItem?.name;
          const itemDataKey = parsedItem?.dataKey;
          const itemPayload = parsedItem?.payload;
          const newSettings: TooltipEntrySettings = {
            ...settings,
            name: itemName,
            unit: parsedItem?.unit,
            // Preserve item-level color/fill from graphical items.
            color: parsedItem?.color ?? settings?.color,
            fill: parsedItem?.fill ?? settings?.fill,
          };
          agg.push(
            getTooltipEntry({
              tooltipEntrySettings: newSettings,
              dataKey: itemDataKey,
              payload: itemPayload,
              value: tooltipEntryValue(getValueByDataKey(itemPayload, itemDataKey)),
              name: itemName,
            }),
          );
        });
      } else {
        agg.push(
          getTooltipEntry({
            tooltipEntrySettings: settings,
            dataKey: finalDataKey,
            payload: tooltipPayload,
            value: tooltipEntryValue(getValueByDataKey(tooltipPayload, finalDataKey)),
            name: toName(getValueByDataKey(tooltipPayload, finalNameKey)) ?? toName(settings?.name),
          }),
        );
      }
      return agg;
    },
    init,
  );
};
