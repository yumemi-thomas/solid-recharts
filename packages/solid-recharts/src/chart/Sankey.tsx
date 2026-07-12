// Ported from recharts 3.8.1 src/chart/Sankey.tsx (commit 7a23854).
//
// A flow diagram: nodes (Rectangles) connected by value-weighted link ribbons
// (cubic-Bézier paths). The layout (computeData) is recharts' custom iterative
// relaxation — getNodesTree assigns depth/x, updateYOfTree sizes by value,
// resolveCollisions + relax{Left,Right} settle the y positions, updateYOfLinks
// stacks link endpoints — ported verbatim (the in-place mutation operates on the
// working copies the maps create, so it stays local). Self-contained — owns its store.
// Includes the v3.9.1 layout fixes: updateDepthOfTargets prunes non-growing depth
// recursion (52a2a89) and resolveNodeLinkCollisions nudges nodes out of
// skipped-depth link bands (0663afe).
//
// Solid deviations: `resolveDefaultProps`→`merge`; `useAppDispatch`→`useAppStore`;
// `RegisterGraphicalItemId`→`useUniqueId`; es-toolkit `maxBy`/`sumBy`/`get`→inline;
// the layout output is flattened into node/link prop arrays rendered by a single
// `<For>` each (For-item reads → no STRICT_READ). Custom function-form node/link
// renderers ARE wired (element form is N/A — no cloneElement). `nameKey` resolves
// through getValueByDataKey in the payload searcher (reference parity).
// NON-GAPS: the reference Sankey has NO animation and hardcodes responsive={false}
// on its wrapper (ResponsiveContainer sizing flows via the wrapper context).
import { createEffect, createMemo, For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Surface } from "../container/Surface";
import { Layer } from "../container/Layer";
import { Rectangle } from "../shape/Rectangle";
import { RechartsWrapper } from "./RechartsWrapper";
import { RechartsStoreProvider } from "../state/RechartsStoreProvider";
import { ReportChartMargin, useChartHeight, useChartWidth } from "../context/chartLayoutContext";
import { ReportEventSettings } from "../state/ReportEventSettings";
import { SetTooltipEntrySettings } from "../state/SetTooltipEntrySettings";
import { useAppStore } from "../state/hooks";
import { useUniqueId } from "../util/useUniqueId";
import { isNotNil } from "../util/DataUtils";
import { getValueByDataKey } from "../util/ChartUtils";
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

// ---- Types ----
interface LinkDataItem {
  source: number;
  target: number;
  value: number;
}
interface LinkDataItemDy extends LinkDataItem {
  dy: number;
  sy?: number;
  ty?: number;
}

export interface SankeyNode {
  dx: number;
  dy: number;
  name: string;
  value: number;
  x: number;
  y: number;
  depth: number;
  targetNodes: number[];
  targetLinks: number[];
  sourceNodes: number[];
  sourceLinks: number[];
  [k: string]: unknown;
}

export interface SankeyLink {
  target: number;
  source: number;
  value: number;
  sy: number;
  dy: number;
  ty: number;
}

export interface SankeyData {
  nodes: ReadonlyArray<{ name?: string; [k: string]: unknown }>;
  links: LinkDataItem[];
}

export interface NodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: SankeyNode;
}

export interface LinkProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  sourceRelativeY: number;
  targetRelativeY: number;
  linkWidth: number;
  index: number;
  // payload is the link with source/target replaced by the resolved node objects.
  payload: {
    source: SankeyNode;
    target: SankeyNode;
    value: number;
    dy: number;
    sy?: number;
    ty?: number;
  };
}

export type SankeyNodeProps = NodeProps;
export type SankeyLinkProps = LinkProps;
export type SankeyElementType = "node" | "link";

/**
 * The type of the Sankey `node` prop — recharts parity name. Upstream also accepts
 * a ReactElement / props-object form; the Solid port supports the function form.
 */
export type SankeyNodeOptions = (props: NodeProps) => JSX.Element;

