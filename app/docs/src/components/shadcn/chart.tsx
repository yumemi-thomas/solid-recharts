// Solid port of shadcn/ui chart.tsx (new-york-v4) on top of solid-recharts.
// Differences from the React original:
//  - `content` is the function form (`content={(p) => <ChartTooltipContent {...p} />}`)
//    because the Solid port has no React.cloneElement for element-form content.
//  - class merging uses Solid's `class` array form instead of cn().
//  - `className`/`labelClassName` props are `class`/`labelClass`.
//  - the tooltip `formatter` receives the full payload array as its 5th argument
//    (the recharts Formatter contract) instead of the row's data point.
import {
  For,
  Show,
  createContext,
  createMemo,
  createUniqueId,
  merge,
  useContext,
  type Component,
} from "solid-js";
import { Dynamic, type JSX } from "@solidjs/web";
import { twMerge } from "tailwind-merge";
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
  type LegendPayload,
  type TooltipContentProps,
  type TooltipPayloadEntry,
} from "solid-recharts";

type ThemeName = "light" | "dark";

// Format: { name: THEME_NAME, prefix: CSS_SELECTOR }
const THEMES: ReadonlyArray<{ name: ThemeName; prefix: string }> = [
  { name: "light", prefix: "" },
  { name: "dark", prefix: ".dark" },
];

export type ChartConfig = Record<
  string,
  {
    label?: JSX.Element;
    icon?: Component;
    color?: string;
    theme?: Record<ThemeName, string>;
  }
>;

interface ChartContextProps {
  config: ChartConfig;
}

// Default-less context: useContext throws if there's no <ChartContainer /> above,
// matching the React version's useChart() error.
const ChartContext = createContext<ChartContextProps>();

