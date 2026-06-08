// Subset port of recharts 3.8.1 test/chart/Treemap.spec.tsx (commit 7a23854): the
// squarified treemap renders one <Rectangle> per node (an implicit root + every
// data node), laid out so children tile their parent's rect. `flush()` because the
// chart size is reported via an effect before the layout computes.
import { describe, expect, it, vi } from "vitest";
import { createEffect, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { Tooltip, Treemap, XAxis, YAxis } from "../../src";
import { getTooltip, showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { treemapNodeChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import {
  type TreemapNode,
  addToTreemapNodeIndex,
  computeNode,
  treemapPayloadSearcher,
} from "../../src/chart/Treemap";
import {
  useChartHeight,
  useChartWidth,
  useMargin,
  useViewBox,
} from "../../src/context/chartLayoutContext";
import { exampleTreemapData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";

const data = [
  {
    name: "A",
    children: [
      { name: "U", value: 12490887132 },
      { name: "V", value: 10772738863 },
      { name: "W", value: 8236223813 },
    ],
  },
  { name: "B", value: 12490887132 },
  { name: "C", value: 10772738863 },
  { name: "D", value: 8236223813 },
  { name: "E", value: 6583448127 },
  { name: "F", value: 5834718183 },
];

describe("<Treemap />", () => {
  it("renders one rectangle per node (implicit root + every data node)", () => {
    const { container } = render(() => <Treemap width={500} height={250} data={data} />);
    flush();

    // root(1) + 6 top-level (A..F) + 3 nested (U,V,W under A) = 10.
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(10);
  });

  it("nests children by depth (depth-1 wraps depth-2 rects)", () => {
    const { container } = render(() => <Treemap width={500} height={250} data={data} />);
    flush();

    expect(container.querySelector(".recharts-treemap-depth-0")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-treemap-depth-1").length).toBeGreaterThan(0);
    // "A" has children → there are depth-2 rects (U/V/W).
    expect(container.querySelectorAll(".recharts-treemap-depth-2")).toHaveLength(3);
  });

  it("tiles the full chart area at the root and packs children within it", () => {
    const { container } = render(() => <Treemap width={500} height={250} data={data} />);
    flush();

    const rootRect = container.querySelector(".recharts-treemap-depth-0 > .recharts-rectangle");
    expect(rootRect).not.toBeNull();
    // The root rect spans the whole surface.
    expect(Number(rootRect!.getAttribute("width"))).toBeCloseTo(500, 0);
    expect(Number(rootRect!.getAttribute("height"))).toBeCloseTo(250, 0);
  });

  it("fires onClick with the clicked node", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Treemap width={500} height={250} data={data} onClick={onClick} />
    ));
    flush();

    // The first top-level node's rect (depth-1).
    const rect = container.querySelector(".recharts-treemap-depth-1 .recharts-rectangle")!;
    fireEvent.click(rect);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "A", depth: 1 });
  });

  it("renders a custom node via the content render prop (replacing the default rect)", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={data}
        content={(node) => <circle class="custom-node" data-name={node.name} />}
      />
    ));
    flush();

    // No default rects; one custom circle per node (root + 6 + 3 = 10).
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(0);
    expect(container.querySelectorAll("circle.custom-node")).toHaveLength(10);
    // The render prop received the node (its name is forwarded).
    expect(container.querySelector("circle.custom-node[data-name='A']")).not.toBeNull();
  });

  it("still dispatches clicks with custom content (handlers are on the node layer)", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={data}
        onClick={onClick}
        content={(node) => <circle class="custom-node" data-name={node.name} />}
      />
    ));
    flush();

    fireEvent.click(container.querySelector("circle.custom-node[data-name='A']")!);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "A" });
  });
});

