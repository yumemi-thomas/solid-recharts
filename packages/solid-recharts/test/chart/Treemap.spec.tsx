// Subset port of recharts 3.8.1 test/chart/Treemap.spec.tsx (commit 7a23854): the
// squarified treemap renders one <Rectangle> per node (an implicit root + every
// data node), laid out so children tile their parent's rect. `flush()` because the
// chart size is reported via an effect before the layout computes.
import { describe, expect, it, vi } from "vitest";
import { createEffect } from "solid-js";
import { render, fireEvent, screen } from "@solidjs/testing-library";
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
import { mockTouchingElement } from "../helper/mockTouchingElement";

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
    // root(1) + 6 top-level (A..F) + 3 nested (U,V,W under A) = 10.
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(10);
  });

  it("nests children by depth (depth-1 wraps depth-2 rects)", () => {
    const { container } = render(() => <Treemap width={500} height={250} data={data} />);
    expect(container.querySelector(".recharts-treemap-depth-0")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-treemap-depth-1").length).toBeGreaterThan(0);
    // "A" has children → there are depth-2 rects (U/V/W).
    expect(container.querySelectorAll(".recharts-treemap-depth-2")).toHaveLength(3);
  });

  it("tiles the full chart area at the root and packs children within it", () => {
    const { container } = render(() => <Treemap width={500} height={250} data={data} />);
    const rootRect = container.querySelector(".recharts-treemap-depth-0 .recharts-rectangle");
    expect(rootRect).not.toBeNull();
    // The root rect spans the whole surface.
    expect(Number(rootRect!.getAttribute("width"))).toBeCloseTo(500, 0);
    expect(Number(rootRect!.getAttribute("height"))).toBeCloseTo(250, 0);
  });

  it("fires onClick with the clicked leaf node (flat mode gates onClick to leaves)", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Treemap width={500} height={250} data={data} onClick={onClick} />
    ));
    // In flat mode recharts only fires onClick on leaf nodes. "A" has children, so
    // click the leaf "B" rect (the 2nd depth-1 node in depth-first order).
    const leafRect = container.querySelectorAll(
      ".recharts-treemap-depth-1 .recharts-rectangle",
    )[1]!;
    fireEvent.click(leafRect);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "B", depth: 1 });
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
    // Leaf "B" (flat mode gates onClick to leaves).
    fireEvent.click(container.querySelector("circle.custom-node[data-name='B']")!);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "B" });
  });

  it("renders 24 rectangles in simple (flat) TreemapChart", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
      />
    ));
    // root(1) + 20 top-level (A..T) + 3 nested (U,V,W under A) = 24.
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(24);
  });

  it("renders 21 rectangles in nest TreemapChart (root + direct children only)", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    // root(1) + 20 top-level (A..T); nested U/V/W are NOT shown until you drill in.
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(21);
  });

  it("uses the same drawing height for nest layout and surface", () => {
    const chartHeight = 250;
    const { container } = render(() => (
      <Treemap
        width={500}
        height={chartHeight}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    const depth0Rect = container.querySelector(".recharts-treemap-depth-0 .recharts-rectangle");
    assertNotNull(depth0Rect);
    // nest mode subtracts the 30px breadcrumb strip.
    expect(depth0Rect.getAttribute("height")).toBe(String(chartHeight - 30));
  });
});

