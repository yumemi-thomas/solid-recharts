// Subset port of recharts 3.8.1 test/chart/Sankey.spec.tsx (commit 7a23854): the
// Sankey lays out nodes (Rectangles) + value-weighted link ribbons (paths) — one
// per data node / link. `flush()` because the chart size is reported via an effect
// before the layout computes.
import { describe, expect, it, vi } from "vitest";
import { createEffect, createSignal, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { Sankey, Tooltip, XAxis, YAxis } from "../../src";
import type { SankeyLinkProps, SankeyNodeProps } from "../../src";
import { exampleSankeyData } from "../_data";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { assertNotNull } from "../helper/assertNotNull";
import {
  sankeyLinkMouseHoverTooltipSelector,
  sankeyNodeMouseHoverTooltipSelector,
} from "../component/Tooltip/tooltipMouseHoverSelectors";
import { getTooltip, showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { mockTouchingElement } from "../helper/mockTouchingElement";

const data = {
  nodes: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
  links: [
    { source: 0, target: 1, value: 10 },
    { source: 0, target: 2, value: 5 },
    { source: 1, target: 3, value: 8 },
    { source: 2, target: 3, value: 3 },
  ],
};

describe("<Sankey />", () => {
  it("renders one node rect per node and one link path per link", () => {
    const { container } = render(() => <Sankey width={600} height={400} data={data} />);
    flush();

    expect(container.querySelectorAll(".recharts-sankey-node")).toHaveLength(data.nodes.length);
    expect(container.querySelectorAll(".recharts-sankey-link")).toHaveLength(data.links.length);
  });

  it("draws nodes at the default nodeWidth and links with a cubic-Bézier path", () => {
    const { container } = render(() => <Sankey width={600} height={400} data={data} />);
    flush();

    const node = container.querySelector(".recharts-sankey-node");
    expect(node).not.toBeNull();
    // Default nodeWidth is 10.
    expect(Number(node!.getAttribute("width"))).toBe(10);

    const link = container.querySelector(".recharts-sankey-link");
    expect(link).not.toBeNull();
    // The ribbon is a cubic curve (M…C…).
    expect(link!.getAttribute("d")).toMatch(/^M[\d.,-]+C/);
    expect(Number(link!.getAttribute("stroke-width"))).toBeGreaterThan(0);
  });

  it("fires onClick with the clicked node and its type", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Sankey width={600} height={400} data={data} onClick={onClick} />
    ));
    flush();

    fireEvent.click(container.querySelector(".recharts-sankey-node")!);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![1]).toBe("node");
  });

  it("renders 48 nodes in simple SankeyChart", () => {
    const { container } = render(() => (
      <Sankey width={1000} height={500} data={exampleSankeyData} />
    ));
    flush();

    expect(container.querySelectorAll(".recharts-sankey-node")).toHaveLength(48);
  });

  it("renders 68 links in simple SankeyChart", () => {
    const { container } = render(() => (
      <Sankey width={1000} height={500} data={exampleSankeyData} />
    ));
    flush();

    expect(container.querySelectorAll(".recharts-sankey-link")).toHaveLength(68);
  });

  it("re-renders links and nodes when data changes", () => {
    const [data2, setData2] = createSignal(exampleSankeyData);
    const { container } = render(() => <Sankey width={1000} height={500} data={data2()} />);
    flush();

    expect(container.querySelectorAll(".recharts-sankey-node")).toHaveLength(48);
    expect(container.querySelectorAll(".recharts-sankey-link")).toHaveLength(68);

    setData2({
      nodes: [...exampleSankeyData.nodes, { name: "New Node" }],
      links: [
        ...exampleSankeyData.links,
        { source: 2, target: exampleSankeyData.nodes.length, value: 100.0 },
      ],
    });
    flush();

    expect(container.querySelectorAll(".recharts-sankey-node")).toHaveLength(49);
    expect(container.querySelectorAll(".recharts-sankey-link")).toHaveLength(69);
  });

  describe("Sankey layout context", () => {
    it("should provide viewBox, but not clipPathId", () => {
      const clipPathSpy = vi.fn();
      const viewBoxSpy = vi.fn();
      const Comp = (): null => {
        clipPathSpy(useClipPathId());
        const viewBox = useViewBox();
        createEffect(
          () => viewBox(),
          (v) => viewBoxSpy(v),
        );
        return null;
      };
      render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <Comp />
        </Sankey>
      ));
      flush();
      expect(clipPathSpy).toHaveBeenLastCalledWith(undefined);
      expect(viewBoxSpy).toHaveBeenLastCalledWith({ x: 5, y: 5, width: 990, height: 490 });
    });

    it("should set width and height in context", () => {
      const widthSpy = vi.fn();
      const heightSpy = vi.fn();
      const Comp = (): null => {
        const width = useChartWidth();
        const height = useChartHeight();
        createEffect(
          () => width(),
          (v) => widthSpy(v),
        );
        createEffect(
          () => height(),
          (v) => heightSpy(v),
        );
        return null;
      };
      render(() => (
        <Sankey width={100} height={50} data={exampleSankeyData}>
          <Comp />
        </Sankey>
      ));
      flush();
      expect(widthSpy).toHaveBeenLastCalledWith(100);
      expect(heightSpy).toHaveBeenLastCalledWith(50);
    });

    it("should not throw if axes are provided - they are not an allowed child anyway", () => {
      expect(() =>
        render(() => (
          <Sankey width={1000} height={500} data={exampleSankeyData}>
            <XAxis dataKey="number" type="number" />
            <YAxis type="category" dataKey="name" />
          </Sankey>
        )),
      ).not.toThrow();
    });
  });

  describe("with Tooltip trigger=hover", () => {
    it("should display Tooltip on mouse enter on Link and hide it on mouse leave", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="hover" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      expect(tooltip).not.toBeVisible();

      const tooltipTriggerElement = showTooltip(container, sankeyLinkMouseHoverTooltipSelector);

      expect(tooltip).toBeVisible();

      fireEvent.mouseOut(tooltipTriggerElement);

      expect(tooltip).not.toBeVisible();
    });

    it("should display Tooltip on mouse enter on a Node and hide it on mouse leave", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="hover" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      expect(tooltip).not.toBeVisible();

      const tooltipTriggerElement = showTooltip(container, sankeyNodeMouseHoverTooltipSelector);

      expect(tooltip).toBeVisible();

      fireEvent.mouseOut(tooltipTriggerElement);

      expect(tooltip).not.toBeVisible();
    });

    it("should not display Tooltip when clicking on a Link", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="hover" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      const tooltipTriggerElement = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(tooltipTriggerElement);
      expect(tooltip).not.toBeVisible();

      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).not.toBeVisible();
    });

    it("should not display Tooltip when clicking on a Node", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="hover" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      const tooltipTriggerElement = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(tooltipTriggerElement);
      expect(tooltip).not.toBeVisible();

      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).not.toBeVisible();
    });
  });

  describe("with Tooltip trigger=click", () => {
    it("should display Tooltip on mouse click on Link and keep it on second click", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="click" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      expect(tooltip).not.toBeVisible();

      const tooltipTriggerElement = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(tooltipTriggerElement);
      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).toBeVisible();

      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).toBeVisible();
    });

    it("should display Tooltip on mouse enter on a Node and keep it on mouse leave", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="click" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      expect(tooltip).not.toBeVisible();

      const tooltipTriggerElement = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(tooltipTriggerElement);
      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).toBeVisible();

      fireEvent.click(tooltipTriggerElement);
      flush();

      expect(tooltip).toBeVisible();
    });

    it("should do nothing on hover over Link or Node", () => {
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData}>
          <XAxis dataKey="number" type="number" />
          <YAxis type="category" dataKey="name" />
          <Tooltip trigger="click" />
        </Sankey>
      ));
      flush();

      const tooltip = getTooltip(container);
      showTooltip(container, sankeyLinkMouseHoverTooltipSelector);
      showTooltip(container, sankeyNodeMouseHoverTooltipSelector);
      expect(tooltip).not.toBeVisible();
    });
  });

  describe("events", () => {
    it("should call onClick handler on links", () => {
      const onClick = vi.fn();
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData} onClick={onClick} />
      ));
      flush();

      const link = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(link);

      fireEvent.click(link, { clientX: 200, clientY: 200 });
      flush();
      expect(onClick).toHaveBeenCalledTimes(1);
      const expectedLinkProps: SankeyLinkProps = {
        index: 0,
        linkWidth: 13.172337974085991,
        payload: {
          dy: 13.172337974085991,
          source: {
            depth: 0,
            dx: 10,
            dy: 13.172337974085991,
            name: "Agricultural waste",
            sourceLinks: [],
            sourceNodes: [],
            targetLinks: [0],
            targetNodes: [1],
            value: 124.729,
            x: 0,
            y: 127.92976245668771,
          },
          sy: 0,
          target: {
            depth: 1,
            dx: 10,
            dy: 41.07345963305562,
            name: "Bio-conversion",
            sourceLinks: [65, 0, 51, 44],
            sourceNodes: [0, 34, 39, 45],
            targetLinks: [2, 3, 4, 1],
            targetNodes: [2, 3, 4, 5],
            value: 388.925,
            x: 140,
            y: 113.96304660380619,
          },
          ty: 19.221650415407733,
          value: 124.729,
        },
        sourceControlX: 80,
        sourceRelativeY: 0,
        sourceX: 15,
        sourceY: 139.51593144373072,
        targetControlX: 80,
        targetRelativeY: 19.221650415407733,
        targetX: 145,
        targetY: 144.77086600625694,
      };
      expectLastCalledWith(
        onClick,
        expectedLinkProps,
        "link",
        expect.objectContaining({ type: "click" }) as never,
      );
    });

    it("should call onClick handler on nodes", () => {
      const onClick = vi.fn();
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData} onClick={onClick} />
      ));
      flush();

      const node = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(node);

      fireEvent.click(node, { clientX: 200, clientY: 200 });
      flush();
      expect(onClick).toHaveBeenCalledTimes(1);
      const expectedNodeProps: SankeyNodeProps = {
        height: 13.172337974085991,
        index: 0,
        payload: {
          depth: 0,
          dx: 10,
          dy: 13.172337974085991,
          name: "Agricultural waste",
          sourceLinks: [],
          sourceNodes: [],
          targetLinks: [0],
          targetNodes: [1],
          value: 124.729,
          x: 0,
          y: 127.92976245668771,
        },
        width: 10,
        x: 5,
        y: 132.9297624566877,
      };
      expectLastCalledWith(
        onClick,
        expectedNodeProps,
        "node",
        expect.objectContaining({ type: "click" }) as never,
      );
    });

    it("should call onMouseEnter and onMouseLeave handlers on links", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      const { container } = render(() => (
        <Sankey
          width={1000}
          height={500}
          data={exampleSankeyData}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ));
      flush();

      const link = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(link);

      fireEvent.mouseEnter(link, { clientX: 200, clientY: 200 });
      flush();
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      const expectedLinkProps: SankeyLinkProps = {
        sourceX: 15,
        targetX: 145,
        sourceY: 139.51593144373072,
        targetY: 144.77086600625694,
        sourceControlX: 80,
        targetControlX: 80,
        sourceRelativeY: 0,
        targetRelativeY: 19.221650415407733,
        linkWidth: 13.172337974085991,
        index: 0,
        payload: {
          source: {
            name: "Agricultural waste",
            sourceNodes: [],
            sourceLinks: [],
            targetLinks: [0],
            targetNodes: [1],
            value: 124.729,
            depth: 0,
            x: 0,
            dx: 10,
            y: 127.92976245668771,
            dy: 13.172337974085991,
          },
          target: {
            name: "Bio-conversion",
            sourceNodes: [0, 34, 39, 45],
            sourceLinks: [65, 0, 51, 44],
            targetLinks: [2, 3, 4, 1],
            targetNodes: [2, 3, 4, 5],
            value: 388.925,
            depth: 1,
            x: 140,
            dx: 10,
            y: 113.96304660380619,
            dy: 41.07345963305562,
          },
          value: 124.729,
          dy: 13.172337974085991,
          sy: 0,
          ty: 19.221650415407733,
        },
      };
      expectLastCalledWith(
        onMouseEnter,
        expectedLinkProps,
        "link",
        expect.objectContaining({ type: "mouseenter" }) as never,
      );

      fireEvent.mouseLeave(link);
      flush();
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        onMouseLeave,
        expectedLinkProps,
        "link",
        expect.objectContaining({ type: "mouseleave" }) as never,
      );
    });

    it("should do nothing onMouseMove on links", () => {
      const onMouseMove = vi.fn();
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData} onMouseMove={onMouseMove} />
      ));
      flush();

      const link = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(link);

      fireEvent.mouseMove(link, { clientX: 200, clientY: 200 });
      flush();
      expect(onMouseMove).toHaveBeenCalledTimes(0);
    });

    it("should call onMouseEnter and onMouseLeave handlers on nodes", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      const { container } = render(() => (
        <Sankey
          width={1000}
          height={500}
          data={exampleSankeyData}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ));
      flush();

      const node = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(node);

      fireEvent.mouseEnter(node, { clientX: 200, clientY: 200 });
      flush();
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      const expectedNodeProps: SankeyNodeProps = {
        height: 13.172337974085991,
        index: 0,
        payload: {
          name: "Agricultural waste",
          sourceNodes: [],
          sourceLinks: [],
          targetLinks: [0],
          targetNodes: [1],
          value: 124.729,
          depth: 0,
          x: 0,
          dx: 10,
          y: 127.92976245668771,
          dy: 13.172337974085991,
        },
        width: 10,
        x: 5,
        y: 132.9297624566877,
      };
      expectLastCalledWith(
        onMouseEnter,
        expectedNodeProps,
        "node",
        expect.objectContaining({ type: "mouseenter" }) as never,
      );

      fireEvent.mouseLeave(node);
      flush();
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        onMouseLeave,
        expectedNodeProps,
        "node",
        expect.objectContaining({ type: "mouseleave" }) as never,
      );
    });

    it("should do nothing onMouseMove on nodes", () => {
      const onMouseMove = vi.fn();
      const { container } = render(() => (
        <Sankey width={1000} height={500} data={exampleSankeyData} onMouseMove={onMouseMove} />
      ));
      flush();

      const node = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(node);

      fireEvent.mouseMove(node, { clientX: 200, clientY: 200 });
      flush();
      expect(onMouseMove).toHaveBeenCalledTimes(0);
    });

    it("should do nothing onTouchMove on links", () => {
      mockTouchingElement("1", "a");
      const onTouchMove = vi.fn();
      const onTouchEnd = vi.fn();
      const { container } = render(() => (
        <Sankey
          width={1000}
          height={500}
          data={exampleSankeyData}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      ));
      flush();

      const link = container.querySelector(sankeyLinkMouseHoverTooltipSelector);
      assertNotNull(link);

      fireEvent.touchMove(link, { touches: [{ clientX: 200, clientY: 200 }] });
      flush();
      expect(onTouchMove).toHaveBeenCalledTimes(0);

      fireEvent.touchEnd(link, { changedTouches: [{ clientX: 200, clientY: 200 }] });
      flush();
      expect(onTouchEnd).toHaveBeenCalledTimes(0);
    });

    it("should do nothing onTouchMove and onTouchEnd on nodes", () => {
      mockTouchingElement("1", "a");
      const onTouchMove = vi.fn();
      const onTouchEnd = vi.fn();
      const { container } = render(() => (
        <Sankey
          width={1000}
          height={500}
          data={exampleSankeyData}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      ));
      flush();

      const node = container.querySelector(sankeyNodeMouseHoverTooltipSelector);
      assertNotNull(node);

      fireEvent.touchMove(node, { touches: [{ clientX: 200, clientY: 200 }] });
      flush();
      expect(onTouchMove).toHaveBeenCalledTimes(0);

      fireEvent.touchEnd(node, { changedTouches: [{ clientX: 200, clientY: 200 }] });
      flush();
      expect(onTouchEnd).toHaveBeenCalledTimes(0);
    });
  });

  it("should not produce NaN node positions or link widths when all link values are 0", () => {
    const zeroData = {
      nodes: [{ name: "A" }, { name: "B" }, { name: "C" }],
      links: [
        { source: 0, target: 1, value: 0 },
        { source: 1, target: 2, value: 0 },
      ],
    };

    const { container } = render(() => <Sankey width={500} height={300} data={zeroData} />);
    flush();

    // Rectangle component drops 0-height rectangles, so no nodes render
    const nodes = container.querySelectorAll(".recharts-sankey-node");
    expect(nodes.length).toBe(0);

    const links = container.querySelectorAll(".recharts-sankey-link");
    expect(links.length).toBeGreaterThan(0);

    links.forEach((link) => {
      const path = link.querySelector("path") ?? link; // Sometimes the element itself is the path
      const d = path.getAttribute("d");
      const strokeWidth = path.getAttribute("stroke-width");

      expect(d).not.toContain("NaN");
      expect(Number.isFinite(Number(strokeWidth))).toBe(true);
    });
  });

  it("should not squash positive nodes to 0 height if one depth level has all 0 values", () => {
    const mixedData = {
      nodes: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
      links: [
        { source: 0, target: 1, value: 100 },
        { source: 0, target: 2, value: 0 },
        { source: 2, target: 3, value: 0 },
      ],
    };

    const { container } = render(() => <Sankey width={500} height={300} data={mixedData} />);
    flush();

    const nodes = container.querySelectorAll(".recharts-sankey-node");
    // A and B should render because they have >0 values.
    // C and D have 0 values, so they get 0 height and do not render.
    expect(nodes.length).toBe(2);
  });
});