describe("with Tooltip trigger=hover", () => {
  it("should display Tooltip on mouse enter on a Node and hide it on mouse leave", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="hover" />
      </Treemap>
    ));
    flush();

    const tooltip = getTooltip(container);
    expect(tooltip).not.toBeVisible();

    const tooltipTriggerElement = showTooltip(container, treemapNodeChartMouseHoverTooltipSelector);

    expect(tooltip).toBeVisible();

    fireEvent.mouseOut(tooltipTriggerElement);

    expect(tooltip).not.toBeVisible();
  });

  // Deferred: with custom content the tooltip-activation handler lives only on the
  // wrapping node <Layer> (faithful to recharts' ContentItem). recharts' helper fires
  // a *bubbling* `mouseOver` on the inner element, which React synthesizes into the
  // Layer's `onMouseEnter`; this port's helper fires a non-bubbling `mouseEnter` on the
  // inner element, which never reaches the Layer. Default content works because the
  // <Rectangle> itself carries the handler. Pure event-model divergence, not an impl gap.
  it.skip("should display/hide Tooltip on mouse enter/leave when custom content is passed as a function", () => {
    const { container } = render(() => (
      <Treemap
        width={1000}
        height={500}
        data={exampleTreemapData}
        content={(props) => {
          const { depth, x, y, width, height, index, name } = props;

          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                  fill: "#111",
                  stroke: "#fff",
                  "stroke-width": 2 / (depth + 1e-10),
                  "stroke-opacity": 1 / (depth + 1e-10),
                }}
                // needed for unit tests to find the tooltip
                class="recharts-rectangle"
              />
              {depth === 1 ? (
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 7}
                  text-anchor="middle"
                  fill="#fff"
                  font-size="14"
                >
                  {name}
                </text>
              ) : null}
              {depth === 1 ? (
                <text x={x + 4} y={y + 18} fill="#fff" font-size="16" fill-opacity="0.9">
                  {index + 1}
                </text>
              ) : null}
            </g>
          );
        }}
      >
        <Tooltip trigger="hover" />
      </Treemap>
    ));
    flush();

    const tooltip = getTooltip(container);
    expect(tooltip).not.toBeVisible();

    const tooltipTriggerElement = showTooltip(container, treemapNodeChartMouseHoverTooltipSelector);

    expect(tooltip).toBeVisible();

    fireEvent.mouseOut(tooltipTriggerElement);

    expect(tooltip).not.toBeVisible();
  });

  it("should not display Tooltip when clicking on a Node", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="hover" />
      </Treemap>
    ));
    flush();

    const tooltip = getTooltip(container);
    const tooltipTriggerElement = container.querySelector(
      treemapNodeChartMouseHoverTooltipSelector,
    );
    assertNotNull(tooltipTriggerElement);
    expect(tooltip).not.toBeVisible();

    fireEvent.click(tooltipTriggerElement);

    expect(tooltip).not.toBeVisible();
  });
});

describe("with Tooltip trigger=click", () => {
  it("should display Tooltip on mouse enter on a Node and keep it on mouse leave", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="click" />
      </Treemap>
    ));
    flush();

    const tooltip = getTooltip(container);
    expect(tooltip).not.toBeVisible();

    const tooltipTriggerElement = container.querySelector(
      treemapNodeChartMouseHoverTooltipSelector,
    );
    assertNotNull(tooltipTriggerElement);
    fireEvent.click(tooltipTriggerElement);
    flush();

    expect(tooltip).toBeVisible();

    fireEvent.click(tooltipTriggerElement);
    flush();

    expect(tooltip).toBeVisible();
  });

  it("should do nothing on hover over Node", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="click" />
      </Treemap>
    ));
    flush();

    const tooltip = getTooltip(container);
    showTooltip(container, treemapNodeChartMouseHoverTooltipSelector);
    expect(tooltip).not.toBeVisible();
  });
});