describe("<Treemap /> nest navigation", () => {
  it("navigates through nested nodes correctly", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(21);
    expect(container.querySelectorAll(".recharts-treemap-depth-1")).toHaveLength(20);

    const nodeWithChildren = screen.getByText("A");
    fireEvent.click(nodeWithChildren);
    expect(container.querySelectorAll(".recharts-rectangle")).toHaveLength(4);
    expect(container.querySelectorAll(".recharts-treemap-depth-1")).toHaveLength(3);
    expect(container.querySelectorAll(".recharts-treemap-depth-1")[0]).toHaveTextContent("U");
  });

  it("breadcrumb navigation allows going back to root", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    const initialNodeCount = container.querySelectorAll(".recharts-rectangle").length;
    expect(initialNodeCount).toBeGreaterThan(4);

    fireEvent.click(screen.getByText("A"));
    expect(container.querySelectorAll(".recharts-rectangle").length).toBeLessThan(initialNodeCount);

    const breadcrumbWrapper = container.querySelector(".recharts-treemap-nest-index-wrapper");
    expect(breadcrumbWrapper).toBeInTheDocument();

    const rootBreadcrumb = breadcrumbWrapper?.querySelector(".recharts-treemap-nest-index-box");
    expect(rootBreadcrumb).toBeInTheDocument();
    assertNotNull(rootBreadcrumb);
    fireEvent.click(rootBreadcrumb);
    expect(container.querySelectorAll(".recharts-rectangle").length).toBe(initialNodeCount);
  });

  it("clicking the current root cell in nest mode does not drill repeatedly", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    fireEvent.click(screen.getByText("A"));
    const breadcrumbCountBefore = container.querySelectorAll(
      ".recharts-treemap-nest-index-box",
    ).length;
    const currentRootCell = container.querySelector(
      ".recharts-treemap-depth-0 .recharts-rectangle",
    );
    assertNotNull(currentRootCell);

    fireEvent.click(currentRootCell);
    const breadcrumbCountAfter = container.querySelectorAll(
      ".recharts-treemap-nest-index-box",
    ).length;
    expect(breadcrumbCountAfter).toBe(breadcrumbCountBefore);
  });

  it("does not render the drill-down arrow on the current root cell in nest mode", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    fireEvent.click(screen.getByText("A"));
    const rootLayer = container.querySelector(".recharts-treemap-depth-0");
    assertNotNull(rootLayer);
    expect(rootLayer.querySelector(".recharts-polygon")).not.toBeInTheDocument();
  });

  it("renders custom nestIndexContent when provided as function", () => {
    const customContent = vi.fn((item: TreemapNode, i: number) => (
      <span data-testid={`breadcrumb-${i}`}>Custom: {item.name || "root"}</span>
    ));

    render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
        nestIndexContent={customContent}
      />
    ));
    fireEvent.click(screen.getByText("A"));
    expect(customContent).toHaveBeenCalled();
    expect(screen.getByTestId("breadcrumb-0")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-1")).toBeInTheDocument();
  });

  it("clicking leaf nodes in nest mode does not navigate", () => {
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={exampleTreemapData}
        isAnimationActive={false}
        nameKey="name"
        dataKey="value"
        type="nest"
      />
    ));
    const initialNodeCount = container.querySelectorAll(".recharts-rectangle").length;

    fireEvent.click(screen.getByText("A"));
    const nestedNodeCount = container.querySelectorAll(".recharts-rectangle").length;
    expect(nestedNodeCount).toBeLessThan(initialNodeCount);

    // "U" is a leaf — clicking it should not drill further.
    fireEvent.click(screen.getByText("U"));
    expect(container.querySelectorAll(".recharts-rectangle").length).toBe(nestedNodeCount);
  });
});