export function ChartContainer(props: {
  id?: string;
  class?: string;
  config: ChartConfig;
  children: JSX.Element;
  initialDimension?: { width: number; height: number };
}): JSX.Element {
  const uniqueId = createUniqueId();
  const chartId = (): string => `chart-${props.id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext
      value={{
        get config() {
          return props.config;
        },
      }}
    >
      <div
        data-slot="chart"
        data-chart={chartId()}
        class={twMerge(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          props.class,
        )}
      >
        <ChartStyle id={chartId()} config={props.config} />
        {/* No INITIAL_DIMENSION default (unlike upstream shadcn): a fixed initial
            size makes SSR emit a fully drawn chart and hydration fails to claim
            it (unclaimed recharts-wrapper, chart never mounts). The port's
            default ({-1,-1}) defers drawing until the client measures. */}
        <ResponsiveContainer initialDimension={props.initialDimension}>
          {props.children}
        </ResponsiveContainer>
      </div>
    </ChartContext>
  );
}

export function ChartStyle(props: { id: string; config: ChartConfig }): JSX.Element {
  const css = createMemo(() => {
    const colorConfig = Object.entries(props.config).filter(
      ([, itemConfig]) => itemConfig.theme ?? itemConfig.color,
    );
    if (!colorConfig.length) return "";
    return THEMES.map(
      (theme) => `
${theme.prefix} [data-chart=${props.id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme.name] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}
`,
    ).join("\n");
  });

  // The generated CSS contains no HTML-escapable characters, so a plain text
  // child is safe (and SSR-friendly).
  return (
    <Show when={css()}>
      <style>{css()}</style>
    </Show>
  );
}

export const ChartTooltip = Tooltip;

type ChartTooltipContentProps = TooltipContentProps & {
  class?: string;
  labelClass?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  color?: string;
};

export function ChartTooltipContent(props: ChartTooltipContentProps): JSX.Element {
  const chart = useContext(ChartContext);
  const merged = merge(
    { indicator: "dot", hideLabel: false, hideIndicator: false } as const,
    props,
  );

  const visiblePayload = createMemo(() =>
    (props.payload ?? []).filter((item) => item != null && item.type !== "none"),
  );
  const nestLabel = (): boolean => visiblePayload().length === 1 && merged.indicator !== "dot";

  // Resolved label *value* (a config label or the raw axis label — plain data,
  // not JSX). Formatting happens at the JSX boundary in TooltipLabel.
  const labelValue = (): JSX.Element => {
    const [item] = visiblePayload();
    const key = merged.labelKey ?? stringKey(item?.dataKey) ?? stringKey(item?.name) ?? "value";
    const itemConfig = getPayloadConfigFromPayload(chart.config, item, key);
    return !merged.labelKey && typeof merged.label === "string"
      ? (chart.config[merged.label]?.label ?? merged.label)
      : itemConfig?.label;
  };

  const TooltipLabel = (): JSX.Element => (
    <Show when={!merged.hideLabel && visiblePayload().length > 0}>
      <Show
        when={merged.labelFormatter}
        fallback={
          <Show when={labelValue() != null && labelValue() !== ""}>
            <div class={["font-medium", merged.labelClass]}>{labelValue()}</div>
          </Show>
        }
      >
        {(labelFormatter) => (
          <div class={["font-medium", merged.labelClass]}>
            {labelFormatter()(labelValue(), props.payload ?? [])}
          </div>
        )}
      </Show>
    </Show>
  );

  const TooltipRow = (rowProps: { item: TooltipPayloadEntry; index: number }): JSX.Element => {
    const itemConfig = (): ChartConfig[string] | undefined => {
      const key =
        merged.nameKey ??
        stringKey(rowProps.item.name) ??
        stringKey(rowProps.item.dataKey) ??
        "value";
      return getPayloadConfigFromPayload(chart.config, rowProps.item, key);
    };
    const indicatorColor = (): string | undefined => {
      const dataPoint = rowProps.item.payload;
      const fill =
        isRecord(dataPoint) && typeof dataPoint.fill === "string" ? dataPoint.fill : undefined;
      return merged.color ?? fill ?? rowProps.item.color;
    };

    return (
      <div
        class={[
          "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
          { "items-center": merged.indicator === "dot" },
        ]}
      >
        <Show
          when={
            merged.formatter && rowProps.item.value !== undefined && rowProps.item.name != null
              ? merged.formatter
              : undefined
          }
          fallback={
            <>
              <Show
                when={itemConfig()?.icon}
                fallback={
                  <Show when={!merged.hideIndicator}>
                    <div
                      class={[
                        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                        {
                          "h-2.5 w-2.5": merged.indicator === "dot",
                          "w-1": merged.indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent":
                            merged.indicator === "dashed",
                          "my-0.5": nestLabel() && merged.indicator === "dashed",
                        },
                      ]}
                      style={{
                        "--color-bg": indicatorColor(),
                        "--color-border": indicatorColor(),
                      }}
                    />
                  </Show>
                }
              >
                {(icon) => <Dynamic component={icon()} />}
              </Show>
              <div
                class={[
                  "flex flex-1 justify-between leading-none",
                  nestLabel() ? "items-end" : "items-center",
                ]}
              >
                <div class="grid gap-1.5">
                  <Show when={nestLabel()}>
                    <TooltipLabel />
                  </Show>
                  <span class="text-muted-foreground">
                    {itemConfig()?.label ?? rowProps.item.name}
                  </span>
                </div>
                <Show when={rowProps.item.value != null}>
                  <span class="font-mono font-medium text-foreground tabular-nums">
                    {typeof rowProps.item.value === "number"
                      ? rowProps.item.value.toLocaleString()
                      : String(rowProps.item.value)}
                  </span>
                </Show>
              </div>
            </>
          }
        >
          {(formatter) => (
            // Fragment-wrapped so the call (and its reactive reads) runs in the
            // tracked insert, not the untracked Show-children callback body.
            <>
              {formatter()(
                rowProps.item.value,
                rowProps.item.name,
                rowProps.item,
                rowProps.index,
                props.payload ?? [],
              )}
            </>
          )}
        </Show>
      </div>
    );
  };

  return (
    <Show when={props.active && visiblePayload().length > 0}>
      <div
        class={twMerge(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          merged.class,
        )}
      >
        <Show when={!nestLabel()}>
          <TooltipLabel />
        </Show>
        <div class="grid gap-1.5">
          <For each={visiblePayload()}>
            {(item, index) => <TooltipRow item={item} index={index()} />}
          </For>
        </div>
      </div>
    </Show>
  );
}

export const ChartLegend = Legend;

export function ChartLegendContent(props: {
  class?: string;
  hideIcon?: boolean;
  nameKey?: string;
  payload?: ReadonlyArray<LegendPayload>;
  verticalAlign?: "top" | "middle" | "bottom";
}): JSX.Element {
  const chart = useContext(ChartContext);
  const visiblePayload = createMemo(() =>
    (props.payload ?? []).filter((item) => item.type !== "none"),
  );

  const LegendItem = (itemProps: { item: LegendPayload }): JSX.Element => {
    const itemConfig = (): ChartConfig[string] | undefined => {
      const key = props.nameKey ?? stringKey(itemProps.item.dataKey) ?? "value";
      return getPayloadConfigFromPayload(chart.config, itemProps.item, key);
    };

    return (
      <div class="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
        <Show
          when={props.hideIcon ? undefined : itemConfig()?.icon}
          fallback={
            <div
              class="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ "background-color": itemProps.item.color }}
            />
          }
        >
          {(icon) => <Dynamic component={icon()} />}
        </Show>
        {itemConfig()?.label}
      </div>
    );
  };

  return (
    <Show when={visiblePayload().length > 0}>
      <div
        class={twMerge(
          "flex items-center justify-center gap-4",
          props.verticalAlign === "top" ? "pb-3" : "pt-3",
          props.class,
        )}
      >
        <For each={visiblePayload()}>{(item) => <LegendItem item={item} />}</For>
      </div>
    </Show>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Stringify a payload key candidate (dataKey can be a function — skip those). */
function stringKey(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

// Helper to extract item config from a payload entry.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
): ChartConfig[string] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const inner = isRecord(payload.payload) ? payload.payload : undefined;

  let configLabelKey: string = key;
  const direct = payload[key];
  const nested = inner?.[key];

  if (typeof direct === "string") {
    configLabelKey = direct;
  } else if (typeof nested === "string") {
    configLabelKey = nested;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}