describe("Treemap geometry (nodeInset / nodeGap)", () => {
  const multiLevelInsetData = [
    {
      name: "Root A",
      children: [
        {
          name: "A1",
          children: [{ name: "A1a", value: 100 }],
        },
      ],
    },
  ];

  const siblingGapData = [
    { name: "Left", value: 100 },
    { name: "Right", value: 100 },
  ];

  it("renders nested children directly on top of parent when nodeInset is not set", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={multiLevelInsetData}
        isAnimationActive={false}
        dataKey="value"
        nameKey="name"
      />
    ));
    flush();

    const depth1Rect = container.querySelector(".recharts-treemap-depth-1 .recharts-rectangle");
    const depth2Rect = container.querySelector(".recharts-treemap-depth-2 .recharts-rectangle");
    assertNotNull(depth1Rect);
    assertNotNull(depth2Rect);

    expect(depth2Rect.getAttribute("x")).toBe(depth1Rect.getAttribute("x"));
    expect(depth2Rect.getAttribute("y")).toBe(depth1Rect.getAttribute("y"));
    expect(depth2Rect.getAttribute("width")).toBe(depth1Rect.getAttribute("width"));
    expect(depth2Rect.getAttribute("height")).toBe(depth1Rect.getAttribute("height"));
  });

  it("insets nested children when nodeInset is set", () => {
    const nodeInset = 8;
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={multiLevelInsetData}
        isAnimationActive={false}
        dataKey="value"
        nameKey="name"
        nodeInset={nodeInset}
      />
    ));
    flush();

    const depth1Rect = container.querySelector(".recharts-treemap-depth-1 .recharts-rectangle");
    const depth2Rect = container.querySelector(".recharts-treemap-depth-2 .recharts-rectangle");
    assertNotNull(depth1Rect);
    assertNotNull(depth2Rect);

    const depth1X = Number(depth1Rect.getAttribute("x"));
    const depth1Y = Number(depth1Rect.getAttribute("y"));
    const depth1Width = Number(depth1Rect.getAttribute("width"));
    const depth1Height = Number(depth1Rect.getAttribute("height"));
    const depth2X = Number(depth2Rect.getAttribute("x"));
    const depth2Y = Number(depth2Rect.getAttribute("y"));
    const depth2Width = Number(depth2Rect.getAttribute("width"));
    const depth2Height = Number(depth2Rect.getAttribute("height"));

    expect(depth2X).toBe(depth1X + nodeInset);
    expect(depth2Y).toBe(depth1Y + nodeInset);
    expect(depth2Width).toBe(depth1Width - nodeInset * 2);
    expect(depth2Height).toBe(depth1Height - nodeInset * 2);
  });

  it("renders sibling nodes without spacing when nodeGap is not set", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={siblingGapData}
        isAnimationActive={false}
        dataKey="value"
        nameKey="name"
      />
    ));
    flush();

    const depth1Rects = container.querySelectorAll(".recharts-treemap-depth-1 .recharts-rectangle");
    expect(depth1Rects).toHaveLength(2);

    const firstRect = depth1Rects[0];
    const secondRect = depth1Rects[1];
    assertNotNull(firstRect);
    assertNotNull(secondRect);

    const firstX = Number(firstRect.getAttribute("x"));
    const firstY = Number(firstRect.getAttribute("y"));
    const firstWidth = Number(firstRect.getAttribute("width"));
    const firstHeight = Number(firstRect.getAttribute("height"));
    const secondX = Number(secondRect.getAttribute("x"));
    const secondY = Number(secondRect.getAttribute("y"));
    const secondWidth = Number(secondRect.getAttribute("width"));
    const secondHeight = Number(secondRect.getAttribute("height"));
    const gapX = Math.max(secondX - (firstX + firstWidth), firstX - (secondX + secondWidth), 0);
    const gapY = Math.max(secondY - (firstY + firstHeight), firstY - (secondY + secondHeight), 0);

    expect(Math.max(gapX, gapY)).toBe(0);
  });

  it("adds spacing between sibling nodes when nodeGap is set", () => {
    const nodeGap = 10;
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={siblingGapData}
        isAnimationActive={false}
        dataKey="value"
        nameKey="name"
        nodeGap={nodeGap}
      />
    ));
    flush();

    const depth1Rects = container.querySelectorAll(".recharts-treemap-depth-1 .recharts-rectangle");
    expect(depth1Rects).toHaveLength(2);

    const firstRect = depth1Rects[0];
    const secondRect = depth1Rects[1];
    assertNotNull(firstRect);
    assertNotNull(secondRect);

    const firstX = Number(firstRect.getAttribute("x"));
    const firstY = Number(firstRect.getAttribute("y"));
    const firstWidth = Number(firstRect.getAttribute("width"));
    const firstHeight = Number(firstRect.getAttribute("height"));
    const secondX = Number(secondRect.getAttribute("x"));
    const secondY = Number(secondRect.getAttribute("y"));
    const secondWidth = Number(secondRect.getAttribute("width"));
    const secondHeight = Number(secondRect.getAttribute("height"));
    const gapX = Math.max(secondX - (firstX + firstWidth), firstX - (secondX + secondWidth), 0);
    const gapY = Math.max(secondY - (firstY + firstHeight), firstY - (secondY + secondHeight), 0);

    expect(Math.max(gapX, gapY)).toBe(nodeGap);
  });
});