describe("<Treemap /> mouse events", () => {
  const mouseData = [
    { name: "A", size: 24593 },
    { name: "B", size: 1302 },
    { name: "C", size: 652 },
    { name: "D", size: 636 },
    { name: "E", size: 6703 },
  ];

  it("renders a treemap with basic data", () => {
    const { container } = render(() => (
      <Treemap width={500} height={250} data={mouseData} nameKey="name" dataKey="size" />
    ));
    expect(container.querySelectorAll(".recharts-treemap-depth-1")).toHaveLength(mouseData.length);
  });

  it("should call onMouseEnter with correct arguments", () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onClick = vi.fn();

    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={mouseData}
        nameKey="name"
        dataKey="size"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        isAnimationActive={false}
      />
    ));
    const firstNode = container.querySelectorAll(".recharts-treemap-depth-1 g")[0]!;
    expect(firstNode).toBeInTheDocument();

    fireEvent.mouseEnter(firstNode);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseEnter.mock.calls[0]).toHaveLength(2);
    const arg1 = onMouseEnter.mock.calls[0]![0];
    const expectedTreemapNode: TreemapNode = {
      id: expect.stringMatching(/^recharts-treemap-+/) as unknown as string,
      width: 363,
      height: 250,
      name: "A",
      size: 24593,
      children: null,
      value: 24593,
      depth: 1,
      index: 0,
      tooltipIndex: "children[0]",
      area: 90719.61872159594,
      x: 0,
      y: 0,
      root: {
        children: [
          {
            name: "A",
            size: 24593,
            children: null,
            value: 24593,
            depth: 1,
            index: 0,
            tooltipIndex: "children[0]",
            area: 90719.61872159594,
            x: 0,
            y: 0,
            width: 363,
            height: 250,
          },
          {
            name: "B",
            size: 1302,
            children: null,
            value: 1302,
            depth: 1,
            index: 1,
            tooltipIndex: "children[1]",
            area: 4802.868441244172,
            x: 363,
            y: 0,
            height: 70,
            width: 69,
          },
          {
            name: "C",
            size: 652,
            children: null,
            value: 652,
            depth: 1,
            index: 2,
            tooltipIndex: "children[2]",
            area: 2405.1230596706605,
            x: 432,
            y: 0,
            height: 70,
            width: 34,
          },
          {
            name: "D",
            size: 636,
            children: null,
            value: 636,
            depth: 1,
            index: 3,
            tooltipIndex: "children[3]",
            area: 2346.1016348934663,
            x: 466,
            y: 0,
            height: 70,
            width: 34,
          },
          {
            name: "E",
            size: 6703,
            children: null,
            value: 6703,
            depth: 1,
            index: 4,
            tooltipIndex: "children[4]",
            area: 24726.28814259576,
            x: 363,
            y: 70,
            height: 180,
            width: 137,
          },
        ],
        x: 0,
        y: 0,
        width: 500,
        height: 250,
        name: "",
        value: 33886,
        depth: 0,
        index: 0,
        tooltipIndex: "",
      },
    } as unknown as TreemapNode;
    expect(arg1).toEqual(expectedTreemapNode);
    const arg2 = onMouseEnter.mock.calls[0]![1];
    expect(arg2.type).toBe("mouseenter");
    expect(arg2.target).toBeInstanceOf(SVGElement);
    expect(arg2.target.tagName).toBe("g");
    expect(arg2.target.classList.toString()).toEqual("recharts-layer");

    expect(onMouseLeave).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should call onMouseLeave when moving between nodes", () => {
    const onMouseLeave = vi.fn();
    const onMouseEnter = vi.fn();

    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={mouseData}
        nameKey="name"
        dataKey="size"
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        isAnimationActive={false}
      />
    ));
    const nodes = container.querySelectorAll(".recharts-treemap-depth-1 g");
    expect(nodes[0]).toBeInTheDocument();
    expect(nodes[1]).toBeInTheDocument();

    fireEvent.mouseEnter(nodes[0]!);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(nodes[0]!);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(nodes[1]!);
    expect(onMouseEnter).toHaveBeenCalledTimes(2);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);

    expect(onMouseLeave.mock.calls[0]).toHaveLength(2);
    const arg1 = onMouseLeave.mock.calls[0]![0];
    expect(arg1).toMatchObject({
      id: expect.stringMatching(/^recharts-treemap-+/),
      name: "A",
      depth: 1,
      index: 0,
      tooltipIndex: "children[0]",
    });
    const arg2 = onMouseLeave.mock.calls[0]![1];
    expect(arg2.type).toBe("mouseleave");
    expect(arg2.target).toBeInstanceOf(SVGElement);
    expect(arg2.target.tagName).toBe("g");
    expect(arg2.target.classList.toString()).toEqual("recharts-layer");
  });

  it("should call onClick with correct arguments", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={mouseData}
        nameKey="name"
        dataKey="size"
        onClick={onClick}
        isAnimationActive={false}
      />
    ));
    const firstNode = container.querySelectorAll(".recharts-treemap-depth-1 g")[0]!;
    expect(firstNode).toBeInTheDocument();

    fireEvent.click(firstNode);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]).toHaveLength(1);
    const arg1 = onClick.mock.calls[0]![0];
    expect(arg1).toMatchObject({
      id: expect.stringMatching(/^recharts-treemap-+/),
      name: "A",
      depth: 1,
      index: 0,
      tooltipIndex: "children[0]",
      value: 24593,
      size: 24593,
    });
    expect(arg1.root).toMatchObject({ depth: 0, name: "", value: 33886, tooltipIndex: "" });
  });

  it("should not call touch event handlers", () => {
    mockTouchingElement("0", "size");
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();
    const { container } = render(() => (
      <Treemap
        width={500}
        height={250}
        data={mouseData}
        nameKey="name"
        dataKey="size"
        // @ts-expect-error Treemap does not fire external touch events; it activates Tooltip internally.
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        isAnimationActive={false}
      />
    ));
    const firstNode = container.querySelectorAll(".recharts-treemap-depth-1 g")[0]!;
    expect(firstNode).toBeInTheDocument();

    fireEvent.touchMove(firstNode, { touches: [{ clientX: 200, clientY: 200 }] });
    expect(onTouchMove).toHaveBeenCalledTimes(0);
  });
});

describe("with Tooltip trigger=hover", () => {
  it("should display Tooltip on mouse enter on a Node and hide it on mouse leave", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="hover" />
      </Treemap>
    ));
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
  it("should display/hide Tooltip on mouse enter/leave when custom content is passed as a function", () => {
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
    const tooltip = getTooltip(container);
    expect(tooltip).not.toBeVisible();

    const tooltipTriggerElement = container.querySelector(
      treemapNodeChartMouseHoverTooltipSelector,
    );
    assertNotNull(tooltipTriggerElement);
    fireEvent.click(tooltipTriggerElement);
    expect(tooltip).toBeVisible();

    fireEvent.click(tooltipTriggerElement);
    expect(tooltip).toBeVisible();
  });

  it("should do nothing on hover over Node", () => {
    const { container } = render(() => (
      <Treemap width={1000} height={500} data={exampleTreemapData}>
        <Tooltip trigger="click" />
      </Treemap>
    ));
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
      createEffect(() => {
        const value = (() => ({ width: width(), height: height() }))();
        ((v) => sizeSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => viewBox())();
        ((v) => viewBoxSpy(v))(value);
      });
      createEffect(() => {
        const value = (() => margin())();
        ((v) => marginSpy(v))(value);
      });
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
