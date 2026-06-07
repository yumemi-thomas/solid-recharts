// Tooltip-content matrix for the self-contained charts: each registers an item
// tooltip + a chart-specific payloadSearcher, so hovering an element resolves and
// renders the right name/value through the full payload pipeline. `flush()` because
// hover dispatches through the store before the tooltip portal updates.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { SunburstChart, Treemap, Sankey, Tooltip } from "../../src";

function tipItems(container: Element): Array<string | null> {
  return [
    ...container.querySelectorAll(".recharts-tooltip-item-name, .recharts-tooltip-item-value"),
  ].map((n) => n.textContent);
}

describe("niche chart tooltips", () => {
  it("SunburstChart shows the hovered sector's name + value", () => {
    const data = {
      name: "Root",
      value: 100,
      children: [
        { name: "C1", fill: "#264653", value: 30 },
        { name: "C2", fill: "#2a9d8f", value: 20 },
      ],
    };
    const { container } = render(() => (
      <SunburstChart width={400} height={400} data={data}>
        <Tooltip />
      </SunburstChart>
    ));
    flush();

    fireEvent.mouseEnter(container.querySelector(".recharts-sector")!);
    flush();
    expect(container.querySelector(".recharts-default-tooltip")).not.toBeNull();
    expect(tipItems(container)).toEqual(["C1", "30"]);
  });

  it("Treemap shows the hovered node's name + value", () => {
    const data = [
      { name: "A", value: 100 },
      { name: "B", value: 50 },
    ];
    const { container } = render(() => (
      <Treemap width={400} height={300} data={data}>
        <Tooltip />
      </Treemap>
    ));
    flush();

    // Hover handlers live on the node Layer (mouseenter doesn't bubble from the rect).
    fireEvent.mouseEnter(container.querySelector(".recharts-treemap-depth-1")!);
    flush();
    expect(tipItems(container)).toEqual(["A", "100"]);
  });

  it("Sankey shows a 'source - target' name for links and the node name for nodes", () => {
    const data = {
      nodes: [{ name: "A" }, { name: "B" }, { name: "C" }],
      links: [
        { source: 0, target: 1, value: 10 },
        { source: 1, target: 2, value: 5 },
      ],
    };
    const { container } = render(() => (
      <Sankey width={600} height={400} data={data}>
        <Tooltip />
      </Sankey>
    ));
    flush();

    fireEvent.mouseEnter(container.querySelector(".recharts-sankey-link")!);
    flush();
    expect(tipItems(container)).toEqual(["A - B", "10"]);

    fireEvent.mouseEnter(container.querySelector(".recharts-sankey-node")!);
    flush();
    expect(tipItems(container)).toEqual(["A", "10"]);
  });
});