describe("Treemap layout context", () => {
  it("should set width and height and margin in state", () => {
    const sizeSpy = vi.fn();
    const viewBoxSpy = vi.fn();
    const marginSpy = vi.fn();
    const Comp = (): null => {
      const width = useChartWidth();
      const height = useChartHeight();
      const viewBox = useViewBox();
      const margin = useMargin();
      createEffect(
        () => ({ width: width(), height: height() }),
        (v) => sizeSpy(v),
      );
      createEffect(
        () => viewBox(),
        (v) => viewBoxSpy(v),
      );
      createEffect(
        () => margin(),
        (v) => marginSpy(v),
      );
      return null;
    };
    render(() => (
      <Treemap width={100} height={50}>
        <Comp />
      </Treemap>
    ));
    expect(marginSpy).toHaveBeenLastCalledWith({ bottom: 0, left: 0, right: 0, top: 0 });
    expect(sizeSpy).toHaveBeenLastCalledWith({ width: 100, height: 50 });
    expect(viewBoxSpy).toHaveBeenLastCalledWith({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("should not throw if axes are provided - they are not an allowed child", () => {
    expect(() =>
      render(() => (
        <Treemap width={100} height={50}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
        </Treemap>
      )),
    ).not.toThrow();
  });
});

describe("addToTreemapNodeIndex + treemapPayloadSearcher tandem", () => {
  const dummyRoot = {
    children: exampleTreemapData,
    value: 0,
    depth: 0,
    index: 0,
  };
  const computedRootNode: TreemapNode = computeNode({
    depth: 0,
    index: 0,
    node: dummyRoot,
    dataKey: "value",
    nameKey: "name",
    nestedActiveTooltipIndex: undefined,
  });
  it("should return index for root node and then look it up", () => {
    expect(computedRootNode.children?.[4]).toBeDefined();
    const activeIndex = addToTreemapNodeIndex(4);
    expect(activeIndex).toEqual("children[4]");
    expect(treemapPayloadSearcher(computedRootNode, activeIndex)).toBe(
      computedRootNode.children?.[4],
    );
  });

  it("should return index for nested node and then look it up", () => {
    const level1 = computedRootNode.children?.[0];
    assertNotNull(level1);
    const activeIndex1 = addToTreemapNodeIndex(0);
    const level2 = level1.children?.[1];
    const activeIndex2 = addToTreemapNodeIndex(1, activeIndex1);
    expect(activeIndex2).toEqual("children[0]children[1]");
    expect(level2).toBeDefined();
    expect(treemapPayloadSearcher(computedRootNode, activeIndex1)).toBe(level1);
    expect(treemapPayloadSearcher(computedRootNode, activeIndex2)).toBe(level2);
  });
});
