import { describe, it } from "vitest";
import { Text, getRelativeCoordinate } from "../../src";

// Ported from recharts 3.8.1 test/component/Text.typed.spec.tsx.

describe("Text types", () => {
  it("should allow calling getRelativeCoordinate with the type provided by Recharts event handler", () => {
    return (
      <Text
        onClick={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseDown={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseUp={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseMove={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseLeave={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseOver={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseOut={(e) => {
          getRelativeCoordinate(e);
        }}
        onMouseEnter={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchStart={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchMove={(e) => {
          getRelativeCoordinate(e);
        }}
        onTouchEnd={(e) => {
          getRelativeCoordinate(e);
        }}
      />
    );
  });
});
