// Ported from recharts 3.8.1 test/util/svgPropertiesNoEvents.spec.tsx.
//
// Harness changes: no React import; `CSSProperties` (react) → `JSX.CSSProperties`
// (@solidjs/web). The `svgPropertiesNoEvents` (plain-object) tests are Tier A,
// byte-identical. For `svgPropertiesNoEventsFromUnknown`, the object/primitive/
// null cases port directly; the THREE React-element cases (passing `<svg .../>`
// / `<circle .../>` and expecting prop extraction) are DEFERRED — a Solid
// element is a DOM node, not an introspectable `{ props }` structure, so that
// branch lands with the Tier-2 element-or-props pattern (ActiveShapeUtils).
import { describe, expect, it } from "vitest";
import type { JSX } from "@solidjs/web";
import {
  svgPropertiesNoEvents,
  svgPropertiesNoEventsFromUnknown,
} from "../../src/util/svgPropertiesNoEvents";

describe("svgPropertiesNoEvents", () => {
  it("should return an empty object when called with an empty object", () => {
    expect(svgPropertiesNoEvents({})).toEqual({});
  });

  it("should allow only SVG properties and exclude event handlers", () => {
    const input = {
      "aria-label": "test",
      className: "svg-class",
      color: "red",
      height: "100px",
      id: "svg-id",
      lang: "en",
      max: 10,
      media: "all",
      method: "get",
      min: 0,
      name: "svg-name",
      style: { fill: "blue" },
      // event handlers are valid SVG properties, but this function should exclude them too
      onClick: () => {},
      onMouseOver: () => {},
      // Non-SVG properties
      custom: "not-a-svg-prop",
    };

    const output = svgPropertiesNoEvents(input);

    // `className` is renamed to the Solid/DOM `class` attribute.
    expect(output).toEqual({
      "aria-label": "test",
      class: "svg-class",
      color: "red",
      height: "100px",
      id: "svg-id",
      lang: "en",
      max: 10,
      media: "all",
      method: "get",
      min: 0,
      name: "svg-name",
      style: { fill: "blue" },
    });
  });

  it("should return an empty object when no SVG properties are present", () => {
    const input = {
      onClick: () => {},
      onMouseOver: () => {},
      custom: "not-a-svg-prop",
    };

    const output = svgPropertiesNoEvents(input);

    expect(output).toEqual({});
  });

  it("should handle an empty object", () => {
    const input = {};
    const output = svgPropertiesNoEvents(input);
    expect(output).toEqual({});
  });

  it("should filter to SVG properties and rename camelCase keys", () => {
    type InputType = {
      "aria-label"?: string;
      className?: string;
      color?: string;
      height?: string;
      id?: string;
      lang?: string;
      max: number;
      media?: string;
      method?: string;
      min?: number;
      name?: string;
      style?: JSX.CSSProperties;
      // Non-SVG properties
      onClick?: () => void;
      onMouseOver?: () => void;
      custom?: string;
    };
    const input: InputType = {
      "aria-label": "test",
      className: "svg-class",
      color: "red",
      height: "100px",
      id: "svg-id",
      lang: "en",
      max: 10,
      media: "all",
      method: "get",
      min: 0,
      name: "svg-name",
      style: { fill: "blue" },
      // Non-SVG properties
      onClick: () => {},
      onMouseOver: () => {},
      custom: "not-a-svg-prop",
    };

    const output = svgPropertiesNoEvents(input);

    // The result is a DOM-ready record (Record<string, unknown>); `width` wasn't in
    // the input, so it's absent at runtime.
    expect(output.width).toBeUndefined();

    expect(output).toEqual({
      "aria-label": "test",
      class: "svg-class",
      color: "red",
      height: "100px",
      id: "svg-id",
      lang: "en",
      max: 10,
      media: "all",
      method: "get",
      min: 0,
      name: "svg-name",
      style: { fill: "blue" },
    });
  });

  it("should include data-* attributes", () => {
    const input = {
      "data-test": "test-value",
      "data-id": "123",
      nonDataProp: "value",
    };
    const result = svgPropertiesNoEvents(input);
    expect(result).toEqual({
      "data-test": "test-value",
      "data-id": "123",
    });
  });

  it("should exclude symbols and numbers as keys", () => {
    const sym = Symbol("test");
    const input: Record<string, unknown> = {
      [sym]: "symbol-value",
      6: "number-value",
      cx: 10,
    };
    const result = svgPropertiesNoEvents(input);
    expect(result).toEqual({ cx: 10 });
  });
});

describe("svgPropertiesNoEventsFromUnknown", () => {
  // DEFERRED: 'should filter element props if given a ReactElement' — needs
  // React-element introspection; see the file header note.

  it.each([null, undefined, true, false, [], "string", 1, Symbol.for("key")] as const)(
    "should return null when passed %s",
    (input) => {
      const result: Record<string, unknown> | null = svgPropertiesNoEventsFromUnknown(input);
      expect(result).toBeNull();
    },
  );

  describe("type matching ActiveDotType", () => {
    it("should return null type when passed a boolean", () => {
      const input = true;
      const result: Record<string, unknown> | null = svgPropertiesNoEventsFromUnknown(input);
      expect(result).toBeNull();
    });

    it("should return null type when passed a function", () => {
      const input = () => {};
      const result: Record<string, unknown> | null = svgPropertiesNoEventsFromUnknown(input);
      expect(result).toBeNull();
    });

    // DEFERRED: two 'should return SVGProps type when passed a non-specific
    // ReactElement' cases (<circle .../>) — React-element introspection.

    it("should return SVGProps type when passed an object", () => {
      type InputType = {
        cx: number;
        cy: number;
        r?: number;
        onClick?: () => void;
        custom?: string;
      };
      const input: InputType = { cx: 10, cy: 10, r: 5 };
      const result: Record<string, unknown> | null = svgPropertiesNoEventsFromUnknown(input);
      expect(result).toEqual({ cx: 10, cy: 10, r: 5 });
    });

    it("should accept union types and return only SVG properties", () => {
      type InputType =
        | {
            cx: number;
            cy: number;
            r?: number;
            onClick?: () => void;
            custom?: string;
          }
        | boolean;
      function noInfer(i: InputType) {
        return svgPropertiesNoEventsFromUnknown(i);
      }
      const input1: InputType = { cx: 10, cy: 10, r: 5 };
      const result1: Record<string, unknown> | null = noInfer(input1);
      expect(result1).toEqual({ cx: 10, cy: 10, r: 5 });

      const input2: InputType = true;
      const result2: Record<string, unknown> | null = noInfer(input2);
      expect(result2).toBeNull();
    });
  });
});
