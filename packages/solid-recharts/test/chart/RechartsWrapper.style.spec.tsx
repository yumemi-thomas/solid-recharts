// Not a recharts port: pins which of `width`/`height` and `style` wins in the chart wrapper's
// inline style. recharts builds it as
// `{ position: 'relative', cursor: 'default', width, height, ...style }`
// (vendor/recharts-reference/src/chart/RechartsWrapper.tsx:399-405), so a `style.width` /
// `style.height` overrides the `width` / `height` props in the CSS, while the chart's layout size
// still comes from the props first (`width={width ?? style?.width}`, :396-397).
import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { BarChart } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";

function wrapperOf(container: HTMLElement): HTMLElement {
  const wrapper = container.querySelector<HTMLElement>(".recharts-wrapper");
  assertNotNull(wrapper);
  return wrapper;
}

describe("chart wrapper inline style", () => {
  it("uses the width and height props as CSS lengths when the style has none", () => {
    const { container } = render(() => <BarChart width={300} height={200} />);
    flush();

    const wrapper = wrapperOf(container);
    expect(wrapper.style.position).toBe("relative");
    expect(wrapper.style.cursor).toBe("default");
    expect(wrapper.style.width).toBe("300px");
    expect(wrapper.style.height).toBe("200px");
  });

  it("keeps the other `style` properties next to the width and height props", () => {
    const { container } = render(() => (
      <BarChart width={300} height={200} style={{ "background-color": "red" }} />
    ));
    flush();

    const wrapper = wrapperOf(container);
    expect(wrapper.style.backgroundColor).toBe("red");
    expect(wrapper.style.width).toBe("300px");
    expect(wrapper.style.height).toBe("200px");
  });

  it("lets style.width and style.height override the width and height props, as recharts does", () => {
    const { container } = render(() => (
      <BarChart width={300} height={200} style={{ width: "500px", height: "100px" }} />
    ));
    flush();

    const wrapper = wrapperOf(container);
    expect(wrapper.style.width).toBe("500px");
    expect(wrapper.style.height).toBe("100px");
    // The chart is still laid out from the props.
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "300");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("lets only the dimension the style sets override its prop", () => {
    const { container } = render(() => (
      <BarChart width={300} height={200} style={{ width: "50%" }} />
    ));
    flush();

    const wrapper = wrapperOf(container);
    expect(wrapper.style.width).toBe("50%");
    expect(wrapper.style.height).toBe("200px");
  });
});
