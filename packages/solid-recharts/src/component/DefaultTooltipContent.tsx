// Ported from recharts 3.8.1 src/component/DefaultTooltipContent.tsx (commit 7a23854).
//
// The type half seeded the tooltip slice/selectors early; the component lands now.
// Deviations: `Payload` does NOT extend `Omit<SVGProps<SVGElement>, 'name'>`
// (the per-entry `formatter` is populated from the graphical items' `formatter`
// prop and wins over the prop-level one, per v3.9.1); `any` → `unknown`,
// `ReactNode` → `Element`, `CSSProperties` → `JSX.CSSProperties`; `className` →
// `class`, `clsx(...)` → `class={[...]}` array form (no clsx dep); `React.isValid-
// Element` check dropped (Solid renders an Element or a string uniformly).
import { For, Show, createMemo, merge } from "solid-js";
import type { Element } from "solid-js";
import type { JSX } from "@solidjs/web";
import { isNullish, isNumOrStr } from "../util/DataUtils";
import { DataKey, TooltipType } from "../util/types";
import type { TooltipPayload, TooltipPayloadEntry } from "../state/tooltipSlice";

export type ValueType = number | string | ReadonlyArray<number | string>;
export type NameType = number | string;

function defaultFormatter(value: ValueType | undefined): Element {
  return Array.isArray(value) && isNumOrStr(value[0]) && isNumOrStr(value[1])
    ? value.join(" ~ ")
    : value;
}

export type Formatter<TValue extends ValueType = ValueType, TName extends NameType = NameType> = (
  value: TValue | undefined,
  name: TName | undefined,
  item: Payload<TValue, TName>,
  index: number,
  payload: ReadonlyArray<Payload<TValue, TName>>,
) => [Element, TName] | Element;

export interface Payload<TValue extends ValueType = ValueType, TName extends NameType = NameType> {
  type?: TooltipType;
  color?: string;
  formatter?: Formatter<TValue, TName>;
  name?: TName;
  value?: TValue;
  unit?: Element;
  fill?: string;
  dataKey?: DataKey<unknown>;
  nameKey?: DataKey<unknown>;
  payload?: unknown;
  chartType?: string;
  stroke?: string;
  strokeDasharray?: string | number;
  strokeWidth?: number | string;
  class?: string;
  hide?: boolean;
  /** The id of the graphical item the data point belongs to. */
  graphicalItemId: string;
}

export type TooltipItemSorter<
  TValue extends ValueType = ValueType,
  TName extends NameType = NameType,
> = "dataKey" | "value" | "name" | ((item: Payload<TValue, TName>) => number | string | undefined);

export interface Props<TValue extends ValueType = ValueType, TName extends NameType = NameType> {
  separator?: string;
  wrapperClass?: string;
  labelClass?: string;
  formatter?: Formatter<TValue, TName>;
  contentStyle?: JSX.CSSProperties;
  itemStyle?: JSX.CSSProperties;
  labelStyle?: JSX.CSSProperties;
  labelFormatter?: (label: Element, payload: ReadonlyArray<Payload<TValue, TName>>) => Element;
  label?: Element;
  payload?: ReadonlyArray<Payload<TValue, TName>>;
  itemSorter?: TooltipItemSorter<TValue, TName>;
  accessibilityLayer?: boolean;
}

export const defaultDefaultTooltipContentProps = {
  separator: " : ",
  // Deviation: recharts uses React CSSProperties (numbers auto-px); csstype (Solid
  // JSX.CSSProperties) requires explicit string lengths, so px values are spelled out.
  contentStyle: {
    margin: 0,
    padding: "10px",
    "background-color": "#fff",
    border: "1px solid #ccc",
    "white-space": "nowrap",
  },
  itemStyle: {
    display: "block",
    "padding-top": "4px",
    "padding-bottom": "4px",
    color: "#000",
  },
  labelStyle: {},
  accessibilityLayer: false,
} as const satisfies Partial<Props>;

// Deviation: recharts calls es-toolkit `sortBy(array, itemSorter)` with a
// `@ts-expect-error` (the string/function iteratee union doesn't type-check). The
// port inlines an equivalent stable ascending sort (undefined keys sort last, as
// lodash/es-toolkit do) with a typed key extractor — no cast, no suppressed error.
function sortKeyOf(
  item: TooltipPayloadEntry,
  itemSorter: TooltipItemSorter,
): number | string | undefined {
  // Deviation: the payload can contain null/undefined entries (recharts'
  // es-toolkit `sortBy` tolerates them; the render map guards `!entry`). Mirror
  // that here so the key extractor doesn't dereference a nullish entry.
  if (item == null) {
    return undefined;
  }
  if (typeof itemSorter === "function") {
    return itemSorter(item);
  }
  if (itemSorter === "value") {
    return isNumOrStr(item.value) ? item.value : undefined;
  }
  if (itemSorter === "name") {
    return item.name;
  }
  const dataKey = item.dataKey;
  return typeof dataKey === "function" ? undefined : dataKey;
}

