// Partial port of recharts 3.8.1 src/component/DefaultLegendContent.tsx (commit 7a23854).
//
// TYPES + component. The legend slice/selectors need these types; the component
// renders the legend item list. Deviations: `ReactElement`→`Element`/dropped,
// `DataKey<any>`→`DataKey<unknown>`, `ReactNode`→`Element`, `CSSProperties`→
// `JSX.CSSProperties`, `className`→`class`, clsx→`class={[...]}`; `LegendItemSorter`
// is co-located here (reference keeps it in Legend.tsx) so the slice can import it
// without depending on the Legend component. `adaptEventsOfChild` events deferred.
import { For, Show, merge } from "solid-js";
import type { Element } from "solid-js";
import type { JSX } from "@solidjs/web";
import { DataKey, LegendType, MousePointer } from "../util/types";
import { Surface } from "../container/Surface";
import { Symbols } from "../shape/Symbols";

const SIZE = 32;

export type HorizontalAlignmentType = "center" | "left" | "right";
export type VerticalAlignmentType = "top" | "bottom" | "middle";

export type Formatter = (value: string | undefined, entry: LegendPayload, index: number) => Element;

export interface LegendPayload {
  value: string | undefined;
  type?: LegendType;
  color?: string;
  payload?: object;
  formatter?: Formatter;
  inactive?: boolean;
  dataKey?: DataKey<unknown>;
}

export type LegendItemSorter = "value" | "dataKey" | ((item: LegendPayload) => number | string);

export type ContentType = JSX.Element | ((props: Props) => JSX.Element);

export type LegendItemEventHandler = (
  data: LegendPayload,
  index: number,
  event: MousePointer,
) => void;

export interface Props {
  iconSize?: number;
  iconType?: LegendType;
  layout?: "horizontal" | "vertical";
  align?: HorizontalAlignmentType;
  verticalAlign?: VerticalAlignmentType;
  inactiveColor?: string;
  formatter?: Formatter;
  payload?: ReadonlyArray<LegendPayload>;
  labelStyle?: JSX.CSSProperties;
  onClick?: LegendItemEventHandler;
  onMouseEnter?: LegendItemEventHandler;
  onMouseLeave?: LegendItemEventHandler;
}

export const defaultLegendContentDefaultProps = {
  align: "center",
  iconSize: 14,
  inactiveColor: "#ccc",
  layout: "horizontal",
  verticalAlign: "middle",
} as const satisfies Partial<Props>;

const LegendIcon = (props: {
  data: LegendPayload;
  iconType: LegendType | undefined;
  inactiveColor: string;
}): JSX.Element => {
  const color = (): string | undefined =>
    props.data.inactive ? props.inactiveColor : props.data.color;
  const preferredIcon = (): LegendType | undefined => props.iconType ?? props.data.type;
  const halfSize = SIZE / 2;
  const thirdSize = SIZE / 3;
  const sixthSize = SIZE / 6;

  return (
    <Show when={preferredIcon() !== "none"}>
      {(() => {
        const icon = preferredIcon();
        if (icon === "plainline") {
          return (
            <line
              stroke-width={4}
              fill="none"
              stroke={color()}
              x1={0}
              y1={halfSize}
              x2={SIZE}
              y2={halfSize}
              class="recharts-legend-icon"
            />
          );
        }
        if (icon === "line") {
          return (
            <path
              stroke-width={4}
              fill="none"
              stroke={color()}
              d={`M0,${halfSize}h${thirdSize}A${sixthSize},${sixthSize},0,1,1,${2 * thirdSize},${halfSize}H${SIZE}M${2 * thirdSize},${halfSize}A${sixthSize},${sixthSize},0,1,1,${thirdSize},${halfSize}`}
              class="recharts-legend-icon"
            />
          );
        }
        if (icon === "rect") {
          return (
            <path
              stroke="none"
              fill={color()}
              d={`M0,${SIZE / 8}h${SIZE}v${(SIZE * 3) / 4}h${-SIZE}z`}
              class="recharts-legend-icon"
            />
          );
        }
        return (
          <Symbols
            fill={color()}
            cx={halfSize}
            cy={halfSize}
            size={SIZE}
            sizeType="diameter"
            type={icon == null || icon === "none" ? "square" : icon}
          />
        );
      })()}
    </Show>
  );
};

/**
 * Rendered by default inside {@link Legend}; provide your own via the Legend
 * `content` prop to customize.
 */
export const DefaultLegendContent = (props: Props): JSX.Element => {
  const merged = merge(defaultLegendContentDefaultProps, props);

  const itemStyle = (): JSX.CSSProperties => ({
    display: merged.layout === "horizontal" ? "inline-block" : "block",
    "margin-right": "10px",
  });
  const svgStyle: JSX.CSSProperties = {
    display: "inline-block",
    "vertical-align": "middle",
    "margin-right": "4px",
  };
  const listStyle = (): JSX.CSSProperties => ({
    padding: 0,
    margin: 0,
    "text-align": merged.layout === "horizontal" ? merged.align : "left",
  });

  const valueOf = (entry: LegendPayload, index: number): Element => {
    const finalFormatter = entry.formatter ?? merged.formatter;
    return finalFormatter ? finalFormatter(entry.value, entry, index) : entry.value;
  };

  const labelStyleOf = (entry: LegendPayload): JSX.CSSProperties => ({
    ...merged.labelStyle,
    // recharts parity: an explicit labelStyle.color wins over the entry color.
    color: entry.inactive ? merged.inactiveColor : (merged.labelStyle?.color ?? entry.color),
  });

  return (
    <Show when={merged.payload && merged.payload.length}>
      <ul class="recharts-default-legend" style={listStyle()}>
        <For each={merged.payload}>
          {(entry, i) => (
            <Show when={entry.type !== "none"}>
              <li
                class={[
                  "recharts-legend-item",
                  `legend-item-${i()}`,
                  entry.inactive ? "inactive" : undefined,
                ]}
                style={itemStyle()}
                onClick={(event) => merged.onClick?.(entry, i(), event)}
                onMouseEnter={(event) => merged.onMouseEnter?.(entry, i(), event)}
                onMouseLeave={(event) => merged.onMouseLeave?.(entry, i(), event)}
              >
                <Surface
                  width={merged.iconSize}
                  height={merged.iconSize}
                  viewBox={{ x: 0, y: 0, width: SIZE, height: SIZE }}
                  style={svgStyle}
                  aria-label={entry.value == null ? "legend icon" : `${entry.value} legend icon`}
                >
                  <LegendIcon
                    data={entry}
                    iconType={merged.iconType}
                    inactiveColor={merged.inactiveColor}
                  />
                </Surface>
                <span class="recharts-legend-item-text" style={labelStyleOf(entry)}>
                  {valueOf(entry, i())}
                </span>
              </li>
            </Show>
          )}
        </For>
      </ul>
    </Show>
  );
};
