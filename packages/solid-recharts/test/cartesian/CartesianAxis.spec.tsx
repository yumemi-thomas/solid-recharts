// Port of recharts 3.8.1 test/cartesian/CartesianAxis.spec.tsx (commit 7a23854): renders
// <CartesianAxis> directly inside a <Surface> with explicit ticks. Solid idioms: React
// `className` → `class` (the function-form tick still receives recharts' `className` key
// in its props, applied as `class`). Deferred: the getComputedStyle measurement-span
// assertion (internal text-measure plumbing) and ELEMENT-form `tick`/`label` (Solid can't
// React.cloneElement an already-evaluated element to inject computed x/y — function form
// covers it).
import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import { render } from "@solidjs/testing-library";
import { CartesianAxis, Surface } from "../../src";
import type { CartesianTickContentProps, TickItem } from "../../src/util/types";
import type { LabelContentType } from "../../src/component/Label";

const CustomizeLabel: LabelContentType = (props) => (
  <text data-testid="customized-label" x={props.x} y={props.y}>
    test
  </text>
);

const CustomizedTick = (props: CartesianTickContentProps) => (
  <text data-testid="customized-tick" x={props.x} y={props.y} class={props.class}>
    test
  </text>
);

const exampleScale = scaleLinear();

describe("<CartesianAxis />", () => {
  const ticks: ReadonlyArray<TickItem> = [
    { value: 10, coordinate: 50, index: 0, offset: 0 },
    { value: 1000, coordinate: 100, index: 1, offset: 0 },
    { value: 20, coordinate: 150, index: 2, offset: 0 },
    { value: 40, coordinate: 200, index: 3, offset: 0 },
    { value: 90, coordinate: 250, index: 4, offset: 0 },
  ];

  it("Renders 5 ticks in simple CartesianAxis", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="test"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  it("Renders no ticks in simple CartesianAxis", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={[]}
          label="test"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(0);
  });

  it('Renders ticks when interval="preserveStartEnd"', () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="test"
          interval="preserveStartEnd"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
  });

  it('Renders ticks when interval="preserveStart"', () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="test"
          interval="preserveStart"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
  });

  it("Renders 5 ticks in a CartesianAxis which has orientation top", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="top"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="top"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  it("Renders 5 ticks in a CartesianAxis which has orientation left", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="left"
          y={100}
          width={50}
          height={400}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="left"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  it("Renders 5 ticks in a CartesianAxis which has orientation right", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="right"
          y={100}
          width={50}
          height={400}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label="right"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(1);
  });

  it("Renders label when label is a function", () => {
    const view = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="left"
          y={100}
          width={50}
          height={400}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          label={CustomizeLabel}
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(view.container.querySelectorAll(".recharts-cartesian-axis-tick")).toHaveLength(5);
    expect(view.getAllByTestId("customized-label")).toHaveLength(1);
  });

  it("Render customized ticks when tick is set to be a function", () => {
    const view = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          tick={CustomizedTick}
          interval={0}
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(view.getAllByTestId("customized-tick")).toHaveLength(ticks.length);
  });

  it("Renders no ticks when tick is set to false", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          tick={false}
          scale={exampleScale}
          ticks={ticks}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick-value")).toHaveLength(0);
  });

  it("Renders additional class when passed via tick options", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          tick={{ class: "custom" }}
          label="test"
          scale={exampleScale}
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-cartesian-axis-tick-value.custom")).toHaveLength(
      ticks.length,
    );
  });

  it("Renders with merged class when customized tick is provided", () => {
    const view = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          tick={CustomizedTick}
          interval={0}
        />
      </Surface>
    ));

    const tickElements = view.getAllByTestId("customized-tick");
    expect(tickElements).toHaveLength(ticks.length);
    tickElements.forEach((element) => {
      expect(element).toHaveClass("recharts-cartesian-axis-tick-value");
    });
  });

  it("Respects user-provided textAnchor prop on horizontal axis", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          textAnchor="start"
          scale={exampleScale}
        />
      </Surface>
    ));

    const tickTexts = container.querySelectorAll(".recharts-cartesian-axis-tick-value");
    expect(tickTexts).toHaveLength(5);
    tickTexts.forEach((text) => {
      expect(text).toHaveAttribute("text-anchor", "start");
    });
  });

  it("Uses default textAnchor when not provided", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          scale={exampleScale}
        />
      </Surface>
    ));

    const tickTexts = container.querySelectorAll(".recharts-cartesian-axis-tick-value");
    expect(tickTexts).toHaveLength(5);
    tickTexts.forEach((text) => {
      expect(text).toHaveAttribute("text-anchor", "middle");
    });
  });

  it("Appends a user class to the axis Layer (recharts: className)", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          class="my-axis"
          scale={exampleScale}
        />
      </Surface>
    ));

    const layer = container.querySelector(".recharts-cartesian-axis");
    expect(layer).not.toBeNull();
    expect(layer).toHaveClass("my-axis");
  });

  it("Merges tickTextProps into each tick Text, keeping the tick-value class", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          tickTextProps={{ fill: "red", fontSize: 20 }}
          scale={exampleScale}
        />
      </Surface>
    ));

    const tickTexts = container.querySelectorAll(".recharts-cartesian-axis-tick-value");
    expect(tickTexts).toHaveLength(5);
    tickTexts.forEach((text) => {
      expect(text).toHaveAttribute("fill", "red");
      expect(text).toHaveAttribute("font-size", "20");
      expect(text).toHaveClass("recharts-cartesian-axis-tick-value");
    });
  });

  it("Applies fontSize and letterSpacing props to the tick text", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <CartesianAxis
          orientation="bottom"
          y={100}
          width={400}
          height={50}
          viewBox={{ x: 0, y: 0, width: 500, height: 500 }}
          ticks={ticks}
          fontSize={14}
          letterSpacing="0.5em"
          scale={exampleScale}
        />
      </Surface>
    ));

    const tickTexts = container.querySelectorAll(".recharts-cartesian-axis-tick-value");
    expect(tickTexts).toHaveLength(5);
    tickTexts.forEach((text) => {
      expect(text).toHaveAttribute("font-size", "14");
      expect(text).toHaveAttribute("letter-spacing", "0.5em");
    });
  });
});
