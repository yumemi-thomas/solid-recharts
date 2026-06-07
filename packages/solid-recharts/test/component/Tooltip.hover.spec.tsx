// Hover spec for the Tooltip vertical: a mousemove over the chart activates the
// axis tooltip. Exercises the pointer→index path — getRelativeCoordinate →
// selectActivePropsFromChartPointer (isInCartesianRange + calculateActiveTickIndex
// + getActiveCartesianCoordinate) → setMouseOverAxisIndex → the same payload
// pipeline the defaultIndex spec covers.
//
// jsdom getBoundingClientRect is all-zero, so getRelativeCoordinate's scale is 1
// and relativeX === clientX. The point x-scale over 6 categories in [20, 380]
// places index 2 ("Page C") at x = 164; a mousemove there selects it.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { LineChart, Line, XAxis, Tooltip } from "../../src";
import { PageData } from "../_data";

describe("<Tooltip /> hover (axis)", () => {
  it("activates the tooltip at the hovered category", () => {
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

    // The tooltip box is always in the DOM (visibility toggles); before any
    // interaction it carries no payload items.
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);

    const wrapper = container.querySelector(".recharts-wrapper");
    expect(wrapper).not.toBeNull();

    // Hover over index 2 ("Page C") at x = 164, y mid-plot.
    fireEvent.mouseMove(wrapper as Element, { clientX: 164, clientY: 200 });
    flush();
    vi.runOnlyPendingTimers();
    flush();

    const label = container.querySelector(".recharts-tooltip-label");
    expect(label?.textContent).toBe("Page C");
    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual(["300"]);

    // The cursor highlight (a vertical line for a LineChart) renders while active.
    expect(container.querySelector(".recharts-tooltip-cursor")).not.toBeNull();

    // Leaving the chart clears the active payload and the cursor.
    fireEvent.mouseLeave(wrapper as Element);
    flush();
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);
    expect(container.querySelector(".recharts-tooltip-cursor")).toBeNull();
  });
});
