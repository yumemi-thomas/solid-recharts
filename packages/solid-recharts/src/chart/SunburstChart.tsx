// Ported from recharts 3.8.1 src/chart/SunburstChart.tsx (commit 7a23854).
//
// A hierarchical radial chart: recursively draws nested rings of <Sector>s sized
// by each node's value (scaleLinear over the root value → angle). Self-contained —
// it owns its store (preloadedState.options) and renders its own <Surface>, reusing
// Sector / Text / polarToCartesian.
//
// Solid deviations: `resolveDefaultProps`→`merge`; `useState`→`createSignal` (handled
// by RechartsWrapper's portal); `useAppDispatch`→`useAppStore`; `RegisterGraphicalItemId`
// →`useUniqueId`; the imperative `sectors[]`/`positions` build → a `createMemo` that
// recomputes on size/data change; `es-toolkit get` → a small tooltip-index path getter.
// NON-GAP: `responsive` defaults to false in the reference too, and
// ResponsiveContainer sizing flows via the wrapper context.
// DEFERRED: event throttling nuances.
import { createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { scaleLinear } from "d3-scale";
import { Surface } from "../container/Surface";
import { Layer } from "../container/Layer";
import { Sector } from "../shape/Sector";
import { polarToCartesian } from "../util/PolarUtils";
import { useChartHeight, useChartWidth, ReportChartMargin } from "../context/chartLayoutContext";
import { RechartsWrapper } from "./RechartsWrapper";
import { RechartsStoreProvider } from "../state/RechartsStoreProvider";
import { ReportEventSettings } from "../state/ReportEventSettings";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import type { ChartOptions } from "../state/optionsSlice";
import type {
  TooltipIndex,
  TooltipPayloadConfiguration,
  TooltipPayloadSearcher,
} from "../state/tooltipSlice";
import type { RechartsRootState } from "../state/store";
import type {
  ChartCoordinate,
  DataKey,
  EventThrottlingProps,
  Margin,
  Percent,
} from "../util/types";

export interface SunburstData {
  name: string;
  value?: number;
  fill?: string;
  children?: SunburstData[];
  [key: string]: unknown;
}

export interface SunburstChartProps extends EventThrottlingProps {
  class?: string;
  data: SunburstData;
  width?: number | Percent;
  height?: number | Percent;
  responsive?: boolean;
  /** Distance between sectors (stroke width). @defaultValue 2 */
  padding?: number;
  /** @defaultValue value */
  dataKey?: string;
  /** @defaultValue name */
  nameKey?: DataKey<unknown>;
  /** Padding between each hierarchical level. @defaultValue 2 */
  ringPadding?: number;
  /** @defaultValue 50 */
  innerRadius?: number;
  outerRadius?: number;
  cx?: number;
  cy?: number;
  startAngle?: number;
  endAngle?: number;
  children?: JSX.Element;
  fill?: string;
  stroke?: string;
  textOptions?: Record<string, unknown>;
  onMouseEnter?: (node: SunburstData, e: MouseEvent) => void;
  onMouseLeave?: (node: SunburstData, e: MouseEvent) => void;
  onClick?: (node: SunburstData) => void;
  style?: JSX.CSSProperties;
  id?: string;
}

// Kebab-cased SVG attributes (Solid convention) spread onto the raw <text> labels.
const defaultTextProps: Record<string, unknown> = {
  "font-weight": "bold",
  "paint-order": "stroke fill",
  "font-size": ".75rem",
  stroke: "#FFF",
  fill: "black",
  "pointer-events": "none",
};

export const sunburstDefaultProps = {
  padding: 2,
  dataKey: "value",
  nameKey: "name",
  ringPadding: 2,
  innerRadius: 50,
  fill: "#333",
  stroke: "#FFF",
  textOptions: defaultTextProps,
  startAngle: 0,
  endAngle: 360,
  responsive: false,
} as const satisfies Partial<SunburstChartProps>;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v != null;
const isArr = (v: unknown): v is ReadonlyArray<unknown> => Array.isArray(v);

// Resolves a Sunburst tooltipIndex path (e.g. "[0]children[1]") against the
// children array — replaces es-toolkit `get`.
const normalizeSunburstTooltipIndex = (activeIndex: TooltipIndex): string => {
  const indexStr = String(activeIndex);
  return /^\d+$/.test(indexStr) ? `[${indexStr}]` : indexStr;
};

export const sunburstPayloadSearcher: TooltipPayloadSearcher = (
  data: unknown,
  activeIndex: TooltipIndex,
): unknown => {
  if (activeIndex == null) {
    return undefined;
  }
  const normalizedIndex = normalizeSunburstTooltipIndex(activeIndex);
  const tokens = normalizedIndex.match(/children|\[\d+\]/g) ?? [];
  let cur: unknown = data;
  for (const t of tokens) {
    if (t === "children") {
      cur = isObj(cur) ? cur.children : undefined;
    } else {
      cur = isArr(cur) ? cur[Number(t.slice(1, -1))] : undefined;
    }
  }
  return cur;
};

const addToSunburstNodeIndex = (i: number, soFar = ""): TooltipIndex => `${soFar}children[${i}]`;

const getMaxDepthOf = (node: SunburstData): number =>
  !node.children || node.children.length === 0
    ? 1
    : 1 + Math.max(...node.children.map(getMaxDepthOf));

interface SunburstArc {
  key: string;
  fill: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  // Baked-in render values (so the <For> callback reads only `arc.*` — no accessor
  // or props reads in a non-tracking scope, which would trip STRICT_READ).
  cx: number;
  cy: number;
  stroke: string;
  strokeWidth: number;
  textOptions: Record<string, unknown>;
  textX: number;
  textY: number;
  label: number | string;
  node: SunburstData & { tooltipIndex: TooltipIndex };
}

const SunburstChartImpl = (
  props: Required<Pick<SunburstChartProps, "data">> & SunburstChartProps & { id: string },
): JSX.Element => {
  const store = useAppStore();
  const merged = merge(sunburstDefaultProps, props);
  const width = useChartWidth();
  const height = useChartHeight();

  const dims = (): { width: number; height: number } | undefined => {
    const w = width();
    const h = height();
    return w != null && h != null ? { width: w, height: h } : undefined;
  };
  const outerRadius = (): number => merged.outerRadius ?? Math.min(width() ?? 0, height() ?? 0) / 2;
  const cx = (): number => merged.cx ?? (width() ?? 0) / 2;
  const cy = (): number => merged.cy ?? (height() ?? 0) / 2;

  // The arcs + a name→coordinate map, recomputed on size/data change.
  const computed = createMemo<{ arcs: SunburstArc[]; positions: Map<string, ChartCoordinate> }>(
    () => {
      const data = merged.data;
      const dataKey = merged.dataKey;
      const rootValue = typeof data[dataKey] === "number" ? data[dataKey] : 0;
      const rScale = scaleLinear([0, rootValue], [0, merged.endAngle]);
      const treeDepth = getMaxDepthOf(data);
      const thickness = (outerRadius() - merged.innerRadius) / treeDepth;
      const arcs: SunburstArc[] = [];
      const positions = new Map<string, ChartCoordinate>();
      const centerX = cx();
      const centerY = cy();
      const stroke = merged.stroke;
      const strokeWidth = merged.padding;
      const textOptions = merged.textOptions;

      const drawArcs = (
        childNodes: SunburstData[] | undefined,
        radius: number,
        innerR: number,
        initialAngle: number,
        childColor: string | undefined,
        depth: number,
        parentIndex: TooltipIndex | undefined,
      ): void => {
        if (!childNodes) {
          return;
        }
        let currentAngle = initialAngle;
        childNodes.forEach((d, i) => {
          const tooltipIndex: TooltipIndex =
            depth === 1 ? `[${i}]` : addToSunburstNodeIndex(i, parentIndex ?? "");
          const value = typeof d[dataKey] === "number" ? d[dataKey] : 0;
          const arcLength = rScale(value);
          const start = currentAngle;
          const fillColor = d.fill ?? childColor ?? merged.fill;
          const mid = polarToCartesian(0, 0, innerR + radius / 2, -(start + arcLength / 2));
          currentAngle += arcLength;
          arcs.push({
            key: `sunburst-sector-${d.name}-${i}`,
            fill: fillColor,
            startAngle: start,
            endAngle: start + arcLength,
            innerRadius: innerR,
            outerRadius: innerR + radius,
            cx: centerX,
            cy: centerY,
            stroke,
            strokeWidth,
            textOptions,
            textX: mid.x + centerX,
            textY: centerY - mid.y,
            label:
              typeof d[dataKey] === "number" || typeof d[dataKey] === "string" ? d[dataKey] : "",
            node: { ...d, tooltipIndex },
          });
          const pos = polarToCartesian(centerX, centerY, innerR + radius / 2, start);
          positions.set(d.name, { x: pos.x, y: pos.y });
          positions.set(String(tooltipIndex), { x: pos.x, y: pos.y });
          drawArcs(
            d.children,
            radius,
            innerR + radius + merged.ringPadding,
            start,
            fillColor,
            depth + 1,
            tooltipIndex,
          );
        });
      };

      drawArcs(
        data.children,
        thickness,
        merged.innerRadius,
        merged.startAngle,
        undefined,
        1,
        undefined,
      );
      return { arcs, positions };
    },
  );

  const handleEnter = (arc: SunburstArc, e: MouseEvent): void => {
    merged.onMouseEnter?.(arc.node, e);
    store?.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: arc.node.tooltipIndex,
      activeDataKey: merged.dataKey,
      activeCoordinate: computed().positions.get(arc.node.name),
      activeGraphicalItemId: props.id,
    });
  };
  const handleLeave = (arc: SunburstArc, e: MouseEvent): void => {
    merged.onMouseLeave?.(arc.node, e);
    store?.actions.tooltip.mouseLeaveItem();
  };
  const handleClick = (arc: SunburstArc): void => {
    merged.onClick?.(arc.node);
    store?.actions.tooltip.setActiveClickItemIndex({
      activeIndex: arc.node.tooltipIndex,
      activeDataKey: merged.dataKey,
      activeCoordinate: computed().positions.get(arc.node.name),
      activeGraphicalItemId: props.id,
    });
  };

  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data.children,
    getPosition: (index) => {
      const key = String(index);
      return (
        computed().positions.get(key) ??
        computed().positions.get(normalizeSunburstTooltipIndex(key)) ??
        computed().positions.get(`[${key}]`)
      );
    },
    settings: {
      stroke: merged.stroke,
      strokeWidth: undefined,
      fill: merged.fill,
      nameKey: merged.nameKey,
      dataKey: merged.dataKey,
      name: merged.nameKey ? undefined : merged.dataKey,
      hide: false,
      type: undefined,
      color: merged.fill,
      unit: "",
      graphicalItemId: props.id,
    },
  }));

  const layerClass = (): string =>
    ["recharts-sunburst", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  return (
    <Show when={dims()}>
      {(d) => (
        <Surface width={d().width} height={d().height}>
          <Layer class={layerClass()}>
            <For each={computed().arcs}>
              {(arc) => (
                <g>
                  <Sector
                    onClick={() => handleClick(arc)}
                    onMouseEnter={(e) => handleEnter(arc, e)}
                    onMouseLeave={(e) => handleLeave(arc, e)}
                    fill={arc.fill}
                    stroke={arc.stroke}
                    strokeWidth={arc.strokeWidth}
                    startAngle={arc.startAngle}
                    endAngle={arc.endAngle}
                    innerRadius={arc.innerRadius}
                    outerRadius={arc.outerRadius}
                    cx={arc.cx}
                    cy={arc.cy}
                  />
                  {/* Raw <text> (not the <Text> component, whose word-wrap geometry
                      memo trips STRICT_READ in this For nesting): short value labels
                      don't need wrapping. textOptions are kebab SVG attrs. */}
                  <text {...arc.textOptions} text-anchor="middle" x={arc.textX} y={arc.textY}>
                    {arc.label}
                  </text>
                </g>
              )}
            </For>
          </Layer>
          <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
          {merged.children}
        </Surface>
      )}
    </Show>
  );
};

const sunburstPreloadedState = (): Partial<RechartsRootState> => ({
  options: {
    chartName: "Sunburst",
    defaultTooltipEventType: "item",
    validateTooltipEventTypes: ["item"],
    tooltipPayloadSearcher: sunburstPayloadSearcher,
    eventEmitter: undefined,
  } satisfies ChartOptions,
});

const zeroMargin: Margin = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * A hierarchical chart, like a Treemap plotted in polar coordinates: nested rings
 * of sectors conveying the proportions within each level of the tree.
 */
export const SunburstChart = (props: SunburstChartProps): JSX.Element => {
  const id = useUniqueId("recharts-sunburst", props.id);
  return (
    <RechartsStoreProvider preloadedState={sunburstPreloadedState()}>
      <ReportChartMargin margin={zeroMargin} />
      <ReportEventSettings
        throttleDelay={props.throttleDelay}
        throttledEvents={props.throttledEvents}
      />
      <RechartsWrapper
        class={props.class}
        width={props.width}
        height={props.height}
        responsive={props.responsive ?? false}
        style={props.style}
      >
        <SunburstChartImpl {...props} id={id} />
      </RechartsWrapper>
    </RechartsStoreProvider>
  );
};
