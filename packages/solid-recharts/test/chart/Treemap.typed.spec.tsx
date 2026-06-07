import { describe, it } from "vitest";
import { Treemap, getRelativeCoordinate, type TreemapNode } from "../../src";

// Ported from recharts 3.8.1 test/chart/Treemap.typed.spec.tsx.

describe("Treemap types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Treemap
        width={400}
        height={400}
        data={[]}
        dataKey="value"
        nodeInset={4}
        nodeGap={2}
        onMouseEnter={(_node: TreemapNode, e) => {
          getRelativeCoordinate(e);
        }}
        onMouseLeave={(_node: TreemapNode, e) => {
          getRelativeCoordinate(e);
        }}
        onClick={(_node: TreemapNode) => {}}
      />
    );
  });
});
