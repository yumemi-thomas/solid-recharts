// Solid-recharts spec: Sankey custom function-form `node` / `link` renderers.
// recharts also supports element-form (N/A in this port — no cloneElement).
import { describe, expect, it } from "vitest";

import { Sankey } from "../../src";
import { render } from "@solidjs/testing-library";

const data = {
  nodes: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
  links: [
    { source: 0, target: 1, value: 10 },
    { source: 0, target: 2, value: 5 },
    { source: 1, target: 3, value: 8 },
    { source: 2, target: 3, value: 3 },
  ],
};

describe("Sankey custom node/link content", () => {
  it("renders the function-form node renderer for each node", () => {
    const { container } = render(() => (
      <Sankey
        width={800}
        height={400}
        data={data}
        node={(p) => <circle class="custom-sankey-node" cx={p.x} cy={p.y} r={4} />}
      />
    ));
    expect(container.querySelectorAll(".custom-sankey-node")).toHaveLength(data.nodes.length);
    // The default <rect> node is not rendered when a custom node is provided.
    expect(container.querySelectorAll(".recharts-sankey-node rect")).toHaveLength(0);
  });

  it("renders the function-form link renderer for each link", () => {
    const { container } = render(() => (
      <Sankey
        width={800}
        height={400}
        data={data}
        link={(p) => <path class="custom-sankey-link" d={`M0,0L${p.sourceX},${p.sourceY}`} />}
      />
    ));
    expect(container.querySelectorAll(".custom-sankey-link")).toHaveLength(data.links.length);
  });
});
