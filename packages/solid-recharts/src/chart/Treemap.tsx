// Ported from recharts 3.8.1 src/chart/Treemap.tsx (commit 7a23854).
//
// A hierarchical chart: the squarified-treemap layout (computeNode rolls values up
// the tree, squarify packs each node's children into aspect-ratio-optimal rows of
// rectangles) rendered as nested <Rectangle>s. Self-contained — owns its store.
//
// Solid deviations: `resolveDefaultProps`→`merge`; `useAppDispatch`→`useAppStore`;
// `RegisterGraphicalItemId`→`useUniqueId`; the recharts `AreaArray = Array & {area}`
// static-property hack → a plain `{ items, area }` row object; recursive
// `renderNode` → a recursive <TreemapNodeView> component (props-only reads, so no
// STRICT_READ); `es-toolkit get` → a tooltip-index path getter.
// Custom `content` (FUNCTION form: `(node) => JSX`) IS wired — replaces the default
// rect+label per node. type="nest" drill-down IS wired (currentRoot/nestIndex modelled
// as a signal-backed drill stack; breadcrumb strip + drill arrow). Node enter animation
// IS wired: each node slides in from the left via CSSTransitionAnimate (transform), with
// the animated style on the recreated depth layer and a stable pre-created `body` so the
// rect's handlers/refs survive the per-frame re-renders. ResponsiveContainer sizing
// works via the wrapper context (the reference itself hardcodes responsive={false}
// on its wrapper). DEFERRED: the element form of `content` & `nestIndexContent`,
// per-node name-fit text sizing nuances.
import { createMemo, createSignal, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Surface } from "../container/Surface";
import { Layer } from "../container/Layer";
import { Rectangle } from "../shape/Rectangle";
import { Polygon } from "../shape/Polygon";
import { CSSTransitionAnimate } from "../animation/CSSTransitionAnimate";
import type { EasingInput } from "../animation/easing";
import { RechartsWrapper } from "./RechartsWrapper";
import { RechartsStoreProvider } from "../state/RechartsStoreProvider";
import { ReportChartMargin, useChartHeight, useChartWidth } from "../context/chartLayoutContext";
import { ReportEventSettings } from "../state/ReportEventSettings";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import { getValueByDataKey } from "../util/ChartUtils";
import { isNan } from "../util/DataUtils";
import { COLOR_PANEL, DATA_ITEM_INDEX_ATTRIBUTE_NAME } from "../util/Constants";
import type { ChartOptions } from "../state/optionsSlice";
import type {
  TooltipIndex,
  TooltipPayloadConfiguration,
  TooltipPayloadSearcher,
} from "../state/tooltipSlice";
import type { RechartsRootState } from "../state/store";
import type {
  Coordinate,
  DataKey,
  EventThrottlingProps,
  Margin,
  MousePointer,
  Percent,
} from "../util/types";

const NODE_VALUE_KEY = "value";
const NEST_INDEX_HEIGHT = 30;

// In 'nest' mode the breadcrumb strip steals 30px off the bottom of the drawing
// surface (recharts getTreemapRenderHeight).
const getTreemapRenderHeight = (height: number, type: "flat" | "nest"): number =>
  type === "nest" ? height - NEST_INDEX_HEIGHT : height;

export interface TreemapDataType {
  children?: ReadonlyArray<TreemapDataType>;
  [key: string]: unknown;
}

export interface TreemapNode {
  children: ReadonlyArray<TreemapNode> | null;
  value: number;
  depth: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  tooltipIndex: TooltipIndex;
  [k: string]: unknown;
}

interface RectanglePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v != null;
const isArr = (v: unknown): v is ReadonlyArray<unknown> => Array.isArray(v);
const toNum = (v: unknown): number => (typeof v === "number" ? v : 0);

const isTreemapNode = (value: unknown): value is TreemapNode =>
  isObj(value) &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number";

export const addToTreemapNodeIndex = (
  i: number,
  soFar: TooltipIndex | undefined = "",
): TooltipIndex => `${soFar ?? ""}children[${i}]`;

