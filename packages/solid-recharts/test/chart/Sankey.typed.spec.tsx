import { describe, it } from "vitest";
import {
  Sankey,
  getRelativeCoordinate,
  type SankeyElementType,
  type SankeyLinkProps,
  type SankeyNodeProps,
} from "../../src";

// Ported from recharts 3.8.1 test/chart/Sankey.typed.spec.tsx.

describe("Sankey types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Sankey
        data={{ nodes: [], links: [] }}
        onClick={(_item: SankeyNodeProps | SankeyLinkProps, _type: SankeyElementType, e) => {
          getRelativeCoordinate(e);
        }}
        onMouseEnter={(_item: SankeyNodeProps | SankeyLinkProps, _type: SankeyElementType, e) => {
          getRelativeCoordinate(e);
        }}
        onMouseLeave={(_item: SankeyNodeProps | SankeyLinkProps, _type: SankeyElementType, e) => {
          getRelativeCoordinate(e);
        }}
      />
    );
  });
});