type SankeyVerticalAlign = "justify" | "top";
type SankeyHorizontalAlign = "left" | "justify";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v != null;
const isArr = (v: unknown): v is ReadonlyArray<unknown> => Array.isArray(v);

// ---- Pure layout (ported verbatim) ----
const interpolationGenerator = (a: number, b: number) => {
  const ka = +a;
  const kb = b - ka;
  return (t: number) => ka + kb * t;
};
const centerY = (node: SankeyNode): number => node.y + node.dy / 2;

const cubicValue = (
  start: number,
  control1: number,
  control2: number,
  end: number,
  t: number,
): number => {
  const inverseT = 1 - t;
  return (
    inverseT ** 3 * start +
    3 * inverseT ** 2 * t * control1 +
    3 * inverseT * t ** 2 * control2 +
    t ** 3 * end
  );
};
const getValue = (entry: { value?: number } | undefined): number => (entry && entry.value) || 0;
const getSumOfIds = (links: ReadonlyArray<LinkDataItem>, ids: number[]): number =>
  ids.reduce((result, id) => result + getValue(links[id]), 0);
const sumBy = <T,>(arr: ReadonlyArray<T>, fn: (x: T) => number): number =>
  arr.reduce((s, x) => s + fn(x), 0);

const getSumWithWeightedSource = (
  tree: ReadonlyArray<SankeyNode>,
  links: ReadonlyArray<LinkDataItemDy>,
  ids: number[],
): number =>
  ids.reduce((result, id) => {
    const link = links[id];
    if (link == null) {
      return result;
    }
    const sourceNode = tree[link.source];
    if (sourceNode == null) {
      return result;
    }
    return result + centerY(sourceNode) * getValue(links[id]);
  }, 0);

const getSumWithWeightedTarget = (
  tree: ReadonlyArray<SankeyNode>,
  links: ReadonlyArray<LinkDataItemDy>,
  ids: ReadonlyArray<number>,
): number =>
  ids.reduce((result, id) => {
    const link = links[id];
    if (link == null) {
      return result;
    }
    const targetNode = tree[link.target];
    if (targetNode == null) {
      return result;
    }
    return result + centerY(targetNode) * getValue(links[id]);
  }, 0);

const ascendingY = (a: { y: number }, b: { y: number }): number => a.y - b.y;

const searchTargetsAndSources = (links: LinkDataItem[], id: number) => {
  const sourceNodes: number[] = [];
  const sourceLinks: number[] = [];
  const targetNodes: number[] = [];
  const targetLinks: number[] = [];
  for (let i = 0, len = links.length; i < len; i++) {
    const link = links[i];
    if (link?.source === id) {
      targetNodes.push(link.target);
      targetLinks.push(i);
    }
    if (link?.target === id) {
      sourceNodes.push(link.source);
      sourceLinks.push(i);
    }
  }
  return { sourceNodes, sourceLinks, targetLinks, targetNodes };
};

const updateDepthOfTargets = (tree: SankeyNode[], curNode: SankeyNode): void => {
  const { targetNodes } = curNode;
  for (let i = 0, len = targetNodes.length; i < len; i++) {
    const targetNode = targetNodes[i];
    if (targetNode == null) {
      continue;
    }
    const target = tree[targetNode];
    if (target) {
      const newDepth = curNode.depth + 1;
      /*
       * Only recurse when the depth grows. Depth is the longest path to a node, so once it stops
       * increasing the subtree is already up to date; without this guard every path through the
       * graph is walked separately, which explodes combinatorially on dense graphs.
       */
      if (newDepth > target.depth) {
        target.depth = newDepth;
        updateDepthOfTargets(tree, target);
      }
    }
  }
};