// Resolves a Treemap tooltipIndex path (e.g. "children[0]children[1]") against the
// formatted root — replaces es-toolkit `get`.
const normalizeTreemapTooltipIndex = (activeIndex: TooltipIndex): TooltipIndex => {
  const indexStr = String(activeIndex);
  return /^\d+$/.test(indexStr) ? addToTreemapNodeIndex(Number(indexStr), "") : activeIndex;
};

export const treemapPayloadSearcher: TooltipPayloadSearcher = (
  data: unknown,
  activeIndex: TooltipIndex,
): unknown => {
  if (!data || !activeIndex) {
    return undefined;
  }
  const normalizedIndex = normalizeTreemapTooltipIndex(activeIndex);
  if (normalizedIndex == null) {
    return undefined;
  }
  const tokens = normalizedIndex.match(/children|\[\d+\]/g) ?? [];
  if (tokens.length === 0) {
    return undefined;
  }
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

// Rolls each node's value up from its leaves and assigns depth/index/name/tooltipIndex.
export const computeNode = ({
  depth,
  node,
  index,
  dataKey,
  nameKey,
  nestedActiveTooltipIndex,
}: {
  depth: number;
  // Raw data OR an already-computed node (nest drill-in recomputes from a TreemapNode).
  node: TreemapDataType | TreemapNode;
  index: number;
  dataKey: DataKey<unknown>;
  nameKey: DataKey<unknown>;
  nestedActiveTooltipIndex: TooltipIndex | undefined;
}): TreemapNode => {
  const currentTooltipIndex =
    depth === 0 ? "" : addToTreemapNodeIndex(index, nestedActiveTooltipIndex);
  const children: ReadonlyArray<TreemapDataType | TreemapNode> | null | undefined = node.children;
  const computedChildren =
    children && children.length > 0
      ? children.map((child, i) =>
          computeNode({
            depth: depth + 1,
            node: child,
            index: i,
            dataKey,
            nameKey,
            nestedActiveTooltipIndex: currentTooltipIndex,
          }),
        )
      : null;
  let nodeValue: number;
  if (computedChildren && computedChildren.length > 0) {
    nodeValue = computedChildren.reduce((result, child) => result + child.value, 0);
  } else {
    const numericValue = toNum(node[String(dataKey)]);
    nodeValue = isNan(numericValue) || numericValue <= 0 ? 0 : numericValue;
  }
  const nameRaw = getValueByDataKey(node, nameKey, "");
  return {
    ...node,
    x: toNum(node.x),
    y: toNum(node.y),
    width: toNum(node.width),
    height: toNum(node.height),
    children: computedChildren,
    name: typeof nameRaw === "string" || typeof nameRaw === "number" ? String(nameRaw) : "",
    value: nodeValue,
    depth,
    index,
    tooltipIndex: currentTooltipIndex,
  };
};

const filterRect = (node: TreemapNode): RectanglePosition => ({
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
});

const insetRect = (rect: RectanglePosition, nodeInset: number): RectanglePosition => {
  if (!Number.isFinite(nodeInset) || nodeInset <= 0) {
    return rect;
  }
  const pad = Math.min(nodeInset, rect.width / 2, rect.height / 2);
  return {
    x: rect.x + pad,
    y: rect.y + pad,
    width: Math.max(rect.width - pad * 2, 0),
    height: Math.max(rect.height - pad * 2, 0),
  };
};

type TreemapNodeWithArea = TreemapNode & { area: number };
// recharts hangs a static `.area` off the row array; here a plain object instead.
interface Row {
  items: TreemapNodeWithArea[];
  area: number;
}

const applyGapToChildren = (
  children: ReadonlyArray<TreemapNodeWithArea>,
  parentRect: RectanglePosition,
  nodeGap: number,
): ReadonlyArray<TreemapNodeWithArea> => {
  if (!Number.isFinite(nodeGap) || nodeGap <= 0) {
    return children;
  }
  const halfGap = nodeGap / 2;
  const parentRight = parentRect.x + parentRect.width;
  const parentBottom = parentRect.y + parentRect.height;
  return children.map((child) => {
    const childRight = child.x + child.width;
    const childBottom = child.y + child.height;
    const leftInset = child.x > parentRect.x ? halfGap : 0;
    const rightInset = childRight < parentRight ? halfGap : 0;
    const topInset = child.y > parentRect.y ? halfGap : 0;
    const bottomInset = childBottom < parentBottom ? halfGap : 0;
    return {
      ...child,
      x: child.x + leftInset,
      y: child.y + topInset,
      width: Math.max(child.width - leftInset - rightInset, 0),
      height: Math.max(child.height - topInset - bottomInset, 0),
    };
  });
};

const getAreaOfChildren = (
  children: ReadonlyArray<TreemapNode>,
  areaValueRatio: number,
): TreemapNodeWithArea[] => {
  const ratio = areaValueRatio < 0 ? 0 : areaValueRatio;
  return children.map((child) => {
    const area = child[NODE_VALUE_KEY] * ratio;
    return { ...child, area: isNan(area) || area <= 0 ? 0 : area };
  });
};

const getWorstScore = (row: Row, parentSize: number, aspectRatio: number): number => {
  const parentArea = parentSize * parentSize;
  const rowArea = row.area * row.area;
  const { min, max } = row.items.reduce(
    (result, child) => ({
      min: Math.min(result.min, child.area),
      max: Math.max(result.max, child.area),
    }),
    { min: Infinity, max: 0 },
  );
  return rowArea
    ? Math.max(
        (parentArea * max * aspectRatio) / rowArea,
        rowArea / (parentArea * min * aspectRatio),
      )
    : Infinity;
};

const horizontalPosition = (
  row: Row,
  parentSize: number,
  parentRect: RectanglePosition,
  isFlush: boolean,
): RectanglePosition => {
  let rowHeight = parentSize ? Math.round(row.area / parentSize) : 0;
  if (isFlush || rowHeight > parentRect.height) {
    rowHeight = parentRect.height;
  }
  let curX = parentRect.x;
  let last: TreemapNodeWithArea | undefined;
  for (const child of row.items) {
    child.x = curX;
    child.y = parentRect.y;
    child.height = rowHeight;
    child.width = Math.min(
      rowHeight ? Math.round(child.area / rowHeight) : 0,
      parentRect.x + parentRect.width - curX,
    );
    curX += child.width;
    last = child;
  }
  if (last != null) {
    last.width += parentRect.x + parentRect.width - curX;
  }
  return { ...parentRect, y: parentRect.y + rowHeight, height: parentRect.height - rowHeight };
};

const verticalPosition = (
  row: Row,
  parentSize: number,
  parentRect: RectanglePosition,
  isFlush: boolean,
): RectanglePosition => {
  let rowWidth = parentSize ? Math.round(row.area / parentSize) : 0;
  if (isFlush || rowWidth > parentRect.width) {
    rowWidth = parentRect.width;
  }
  let curY = parentRect.y;
  let last: TreemapNodeWithArea | undefined;
  for (const child of row.items) {
    child.x = parentRect.x;
    child.y = curY;
    child.width = rowWidth;
    child.height = Math.min(
      rowWidth ? Math.round(child.area / rowWidth) : 0,
      parentRect.y + parentRect.height - curY,
    );
    curY += child.height;
    last = child;
  }
  if (last != null) {
    last.height += parentRect.y + parentRect.height - curY;
  }
  return { ...parentRect, x: parentRect.x + rowWidth, width: parentRect.width - rowWidth };
};

const position = (
  row: Row,
  parentSize: number,
  parentRect: RectanglePosition,
  isFlush: boolean,
): RectanglePosition =>
  parentSize === parentRect.width
    ? horizontalPosition(row, parentSize, parentRect, isFlush)
    : verticalPosition(row, parentSize, parentRect, isFlush);

// Recursively arranges a node's children into squarified rows.
const squarify = (
  node: TreemapNode,
  aspectRatio: number,
  nodeInset: number,
  nodeGap: number,
): TreemapNode => {
  const children = node.children;
  if (!children || children.length === 0) {
    return node;
  }
  const layoutRect = insetRect(filterRect(node), nodeInset);
  let rect: RectanglePosition = layoutRect;
  const row: Row = { items: [], area: 0 };
  let best = Infinity;
  let size = Math.min(rect.width, rect.height);
  const scaleChildren = getAreaOfChildren(
    children,
    (rect.width * rect.height) / node[NODE_VALUE_KEY],
  );
  const tempChildren = scaleChildren.slice();

  while (tempChildren.length > 0) {
    const child = tempChildren[0];
    if (child == null) {
      break;
    }
    row.items.push(child);
    row.area += child.area;
    const score = getWorstScore(row, size, aspectRatio);
    if (score <= best) {
      tempChildren.shift();
      best = score;
    } else {
      row.area -= row.items.pop()?.area ?? 0;
      rect = position(row, size, rect, false);
      size = Math.min(rect.width, rect.height);
      row.items.length = 0;
      row.area = 0;
      best = Infinity;
    }
  }
  if (row.items.length > 0) {
    rect = position(row, size, rect, true);
    row.items.length = 0;
    row.area = 0;
  }

  const childrenWithGaps = applyGapToChildren(scaleChildren, layoutRect, nodeGap);
  return {
    ...node,
    children: childrenWithGaps.map((c) => squarify(c, aspectRatio, nodeInset, nodeGap)),
  };
};

/**
 * recharts parity name for the Treemap `content` prop. The port supports the
 * function form only (the upstream element form is a React cloneElement pattern).
 */
export type TreemapContentType = (node: TreemapNode) => JSX.Element;

export interface TreemapProps extends EventThrottlingProps {
  class?: string;
  /** Top-level nodes; wrapped as the children of an implicit root that fills the chart. */
  data?: ReadonlyArray<TreemapDataType>;
  width?: number | Percent;
  height?: number | Percent;
  responsive?: boolean;
  dataKey?: DataKey<unknown>;
  nameKey?: DataKey<unknown>;
  aspectRatio?: number;
  nodeInset?: number;
  nodeGap?: number;
  isAnimationActive?: boolean | "auto";
  isUpdateAnimationActive?: boolean | "auto";
  animationBegin?: number;
  animationDuration?: number;
  animationEasing?: EasingInput;
  fill?: string;
  stroke?: string;
  colorPanel?: ReadonlyArray<string>;
  /**
   * 'flat' (default) renders the whole tree. 'nest' renders an interactive nested
   * treemap: clicking a parent drills in, and a breadcrumb strip navigates back up.
   */
  type?: "flat" | "nest";
  /** Custom breadcrumb-cell renderer for nest mode (function form). */
  nestIndexContent?: (item: TreemapNode, i: number) => JSX.Element;
  /** Custom node renderer (function form). When set, replaces the default rect+label. */
  content?: TreemapContentType;
  onMouseEnter?: (node: TreemapNode, e: MousePointer) => void;
  onMouseLeave?: (node: TreemapNode, e: MousePointer) => void;
  onClick?: (node: TreemapNode) => void;
  children?: JSX.Element;
  id?: string;
}

export const treemapDefaultProps = {
  data: [],
  dataKey: "value",
  nameKey: "name",
  aspectRatio: 0.5 * (1 + Math.sqrt(5)),
  nodeInset: 0,
  nodeGap: 0,
  responsive: false,
  type: "flat",
  isAnimationActive: "auto",
  isUpdateAnimationActive: "auto",
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "linear",
} as const satisfies Partial<TreemapProps>;

const treemapOptions: ChartOptions = {
  chartName: "Treemap",
  defaultTooltipEventType: "item",
  validateTooltipEventTypes: ["item"],
  tooltipPayloadSearcher: treemapPayloadSearcher,
  eventEmitter: undefined,
};

const zeroMargin: Margin = { top: 0, right: 0, bottom: 0, left: 0 };

// Depth-first flatten so all nodes render in a single <For> (whose callback reads
// the For-item, not a reactive prop — avoids the STRICT_READ a recursive component
// hits). Children come after their parent → they paint on top, as recharts intends.
const flattenNodes = (node: TreemapNode | null): TreemapNode[] => {
  if (node == null) {
    return [];
  }
  const out: TreemapNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      out.push(...flattenNodes(child));
    }
  }
  return out;
};

