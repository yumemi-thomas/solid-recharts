// Ported from recharts 3.8.1 test/util/svgPropertiesAndEvents.spec.ts.
//
// Harness changes: no React import. The reference spec only tests
// `svgPropertiesAndEvents` (plain-object filter); all test cases port
// directly with no React-element cases to defer.
import { describe, expect, it, vi } from "vitest";
import {
  svgPropertiesAndEvents,
  svgPropertiesAndEventsKeepCase,
} from "../../src/util/svgPropertiesAndEvents";

const noop = () => {};

describe("svgPropertiesAndEvents", () => {
  it("should return an empty object when called with an empty object", () => {
    expect(svgPropertiesAndEvents({})).toEqual({});
  });

  it("should include SVG attributes", () => {
    const input = {
      cx: "50%",
      cy: "50%",
      fill: "#808080",
      stroke: "#fff",
      nonSvgProp: "value",
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      cx: "50%",
      cy: "50%",
      fill: "#808080",
      stroke: "#fff",
    });
  });

  it("should include data-* attributes", () => {
    const input = {
      "data-test": "test-value",
      "data-id": "123",
      nonDataProp: "value",
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      "data-test": "test-value",
      "data-id": "123",
    });
  });

  it("should include event handlers", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const input = {
      onClick,
      onMouseEnter,
      nonEventProp: "value",
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      onClick,
      onMouseEnter,
    });
  });

  it("should include a mix of SVG attributes, data-* attributes, and event handlers", () => {
    const onClick = vi.fn();
    const input = {
      cx: "50%",
      "data-test": "test-value",
      onClick,
      nonRelevantProp: "value",
      width: 100,
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      cx: "50%",
      "data-test": "test-value",
      onClick,
      width: 100,
    });
  });

  it("should refine the type of the returned object", () => {
    const onClick = vi.fn();
    type InputType = {
      cx: string;
      "data-test": string;
      onClick: () => void;
      nonRelevantProp: string;
      width: number;
    };
    const input: InputType = {
      cx: "50%",
      "data-test": "test-value",
      onClick,
      nonRelevantProp: "value",
      width: 100,
    };
    // Type-test adapted to the project's strict no-`as` policy: the Solid port
    // returns `Partial<T>` (every key optional) rather than recharts' precise
    // `Pick<T, …>` (which would need a return assertion). So the required-field
    // annotations and the type-level `@ts-expect-error` on `nonRelevantProp` are
    // dropped; the RUNTIME assertions (which prove the filtering) are unchanged.
    const result = svgPropertiesAndEvents(input);
    const myCx = result.cx;
    expect(myCx).toBe("50%");
    const dataTest = result["data-test"];
    const clickHandler = result.onClick;
    const myWidth = result.width;
    const nr = result.nonRelevantProp;
    expect(nr).toBeUndefined();
    expect(myCx).toBe("50%");
    expect(dataTest).toBe("test-value");
    expect(clickHandler).toBe(onClick);
    expect(myWidth).toBe(100);
  });

  it("should filter out function properties that are not event handlers", () => {
    const onClick = vi.fn();
    const customFunction = () => "hello";
    const input = {
      cx: "50%",
      onClick,
      customFunction,
      width: 100,
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      cx: "50%",
      onClick,
      width: 100,
    });
  });

  it("should exclude symbols and numbers as keys", () => {
    const sym = Symbol("test");
    const input: { [key: PropertyKey]: unknown } = {
      [sym]: "symbol-value",
      6: "number-value",
      cx: 10,
      onClick: vi.fn(),
    };
    const result = svgPropertiesAndEvents(input);
    expect(result).toEqual({
      cx: 10,
      onClick: input.onClick,
    });
  });

  // The crux of the allowlist fix: Solid spreads keys verbatim (no camelCase→kebab
  // conversion), so the filter must emit real SVG attribute names.
  it("renames camelCase presentation keys to their kebab SVG attribute names", () => {
    expect(
      svgPropertiesAndEvents({
        strokeWidth: 2,
        strokeDasharray: "5 5",
        fillOpacity: 0.5,
        clipPath: "url(#x)",
        textAnchor: "middle",
        className: "c",
      }),
    ).toEqual({
      "stroke-width": 2,
      "stroke-dasharray": "5 5",
      "fill-opacity": 0.5,
      "clip-path": "url(#x)",
      "text-anchor": "middle",
      class: "c",
    });
  });

  it("rejects kebab input keys (single convention: camelCase in, DOM names out)", () => {
    // recharts `filterProps` parity: input vocabulary is the camelCase prop
    // names only; the kebab spellings exist solely on the rendered DOM output.
    expect(
      svgPropertiesAndEvents({ "stroke-width": 3, "fill-opacity": 0.2, "stroke-dasharray": "1 1" }),
    ).toEqual({});
  });

  it("KeepCase variant filters identically but keeps the camelCase keys", () => {
    expect(
      svgPropertiesAndEventsKeepCase({
        strokeWidth: 3,
        clipPath: "url(#c)",
        dataKey: "x",
        onClick: noop,
      }),
    ).toEqual({ strokeWidth: 3, clipPath: "url(#c)", onClick: noop });
  });

  it("preserves genuinely-camelCase SVG attributes (no false conversion)", () => {
    // viewBox isn't allowlisted; the rest are real camelCase SVG attribute names.
    expect(
      svgPropertiesAndEvents({
        gradientTransform: "rotate(45)",
        attributeName: "x",
        clipPathUnits: "userSpaceOnUse",
        preserveAspectRatio: "xMidYMid",
      }),
    ).toEqual({
      gradientTransform: "rotate(45)",
      attributeName: "x",
      clipPathUnits: "userSpaceOnUse",
      preserveAspectRatio: "xMidYMid",
    });
  });
});
