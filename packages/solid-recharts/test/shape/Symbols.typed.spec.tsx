import { describe, it } from "vitest";
import { Symbols, getRelativeCoordinate } from "../../src";

// Ported from recharts 3.8.1 test/shape/Symbols.typed.spec.tsx.

describe("Symbols types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Symbols
        onClick={(e) => getRelativeCoordinate(e)}
        onMouseDown={(e) => getRelativeCoordinate(e)}
        onMouseUp={(e) => getRelativeCoordinate(e)}
        onMouseMove={(e) => getRelativeCoordinate(e)}
        onMouseLeave={(e) => getRelativeCoordinate(e)}
        onMouseOver={(e) => getRelativeCoordinate(e)}
        onMouseOut={(e) => getRelativeCoordinate(e)}
        onMouseEnter={(e) => getRelativeCoordinate(e)}
        onTouchStart={(e) => getRelativeCoordinate(e)}
        onTouchMove={(e) => getRelativeCoordinate(e)}
        onTouchEnd={(e) => getRelativeCoordinate(e)}
      />
    );
  });
});