const TreemapImpl = (props: TreemapProps & { id: string }): JSX.Element => {
  const store = useAppStore();
  const merged = merge(treemapDefaultProps, props);
  const width = useChartWidth();
  const height = useChartHeight();

  const dims = (): { width: number; height: number } | undefined => {
    const w = width();
    const h = height();
    return w != null && h != null ? { width: w, height: h } : undefined;
  };

  // Layout a (raw) node as a depth-0 root filling the drawing surface.
  const layoutFrom = (
    node: TreemapDataType | TreemapNode,
    d: { width: number; height: number },
    nestedActiveTooltipIndex: TooltipIndex | undefined,
  ): TreemapNode => {
    // A computed TreemapNode is also valid input to computeNode (it reads name /
    // value / children) — recharts drills in by recomputing from the clicked node.
    const root = computeNode({
      depth: 0,
      node: {
        ...node,
        x: 0,
        y: 0,
        width: d.width,
        height: getTreemapRenderHeight(d.height, merged.type),
      },
      index: 0,
      dataKey: merged.dataKey,
      nameKey: merged.nameKey,
      nestedActiveTooltipIndex,
    });
    return squarify(root, merged.aspectRatio, merged.nodeInset, merged.nodeGap);
  };

  // nest-mode drill stack: each entry is the raw node we computed a root from, plus
  // the nestedActiveTooltipIndex it carried. nestStack[0] is the implicit top root.
  type NestEntry = {
    node: TreemapDataType | TreemapNode;
    nestedActiveTooltipIndex: TooltipIndex | undefined;
  };
  const topEntry = (): NestEntry => ({
    node: { children: merged.data },
    nestedActiveTooltipIndex: undefined,
  });
  const [nestStack, setNestStack] = createSignal<NestEntry[]>([topEntry()]);
  const currentEntry = (): NestEntry => {
    const stack = nestStack();
    return stack[stack.length - 1] ?? topEntry();
  };

  // The fully-laid-out tree for the *current* drill root, recomputed on
  // size / data / layout-param / drill change.
  const formatRoot = createMemo<TreemapNode | null>(() => {
    const d = dims();
    if (d == null) {
      return null;
    }
    const entry = currentEntry();
    return layoutFrom(entry.node, d, entry.nestedActiveTooltipIndex);
  });

  // Breadcrumb entries (computed roots), one per drill level.
  const nestIndex = createMemo<TreemapNode[]>(() => {
    const d = dims();
    if (d == null || merged.type !== "nest") {
      return [];
    }
    return nestStack().map((entry) => layoutFrom(entry.node, d, entry.nestedActiveTooltipIndex));
  });

  // Flat render descriptors with fill/stroke BAKED IN, so the <For> callback reads
  // only the For-item (no accessor/prop reads → no STRICT_READ). In nest mode only
  // the current root + its direct children render (recharts' isCurrentRootChild gate).
  const renderNodes = createMemo<
    Array<{ node: TreemapNode; fill: string; stroke: string; isLeaf: boolean; arrow: boolean }>
  >(() => {
    const panel = merged.colorPanel ?? COLOR_PANEL;
    const stroke = merged.stroke ?? "#fff";
    const root = formatRoot();
    const nest = merged.type === "nest";
    const nodes = nest
      ? root == null
        ? []
        : [root, ...(root.children ?? [])]
      : flattenNodes(root);
    return nodes.map((node) => ({
      node,
      fill: node.depth < 2 ? (panel[node.index % panel.length] ?? "#000") : "rgba(255,255,255,0)",
      stroke,
      isLeaf: !node.children || node.children.length === 0,
      // drill-down arrow on nest children that have their own children.
      arrow:
        nest &&
        node.depth > 0 &&
        node.width > 10 &&
        node.height > 10 &&
        node.children != null &&
        node.children.length > 0,
    }));
  });

  // Augment a node with `id` + `root` (the current computed root) for user handlers,
  // matching recharts' renderNode `{ ...node, root }` plus the registered item id.
  const withRoot = (node: TreemapNode): TreemapNode => ({
    ...node,
    id: props.id,
    root: formatRoot() ?? undefined,
  });

  const activeCoordinate = (node: TreemapNode): Coordinate => ({
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  });
  const onUserMouseEnter = (node: TreemapNode, isLeaf: boolean, e: MousePointer): void => {
    if (isLeaf || merged.type === "nest") {
      merged.onMouseEnter?.(withRoot(node), e);
    }
  };
  const onUserMouseLeave = (node: TreemapNode, isLeaf: boolean, e: MousePointer): void => {
    if (isLeaf || merged.type === "nest") {
      merged.onMouseLeave?.(withRoot(node), e);
    }
  };
  // nest drill-in: clicking a non-root node with children recomputes the root from
  // it. depth === 0 is the current root cell, which must not drill again.
  const onNestClick = (node: TreemapNode): void => {
    if (merged.type === "nest" && node.depth > 0 && node.children && node.children.length > 0) {
      setNestStack((stack) => [...stack, { node, nestedActiveTooltipIndex: node.tooltipIndex }]);
    }
  };
  const onUserClick = (node: TreemapNode, isLeaf: boolean): void => {
    onNestClick(node);
    if (isLeaf || merged.type === "nest") {
      merged.onClick?.(withRoot(node));
    }
  };
  // Breadcrumb click: slice the stack back to that level.
  const onNestIndexClick = (i: number): void => {
    setNestStack((stack) => stack.slice(0, i + 1));
  };
  const onItemMouseEnter = (node: TreemapNode): void => {
    store?.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: node.tooltipIndex,
      activeDataKey: merged.dataKey,
      activeCoordinate: activeCoordinate(node),
      activeGraphicalItemId: props.id,
    });
  };
  const onItemClick = (node: TreemapNode): void => {
    store?.actions.tooltip.setActiveClickItemIndex({
      activeIndex: node.tooltipIndex,
      activeDataKey: merged.dataKey,
      activeCoordinate: activeCoordinate(node),
      activeGraphicalItemId: props.id,
    });
  };

  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: formatRoot() ?? undefined,
    getPosition: (index) => {
      const node = treemapPayloadSearcher(formatRoot(), normalizeTreemapTooltipIndex(index));
      if (!isObj(node)) {
        return undefined;
      }
      return {
        x: toNum(node.x) + toNum(node.width) / 2,
        y: toNum(node.y) + toNum(node.height) / 2,
      };
    },
    settings: {
      stroke: merged.stroke,
      strokeWidth: undefined,
      fill: merged.fill,
      nameKey: merged.nameKey,
      dataKey: merged.dataKey,
      name: undefined,
      hide: false,
      type: undefined,
      color: merged.fill,
      unit: "",
      graphicalItemId: props.id,
    },
  }));

  const layerClass = (): string =>
    ["recharts-treemap", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  // Captured once (a render prop rarely changes); reading it in the <For> callback
  // would be an untracked prop read.
  const content = merged.content;
  const nestIndexContent = merged.nestIndexContent;

  const handleTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch == null || document.elementFromPoint == null) {
      return;
    }
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target == null || !("getAttribute" in target)) {
      return;
    }
    const itemIndex = target.getAttribute(DATA_ITEM_INDEX_ATTRIBUTE_NAME);
    const root = formatRoot();
    if (itemIndex == null || root == null) {
      return;
    }
    const activeNode = treemapPayloadSearcher(root, itemIndex);
    if (!isTreemapNode(activeNode)) {
      return;
    }
    store?.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: itemIndex,
      activeDataKey: merged.dataKey,
      activeCoordinate: {
        x: activeNode.x + activeNode.width / 2,
        y: activeNode.y + activeNode.height / 2,
      },
      activeGraphicalItemId: props.id,
    });
  };

  return (
    <Show when={dims()}>
      {(d) => (
        <>
          <Surface
            width={d().width}
            height={getTreemapRenderHeight(d().height, merged.type)}
            onTouchMove={handleTouchMove}
          >
            <Layer class={layerClass()}>
              <For each={renderNodes()}>
                {(item) => {
                  // The interactive node body (handler layer + rect/label, or custom
                  // content) is created ONCE. recharts slides each node in from the
                  // left (transform translate(-x-width,0)→translate(0,0)); the animated
                  // style lives on the recreated depth layer while `body` keeps a stable
                  // DOM identity (Solid moves it, doesn't recreate) — so the rect's
                  // handlers/refs survive the per-frame re-renders. isActive=false renders
                  // the settled transform statically.
                  const body = (
                    // The inner layer (plain recharts-layer g) carries the handlers —
                    // recharts' TreemapItem structure, `.recharts-treemap-depth-N g`.
                    <Layer
                      onMouseEnter={(e) => {
                        onUserMouseEnter(item.node, item.isLeaf, e);
                        // jsdom does not bubble mouseenter from the rect; layer enter drives tooltips.
                        onItemMouseEnter(item.node);
                      }}
                      // mouseenter does not bubble, so function-form custom content (whose
                      // user element carries no handler) wouldn't activate the tooltip.
                      // mousemove DOES bubble up from the child to this layer → drive the
                      // item tooltip here too (idempotent with the default rect's handler).
                      onMouseMove={() => onItemMouseEnter(item.node)}
                      onMouseLeave={(e) => onUserMouseLeave(item.node, item.isLeaf, e)}
                      onClick={() => onUserClick(item.node, item.isLeaf)}
                    >
                      {content ? (
                        content(item.node)
                      ) : (
                        <>
                          <Rectangle
                            fill={item.fill}
                            stroke={item.stroke}
                            x={item.node.x}
                            y={item.node.y}
                            width={item.node.width}
                            height={item.node.height}
                            data-recharts-item-index={item.node.tooltipIndex}
                            data-recharts-item-id={props.id}
                            onMouseEnter={() => onItemMouseEnter(item.node)}
                            onClick={() => onItemClick(item.node)}
                          />
                          {item.arrow ? (
                            <Polygon
                              points={[
                                { x: item.node.x + 2, y: item.node.y + item.node.height / 2 },
                                { x: item.node.x + 6, y: item.node.y + item.node.height / 2 + 3 },
                                { x: item.node.x + 2, y: item.node.y + item.node.height / 2 + 6 },
                              ]}
                            />
                          ) : null}
                          {item.node.width > 20 && item.node.height > 20 ? (
                            <text
                              x={item.node.x + 8}
                              y={item.node.y + item.node.height / 2 + 7}
                              font-size="14"
                            >
                              {item.node.name}
                            </text>
                          ) : null}
                        </>
                      )}
                    </Layer>
                  );
                  return (
                    <CSSTransitionAnimate
                      animationId={`treemap-${props.id}-${item.node.tooltipIndex}`}
                      from={`translate(${-item.node.x - item.node.width}px, 0px)`}
                      to="translate(0px, 0px)"
                      attributeName="transform"
                      begin={merged.animationBegin}
                      easing={
                        typeof merged.animationEasing === "string"
                          ? merged.animationEasing
                          : undefined
                      }
                      isActive={merged.isAnimationActive}
                      duration={merged.animationDuration}
                    >
                      {(style) => (
                        <Layer
                          class={`recharts-treemap-depth-${item.node.depth}`}
                          style={{
                            transform: style.transform,
                            transition: style.transition,
                            "transform-origin": `${item.node.x}px ${item.node.y}px`,
                          }}
                        >
                          {body}
                        </Layer>
                      )}
                    </CSSTransitionAnimate>
                  );
                }}
              </For>
            </Layer>
            <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
            {merged.children}
          </Surface>
          {merged.type === "nest" ? (
            <div
              class="recharts-treemap-nest-index-wrapper"
              style={{ "margin-top": "8px", "text-align": "center" }}
            >
              <For each={nestIndex()}>
                {(item, i) => (
                  <div
                    class="recharts-treemap-nest-index-box"
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      padding: "0 7px",
                      background: "#000",
                      color: "#fff",
                      "margin-right": "3px",
                    }}
                    onClick={() => onNestIndexClick(i())}
                  >
                    {nestIndexContent ? nestIndexContent(item, i()) : item.name || "root"}
                  </div>
                )}
              </For>
            </div>
          ) : null}
        </>
      )}
    </Show>
  );
};

/**
 * A hierarchical chart that packs the tree into nested, area-proportional
 * rectangles (a squarified treemap).
 */
export const Treemap = (props: TreemapProps): JSX.Element => {
  const id = useUniqueId("recharts-treemap", props.id);
  return (
    <RechartsStoreProvider
      preloadedState={{ options: treemapOptions } satisfies Partial<RechartsRootState>}
    >
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
      >
        <TreemapImpl {...props} id={id} />
      </RechartsWrapper>
    </RechartsStoreProvider>
  );
};
