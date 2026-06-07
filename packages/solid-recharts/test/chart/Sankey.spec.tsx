// Subset port of recharts 3.8.1 test/chart/Sankey.spec.tsx (commit 7a23854): the
// Sankey lays out nodes (Rectangles) + value-weighted link ribbons (paths) — one
// per data node / link. `flush()` because the chart size is reported via an effect
// before the layout computes.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { Sankey } from "../../src";

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
});