const getNodesTree = (
  { nodes, links }: SankeyData,
  width: number,
  nodeWidth: number,
  align: SankeyHorizontalAlign,
): { tree: SankeyNode[]; maxDepth: number } => {
  const tree: SankeyNode[] = nodes.map((entry, index): SankeyNode => {
    const result = searchTargetsAndSources(links, index);
    return {
      ...entry,
      ...result,
      name: typeof entry.name === "string" ? entry.name : "",
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      value: Math.max(
        getSumOfIds(links, result.sourceLinks),
        getSumOfIds(links, result.targetLinks),
      ),
      depth: 0,
    };
  });
  for (let i = 0, len = tree.length; i < len; i++) {
    const node = tree[i];
    if (node != null && !node.sourceNodes.length) {
      updateDepthOfTargets(tree, node);
    }
  }
  const maxDepth = tree.reduce((m, e) => (e.depth > m ? e.depth : m), 0);
  if (maxDepth >= 1) {
    const childWidth = (width - nodeWidth) / maxDepth;
    for (let i = 0, len = tree.length; i < len; i++) {
      const node = tree[i];
      if (node == null) {
        continue;
      }
      if (!node.targetNodes.length && align === "justify") {
        node.depth = maxDepth;
      }
      node.x = node.depth * childWidth;
      node.dx = nodeWidth;
    }
  }
  return { tree, maxDepth };
};

const getDepthTree = (tree: SankeyNode[]): SankeyNode[][] => {
  const result: SankeyNode[][] = [];
  for (let i = 0, len = tree.length; i < len; i++) {
    const node = tree[i];
    if (node == null) {
      continue;
    }
    if (!result[node.depth]) {
      result[node.depth] = [];
    }
    result[node.depth]?.push(node);
  }
  return result;
};

const updateYOfTree = (
  depthTree: SankeyNode[][],
  height: number,
  nodePadding: number,
  links: ReadonlyArray<LinkDataItem>,
  verticalAlign: SankeyVerticalAlign,
): LinkDataItemDy[] => {
  let yRatio = Math.min(
    ...depthTree.map((nodes) => {
      const sum = sumBy(nodes, getValue);
      return sum === 0 ? Infinity : (height - (nodes.length - 1) * nodePadding) / sum;
    }),
  );
  if (yRatio === Infinity) {
    yRatio = 0;
  }
  for (let d = 0, maxDepth = depthTree.length; d < maxDepth; d++) {
    const nodes = depthTree[d];
    if (nodes == null) {
      continue;
    }
    if (verticalAlign === "top") {
      let currentY = 0;
      for (const node of nodes) {
        node.dy = node.value * yRatio;
        node.y = currentY;
        currentY += node.dy + nodePadding;
      }
    } else {
      for (let i = 0, len = nodes.length; i < len; i++) {
        const node = nodes[i];
        if (node == null) {
          continue;
        }
        node.y = i;
        node.dy = node.value * yRatio;
      }
    }
  }
  return links.map((link): LinkDataItemDy => ({ ...link, dy: getValue(link) * yRatio }));
};

const resolveCollisions = (
  depthTree: SankeyNode[][],
  height: number,
  nodePadding: number,
  sort = true,
): void => {
  for (const nodes of depthTree) {
    if (nodes == null) {
      continue;
    }
    const n = nodes.length;
    if (sort) {
      nodes.sort(ascendingY);
    }
    let y0 = 0;
    for (let j = 0; j < n; j++) {
      const node = nodes[j];
      if (node == null) {
        continue;
      }
      const dy = y0 - node.y;
      if (dy > 0) {
        node.y += dy;
      }
      y0 = node.y + node.dy + nodePadding;
    }
    y0 = height + nodePadding;
    for (let j = n - 1; j >= 0; j--) {
      const node = nodes[j];
      if (node == null) {
        continue;
      }
      const dy = node.y + node.dy + nodePadding - y0;
      if (dy > 0) {
        node.y -= dy;
        y0 = node.y;
      } else {
        break;
      }
    }
  }
};

