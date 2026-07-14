// Item-type tooltip spec: with `<Tooltip shared={false}>` (eventType 'item'),
// hovering a single Bar rectangle activates the tooltip for THAT bar — exercising
// the tooltipContext item-dispatch hooks (useMouseEnterItemDispatch →
// setActiveMouseOverItemIndex) + combineTooltipPayloadConfigurations' item branch
// (filter by graphicalItemId) + the index-based payload searcher.
import { describe, expect, it } from "vitest";

import { render, fireEvent } from "@solidjs/testing-library";
import { BarChart, Bar, Tooltip } from "../../src";
import { PageData } from "../_data";

describe("<Tooltip /> item interaction", () => {
  it("shows the hovered bar's value (shared=false)", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Bar dataKey="uv" fill="#ff7300" isAnimationActive={false} />
        <Tooltip shared={false} />
      </BarChart>
    ));
    const rects = container.querySelectorAll(".recharts-bar-rectangle");
    expect(rects.length).toBe(PageData.length);
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);

    const firstRect = rects[0];
    if (firstRect == null) {
      throw new Error("expected a bar rectangle");
    }

    // Hover the FIRST bar (index 0 → uv 400).
    fireEvent.mouseEnter(firstRect);
    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    const names = [...container.querySelectorAll(".recharts-tooltip-item-name")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["uv"]);
    expect(values).toEqual(["400"]);

    // Leaving the bar clears it.
    fireEvent.mouseLeave(firstRect);
    expect(container.querySelectorAll(".recharts-tooltip-item")).toHaveLength(0);
  });
});
