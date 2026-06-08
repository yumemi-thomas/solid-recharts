// Subset port of recharts 3.8.1 test/chart/Treemap.spec.tsx (commit 7a23854): the
// squarified treemap renders one <Rectangle> per node (an implicit root + every
// data node), laid out so children tile their parent's rect. `flush()` because the
// chart size is reported via an effect before the layout computes.
import { describe, expect, it, vi } from "vitest";
import { createEffect, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { Treemap, XAxis, YAxis } from "../../src";
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