const relaxLeftToRight = (
  tree: ReadonlyArray<SankeyNode>,
  depthTree: SankeyNode[][],
  links: ReadonlyArray<LinkDataItemDy>,
  alpha: number,
): void => {
  for (const nodes of depthTree) {
    if (nodes == null) {
      continue;
    }
    for (const node of nodes) {
      if (node.sourceLinks.length) {
        const sourceSum = getSumOfIds(links, node.sourceLinks);
        const weightedSum = getSumWithWeightedSource(tree, links, node.sourceLinks);
        const y = sourceSum === 0 ? centerY(node) : weightedSum / sourceSum;
        node.y += (y - centerY(node)) * alpha;
      }
    }
  }
};

const relaxRightToLeft = (
  tree: ReadonlyArray<SankeyNode>,
  depthTree: SankeyNode[][],
  links: ReadonlyArray<LinkDataItemDy>,
  alpha: number,
): void => {
  for (let i = depthTree.length - 1; i >= 0; i--) {
    const nodes = depthTree[i];
    if (nodes == null) {
      continue;
    }
    for (const node of nodes) {
      if (node.targetLinks.length) {
        const targetSum = getSumOfIds(links, node.targetLinks);
        const weightedSum = getSumWithWeightedTarget(tree, links, node.targetLinks);
        const y = targetSum === 0 ? centerY(node) : weightedSum / targetSum;
        node.y += (y - centerY(node)) * alpha;
      }
    }
  }
};

const updateYOfLinks = (tree: SankeyNode[], links: LinkDataItemDy[]): void => {
  for (const node of tree) {
    let sy = 0;
    let ty = 0;
    node.targetLinks.sort(
      (a, b) => (tree[links[a]?.target ?? -1]?.y ?? 0) - (tree[links[b]?.target ?? -1]?.y ?? 0),
    );
    node.sourceLinks.sort(
      (a, b) => (tree[links[a]?.source ?? -1]?.y ?? 0) - (tree[links[b]?.source ?? -1]?.y ?? 0),
    );
    for (const targetLink of node.targetLinks) {
      const link = links[targetLink];
      if (link) {
        link.sy = sy;
        sy += link.dy;
      }
    }
    for (const sourceLink of node.sourceLinks) {
      const link = links[sourceLink];
      if (link) {
        link.ty = ty;
        ty += link.dy;
      }
    }
  }
};

const getLinkYAtX = (
  sourceNode: SankeyNode,
  targetNode: SankeyNode,
  link: LinkDataItemDy,
  x: number,
): number => {
  const sourceX = sourceNode.x + sourceNode.dx;
  const targetX = targetNode.x;
  const progress = targetX === sourceX ? 0 : (x - sourceX) / (targetX - sourceX);
  const boundedProgress = Math.min(Math.max(progress, 0), 1);
  const sourceY = sourceNode.y + (link.sy ?? 0) + link.dy / 2;
  const targetY = targetNode.y + (link.ty ?? 0) + link.dy / 2;

  return cubicValue(sourceY, sourceY, targetY, targetY, boundedProgress);
};

