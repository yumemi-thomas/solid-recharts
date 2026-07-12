// First-light spec for the Tooltip vertical: with `defaultIndex` the tooltip
// activates WITHOUT any mouse interaction, exercising the whole payload pipeline
// — SetTooltipEntrySettings registration → combineTooltipPayloadConfigurations →
// combineActiveTooltipIndex → combineTooltipPayload (findEntryInArray on the axis
// dataKey) → combineActiveLabel → DefaultTooltipContent rendering via the portal.
//
// `flush()` after render: the line/area register and the tooltip settings dispatch
// through microtask-batched effects, and the portal target attaches via a ref.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, Tooltip } from "../../src";
import { PageData } from "../_data";

describe("<Tooltip /> defaultIndex (first light)", () => {
  it("renders the default-index payload without any interaction", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <Line dataKey="uv" stroke="#ff7300" />
        <Tooltip defaultIndex={2} />
      </LineChart>
    ));
    flush();

    const tooltip = container.querySelector(".recharts-default-tooltip");
    expect(tooltip).not.toBeNull();

    // Label = the categorical X tick at index 2 → "Page C".
    const label = container.querySelector(".recharts-tooltip-label");
    expect(label?.textContent).toBe("Page C");

    // One item: name falls back to the dataKey ("uv"), value is uv at index 2 (300).
    const names = [...container.querySelectorAll(".recharts-tooltip-item-name")].map(
      (n) => n.textContent,
    );
    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["uv"]);
    expect(values).toEqual(["300"]);
  });
});
