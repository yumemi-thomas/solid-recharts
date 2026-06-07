// Touch spec for the Tooltip vertical (axis path): a touchmove activates the
// tooltip at the touched category, mirroring the hover path through
// selectActivePropsFromChartPointer → setMouseOverAxisIndex.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { LineChart, Line, XAxis, Tooltip } from "../../src";
import { PageData } from "../_data";

describe("<Tooltip /> touch (axis)", () => {
  it("activates the tooltip at the touched category", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <Line dataKey="uv" stroke="#ff7300" />
        <Tooltip />
      </LineChart>
    ));
    flush();

    const wrapper = container.querySelector(".recharts-wrapper") as Element;
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);

    // Touch over index 2 ("Page C") at x = 164 (point scale over [20, 380]).
    fireEvent.touchMove(wrapper, { touches: [{ clientX: 164, clientY: 200 }] });
    flush();

    expect(container.querySelector(".recharts-tooltip-label")?.textContent).toBe("Page C");
    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual(["300"]);
  });
});