const resolveNodeLinkCollisions = (
  tree: SankeyNode[],
  depthTree: SankeyNode[][],
  links: LinkDataItemDy[],
  height: number,
  nodePadding: number,
): void => {
  const depthByNode = new Map<SankeyNode, number>();

  for (let depth = 0; depth < depthTree.length; depth++) {
    const nodes = depthTree[depth];
    if (nodes == null) {
      continue;
    }

    for (const node of nodes) {
      depthByNode.set(node, depth);
    }
  }

  for (let depth = 0; depth < depthTree.length; depth++) {
    const nodes = depthTree[depth];
    if (nodes == null || nodes.length === 0) {
      continue;
    }

    const depthX = nodes[0] == null ? undefined : nodes[0].x + nodes[0].dx / 2;
    if (depthX == null) {
      continue;
    }

    const fixedObstacles = links.flatMap((link) => {
      const sourceNode = tree[link.source];
      const targetNode = tree[link.target];
      if (sourceNode == null || targetNode == null) {
        return [];
      }

      const sourceDepth = depthByNode.get(sourceNode);
      const targetDepth = depthByNode.get(targetNode);
      if (sourceDepth == null || targetDepth == null) {
        return [];
      }

      if (
        depth <= Math.min(sourceDepth, targetDepth) ||
        depth >= Math.max(sourceDepth, targetDepth)
      ) {
        return [];
      }

      const y = getLinkYAtX(sourceNode, targetNode, link, depthX) - link.dy / 2;
      return [{ y, dy: link.dy, fixed: true as const }];
    });

    const containedNodeObstacles = fixedObstacles.filter((obstacle) =>
      nodes.some((node) => node.y >= obstacle.y && node.y + node.dy <= obstacle.y + obstacle.dy),
    );

    if (containedNodeObstacles.length === 0) {
      continue;
    }

    type CollisionItem =
      | { node: SankeyNode; fixed: false }
      | { y: number; dy: number; fixed: true };
    const getItemY = (item: CollisionItem): number => (item.fixed ? item.y : item.node.y);
    const getItemHeight = (item: CollisionItem): number => (item.fixed ? item.dy : item.node.dy);
    let items: CollisionItem[] = [
      ...nodes.map((node) => ({ node, fixed: false as const })),
      ...containedNodeObstacles,
    ].sort((a, b) => getItemY(a) - getItemY(b));

    let nextY = 0;
    for (const item of items) {
      if (item.fixed) {
        nextY = Math.max(nextY, item.y + item.dy + nodePadding);
        continue;
      }

      if (item.node.y < nextY) {
        item.node.y = nextY;
      }
      nextY = item.node.y + item.node.dy + nodePadding;
    }

    items = items.sort((a, b) => getItemY(a) - getItemY(b));

    let previousY = height + nodePadding;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item == null) {
        continue;
      }

      if (item.fixed) {
        previousY = Math.min(previousY, item.y - nodePadding);
        continue;
      }

      // This backward pass only keeps moved nodes within the chart bounds.
      // It intentionally does not iterate again against fixed obstacles above,
      // because this fix is scoped to the fully-contained skipped-depth case.
      const dy = item.node.y + getItemHeight(item) + nodePadding - previousY;
      if (dy > 0) {
        item.node.y -= dy;
      }
      previousY = item.node.y;
    }
  }
};

export const computeData = ({
  data,
  width,
  height,
  iterations,
  nodeWidth,
  nodePadding,
  sort,
  verticalAlign,
  align,
}: {
  data: SankeyData;
  width: number;
  height: number;
  iterations: number;
  nodeWidth: number;
  nodePadding: number;
  sort: boolean;
  verticalAlign: SankeyVerticalAlign;
  align: SankeyHorizontalAlign;
}): { nodes: SankeyNode[]; links: LinkDataItemDy[] } => {
  const { links } = data;
  const { tree } = getNodesTree(data, width, nodeWidth, align);
  const depthTree = getDepthTree(tree);
  const linksWithDy = updateYOfTree(depthTree, height, nodePadding, links, verticalAlign);
  resolveCollisions(depthTree, height, nodePadding, sort);
  if (verticalAlign === "justify") {
    let alpha = 1;
    for (let i = 1; i <= iterations; i++) {
      relaxRightToLeft(tree, depthTree, linksWithDy, (alpha *= 0.99));
      resolveCollisions(depthTree, height, nodePadding, sort);
      relaxLeftToRight(tree, depthTree, linksWithDy, alpha);
      resolveCollisions(depthTree, height, nodePadding, sort);
    }
  }
  updateYOfLinks(tree, linksWithDy);
  resolveNodeLinkCollisions(tree, depthTree, linksWithDy, height, nodePadding);
  updateYOfLinks(tree, linksWithDy);
  return { nodes: tree, links: linksWithDy };
};