function compareSortKeys(a: number | string | undefined, b: number | string | undefined): number {
  if (a === b) {
    return 0;
  }
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  return a < b ? -1 : 1;
}

function lodashLikeSortBy(
  array: TooltipPayload,
  itemSorter: TooltipItemSorter | undefined,
): TooltipPayload {
  if (itemSorter == null) {
    return array;
  }
  return array
    .map((item, index) => ({ item, index, key: sortKeyOf(item, itemSorter) }))
    .sort((a, b) => compareSortKeys(a.key, b.key) || a.index - b.index)
    .map((entry) => entry.item);
}

/**
 * Rendered by default inside {@link Tooltip}. Provide your own via the Tooltip
 * `content` prop to customize.
 */
export const DefaultTooltipContent = (props: Props): JSX.Element => {
  const merged = merge(defaultDefaultTooltipContentProps, props);

  const sortedPayload = createMemo<TooltipPayload>(() => {
    const payload = props.payload;
    if (payload && payload.length) {
      return lodashLikeSortBy(payload, props.itemSorter);
    }
    return [];
  });

  const finalLabel = createMemo<Element>(() => {
    const label = props.label;
    const hasLabel = !isNullish(label);
    const payload = props.payload;
    if (hasLabel && props.labelFormatter && payload != null) {
      return props.labelFormatter(label, payload);
    }
    return hasLabel ? label : "";
  });

  // A child component (not an inline render fn) so the reactive prop reads happen
  // during its own render rather than in the <For> callback body — avoids
  // STRICT_READ_UNTRACKED (same pattern as Dots' DotRenderer).
  const TooltipItem = (itemProps: { entry: TooltipPayloadEntry; index: number }): JSX.Element => {
    const formattedEntry = createMemo<{ value: Element; name: Element } | null>(() => {
      const entry = itemProps.entry;
      if (!entry || entry.type === "none") {
        return null;
      }
      const finalFormatter: Formatter = entry.formatter ?? props.formatter ?? defaultFormatter;
      const formatted = finalFormatter(
        entry.value,
        entry.name,
        entry,
        itemProps.index,
        props.payload ?? [],
      );
      if (Array.isArray(formatted)) {
        return { value: formatted[0], name: formatted[1] };
      }
      if (formatted != null) {
        return { value: formatted, name: entry.name };
      }
      return null;
    });

    const itemStyle = (): JSX.CSSProperties => ({
      ...defaultDefaultTooltipContentProps.itemStyle,
      color: itemProps.entry.color ?? defaultDefaultTooltipContentProps.itemStyle.color,
      ...props.itemStyle,
    });

    return (
      <Show when={formattedEntry()}>
        {(fe) => (
          <li class="recharts-tooltip-item" style={itemStyle()}>
            <Show when={isNumOrStr(fe().name)}>
              <span class="recharts-tooltip-item-name">{fe().name}</span>
              <span class="recharts-tooltip-item-separator">{merged.separator}</span>
            </Show>
            <span class="recharts-tooltip-item-value">{fe().value}</span>
            <span class="recharts-tooltip-item-unit">{itemProps.entry.unit ?? ""}</span>
          </li>
        )}
      </Show>
    );
  };

  const finalStyle = (): JSX.CSSProperties => ({
    ...defaultDefaultTooltipContentProps.contentStyle,
    ...props.contentStyle,
  });
  const finalLabelStyle = (): JSX.CSSProperties => ({ margin: 0, ...props.labelStyle });

  return (
    <div
      class={["recharts-default-tooltip", props.wrapperClass]}
      style={finalStyle()}
      role={merged.accessibilityLayer ? "status" : undefined}
      aria-live={merged.accessibilityLayer ? "assertive" : undefined}
    >
      <p class={["recharts-tooltip-label", props.labelClass]} style={finalLabelStyle()}>
        {finalLabel()}
      </p>
      <Show when={sortedPayload().length > 0}>
        <ul class="recharts-tooltip-item-list" style={{ padding: 0, margin: 0 }}>
          <For each={sortedPayload()}>
            {(entry, i) => <TooltipItem entry={entry} index={i()} />}
          </For>
        </ul>
      </Show>
    </div>
  );
};
