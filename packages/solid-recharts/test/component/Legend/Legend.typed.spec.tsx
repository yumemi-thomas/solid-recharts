import { describe, it } from "vitest";
import { Legend, getRelativeCoordinate } from "../../../src";

// Ported from recharts 3.8.1 test/component/Legend.typed.spec.tsx (now test/component/Legend/ upstream).

describe("Legend types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Legend
        onClick={(_data, _index, e) => {
          getRelativeCoordinate(e);
        }}
        onMouseEnter={(_data, _index, e) => {
          getRelativeCoordinate(e);
        }}
        onMouseLeave={(_data, _index, e) => {
          getRelativeCoordinate(e);
        }}
      />
    );
  });
});