const buildLinkProps = (
  link: LinkDataItemDy,
  nodes: ReadonlyArray<SankeyNode>,
  left: number,
  top: number,
  i: number,
  linkCurvature: number,
): LinkProps | undefined => {
  const sourceNode = nodes[link.source];
  const targetNode = nodes[link.target];
  if (sourceNode == null || targetNode == null) {
    return undefined;
  }
  const linkWidth = link.dy;
  const sourceRelativeY = link.sy ?? 0;
  const targetRelativeY = link.ty ?? 0;
  const sourceX = sourceNode.x + sourceNode.dx + left;
  const targetX = targetNode.x + left;
  const interp = interpolationGenerator(sourceX, targetX);
  return {
    sourceX,
    targetX,
    sourceY: sourceNode.y + sourceRelativeY + linkWidth / 2 + top,
    targetY: targetNode.y + targetRelativeY + linkWidth / 2 + top,
    sourceControlX: interp(linkCurvature),
    targetControlX: interp(1 - linkCurvature),
    sourceRelativeY,
    targetRelativeY,
    linkWidth,
    index: i,
    payload: { ...link, source: sourceNode, target: targetNode },
  };
};

const buildNodeProps = (node: SankeyNode, left: number, top: number, i: number): NodeProps => ({
  x: node.x + left,
  y: node.y + top,
  width: node.dx,
  height: node.dy,
  index: i,
  payload: node,
});

// activeIndex is `node-{i}` / `link-{i}`; resolve against the stored computed data.
export const sankeyPayloadSearcher: TooltipPayloadSearcher = (
  _data: unknown,
  activeIndex: TooltipIndex,
  computedData?: unknown,
  nameKey?: DataKey<unknown>,
): unknown => {
  if (activeIndex == null || typeof activeIndex !== "string") {
    return undefined;
  }
  if (!isObj(computedData)) {
    return undefined;
  }
  const [targetType, index] = activeIndex.split("-");
  const arr =
    targetType === "node"
      ? computedData.nodes
      : targetType === "link"
        ? computedData.links
        : undefined;
  const item = isArr(arr) ? arr[Number(index)] : undefined;
  if (!isObj(item) || !isObj(item.payload)) {
    return undefined;
  }
  const payload = item.payload;
  // Shape the result as {payload, name, value} so combineTooltipPayload can read
  // `value` (dataKey) and `name` — names resolve through the user's `nameKey`
  // (reference getPayloadOfTooltip: getValueByDataKey(payload, nameKey, '')),
  // falling back to "name" when no nameKey reaches the searcher.
  const resolveName = (target: unknown): unknown =>
    getValueByDataKey(target, nameKey ?? "name", "");
  if (targetType === "node") {
    return { payload, name: resolveName(payload), value: payload.value };
  }
  const source = isObj(payload.source) ? resolveName(payload.source) : undefined;
  const target = isObj(payload.target) ? resolveName(payload.target) : undefined;
  return { payload, name: `${String(source)} - ${String(target)}`, value: payload.value };
};

export interface SankeyProps extends EventThrottlingProps {
  class?: string;
  data: SankeyData;
  width?: number | Percent;
  height?: number | Percent;
  responsive?: boolean;
  nameKey?: DataKey<unknown>;
  dataKey?: DataKey<unknown>;
  nodePadding?: number;
  nodeWidth?: number;
  linkCurvature?: number;
  iterations?: number;
  margin?: Partial<Margin>;
  sort?: boolean;
  align?: SankeyHorizontalAlign;
  verticalAlign?: SankeyVerticalAlign;
  /** Custom node renderer (function form). Receives the laid-out node props. */
  node?: SankeyNodeOptions;
  /** Custom link renderer (function form). Receives the laid-out link props. */
  link?: (props: LinkProps) => JSX.Element;
  onMouseEnter?: (item: NodeProps | LinkProps, type: SankeyElementType, e: MousePointer) => void;
  onMouseLeave?: (item: NodeProps | LinkProps, type: SankeyElementType, e: MousePointer) => void;
  onClick?: (item: NodeProps | LinkProps, type: SankeyElementType, e: MousePointer) => void;
  // Accepted (from the SVG container in recharts) but intentionally not wired —
  // the Sankey only dispatches enter/leave/click on nodes and links.
  onMouseMove?: (e: MousePointer) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
  children?: JSX.Element;
  id?: string;
}

