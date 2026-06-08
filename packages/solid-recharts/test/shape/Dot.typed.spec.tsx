import { describe, it } from "vitest";
import { Dot, getRelativeCoordinate } from "../../src";

// Ported from recharts 3.8.1 test/shape/Dot.typed.spec.tsx.
// Solid deviation: event handlers are native single-arg DOM handlers (recharts passes
// (dotProps, event)); the lone event arg satisfies getRelativeCoordinate's MousePointer /
// TouchPointer overloads. Mirrors the sibling Cross.typed.spec.tsx port.

describe("Dot types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Dot
        cx={10}
        cy={10}
        r={5}
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