export const sankeyDefaultProps = {
  align: "justify",
  dataKey: "value",
  iterations: 32,
  linkCurvature: 0.5,
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
  nameKey: "name",
  nodePadding: 10,
  nodeWidth: 10,
  sort: true,
  verticalAlign: "justify",
  responsive: false,
} as const satisfies Partial<SankeyProps>;

const sankeyOptions: ChartOptions = {
  chartName: "Sankey",
  defaultTooltipEventType: "item",
  validateTooltipEventTypes: ["item"],
  tooltipPayloadSearcher: sankeyPayloadSearcher,
  eventEmitter: undefined,
};

const SankeyImpl = (props: SankeyProps & { id: string }): JSX.Element => {
  const store = useAppStore();
  const merged = merge(sankeyDefaultProps, props);
  const width = useChartWidth();
  const height = useChartHeight();

  const dims = (): { width: number; height: number } | undefined => {
    const w = width();
    const h = height();
    return w != null && h != null && w > 0 && h > 0 ? { width: w, height: h } : undefined;
  };

  const computed = createMemo<{ nodes: NodeProps[]; links: LinkProps[] }>(() => {
    const d = dims();
    const data = merged.data;
    if (d == null || data == null || !data.links || !data.nodes) {
      return { nodes: [], links: [] };
    }
    const margin = merged.margin;
    const contentWidth = d.width - (margin.left ?? 0) - (margin.right ?? 0);
    const contentHeight = d.height - (margin.top ?? 0) - (margin.bottom ?? 0);
    const layout = computeData({
      data,
      width: contentWidth,
      height: contentHeight,
      iterations: merged.iterations,
      nodeWidth: merged.nodeWidth,
      nodePadding: merged.nodePadding,
      sort: merged.sort,
      verticalAlign: merged.verticalAlign,
      align: merged.align,
    });
    const top = margin.top ?? 0;
    const left = margin.left ?? 0;
    const links = layout.links
      .map((l, i) => buildLinkProps(l, layout.nodes, left, top, i, merged.linkCurvature))
      .filter(isNotNil);
    const nodes = layout.nodes.map((n, i) => buildNodeProps(n, left, top, i));
    return { nodes, links };
  });

  // Publish the computed data so the tooltip searcher can resolve node-/link-N.
  createEffect(
    () => ({ nodes: computed().nodes, links: computed().links }),
    (cd) => store?.actions.chartData.setComputedData(cd),
  );

  const dispatchEnter = (index: TooltipIndex, coord: Coordinate): void => {
    store?.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: index,
      activeDataKey: merged.dataKey,
      activeCoordinate: coord,
      activeGraphicalItemId: props.id,
    });
  };
  const dispatchClick = (index: TooltipIndex, coord: Coordinate): void => {
    store?.actions.tooltip.setActiveClickItemIndex({
      activeIndex: index,
      activeDataKey: merged.dataKey,
      activeCoordinate: coord,
      activeGraphicalItemId: props.id,
    });
  };

  const tooltipConfig = createMemo<TooltipPayloadConfiguration>(() => ({
    dataDefinedOnItem: merged.data,
    getPosition: (index) => {
      const key = String(index);
      const nodes = computed().nodes;
      const node = nodes.find((n) => `node-${n.index}` === key) ?? nodes[Number(key)];
      if (node == null) {
        return undefined;
      }
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    },
    settings: {
      stroke: undefined,
      strokeWidth: undefined,
      fill: "#0088fe",
      nameKey: merged.nameKey,
      dataKey: merged.dataKey,
      name: undefined,
      hide: false,
      type: undefined,
      color: "#0088fe",
      unit: "",
      graphicalItemId: props.id,
    },
  }));

  const layerClass = (): string =>
    ["recharts-sankey", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  return (
    <Show when={dims()}>
      {(d) => (
        <Surface width={d().width} height={d().height}>
          <Layer class={layerClass()}>
            <Layer class="recharts-sankey-links">
              <For each={computed().links}>
                {(lp) => {
                  const coord: Coordinate = {
                    x: (lp.sourceX + lp.targetX) / 2,
                    y: (lp.sourceY + lp.targetY) / 2,
                  };
                  const onMouseEnter = (e: MousePointer): void => {
                    merged.onMouseEnter?.(lp, "link", e);
                    dispatchEnter(`link-${lp.index}`, coord);
                  };
                  const onMouseLeave = (e: MousePointer): void => {
                    merged.onMouseLeave?.(lp, "link", e);
                    store?.actions.tooltip.mouseLeaveItem();
                  };
                  const onClick = (e: MousePointer): void => {
                    merged.onClick?.(lp, "link", e);
                    dispatchClick(`link-${lp.index}`, coord);
                  };
                  return typeof merged.link === "function" ? (
                    <g
                      class="recharts-sankey-link"
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={onClick}
                    >
                      {merged.link(lp)}
                    </g>
                  ) : (
                    <path
                      class="recharts-sankey-link"
                      d={`M${lp.sourceX},${lp.sourceY}C${lp.sourceControlX},${lp.sourceY} ${lp.targetControlX},${lp.targetY} ${lp.targetX},${lp.targetY}`}
                      fill="none"
                      stroke="#333"
                      stroke-width={lp.linkWidth}
                      stroke-opacity="0.2"
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={onClick}
                    />
                  );
                }}
              </For>
            </Layer>
            <Layer class="recharts-sankey-nodes">
              <For each={computed().nodes}>
                {(np) => {
                  const coord: Coordinate = {
                    x: np.x + np.width / 2,
                    y: np.y + np.height / 2,
                  };
                  const onMouseEnter = (e: MousePointer): void => {
                    merged.onMouseEnter?.(np, "node", e);
                    dispatchEnter(`node-${np.index}`, coord);
                  };
                  const onMouseLeave = (e: MousePointer): void => {
                    merged.onMouseLeave?.(np, "node", e);
                    store?.actions.tooltip.mouseLeaveItem();
                  };
                  const onClick = (e: MousePointer): void => {
                    merged.onClick?.(np, "node", e);
                    dispatchClick(`node-${np.index}`, coord);
                  };
                  // Custom function-form node: render its output inside an
                  // event-handling <g> (events stay on the wrapper, mirroring recharts).
                  return typeof merged.node === "function" ? (
                    <g
                      class="recharts-sankey-node"
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={onClick}
                    >
                      {merged.node(np)}
                    </g>
                  ) : (
                    <Rectangle
                      class="recharts-sankey-node"
                      fill="#0088fe"
                      fill-opacity="0.8"
                      x={np.x}
                      y={np.y}
                      width={np.width}
                      height={np.height}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={onClick}
                    />
                  );
                }}
              </For>
            </Layer>
          </Layer>
          <SetTooltipEntrySettings tooltipEntrySettings={tooltipConfig()} />
          {merged.children}
        </Surface>
      )}
    </Show>
  );
};

/**
 * A flow diagram: value-weighted ribbons connect nodes laid out by an iterative
 * relaxation, conveying how quantities split and merge across stages.
 */
export const Sankey = (props: SankeyProps): JSX.Element => {
  const id = useUniqueId("recharts-sankey", props.id);
  const margin = (): Partial<Margin> => props.margin ?? sankeyDefaultProps.margin;
  return (
    <RechartsStoreProvider
      preloadedState={{ options: sankeyOptions } satisfies Partial<RechartsRootState>}
    >
      <ReportChartMargin margin={margin()} />
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
        <SankeyImpl {...props} id={id} />
      </RechartsWrapper>
    </RechartsStoreProvider>
  );
};
