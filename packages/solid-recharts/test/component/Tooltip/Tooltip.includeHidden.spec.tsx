import { describe, it } from "vitest";
import { Area, Bar, ComposedChart, Line, Scatter, Tooltip, XAxis, YAxis } from "../../../src";
import { PageData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectTooltipNotVisible, expectTooltipPayload, showTooltip } from "./tooltipTestHelpers";
import { composedChartMouseHoverTooltipSelector } from "./tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.visibility.spec.tsx
 * "includeHidden prop" block — the two rendered-text behavioral assertions.
 * The block's many selector-shape tests (selectTooltipAxis settings shape, etc.)
 * are omitted (brittle vs this port's settings shape); these two cover the actual
 * includeHidden behaviour: with `includeHidden`, hidden series still appear in the
 * tooltip; without it, only visible series do.
 */

describe("Tooltip includeHidden prop", () => {
  describe("when includeHidden = true", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={400} height={400} data={PageData}>
        <Area dataKey="uv" hide name="1" />
        <Bar dataKey="pv" hide name="2" />
        <Line dataKey="amt" hide name="3" />
        <Scatter dataKey="uv" hide name="4" />
        <Line dataKey="pv" name="5" />
        <XAxis type="number" dataKey="amt" name="stature" unit="cm" />
        <YAxis type="number" dataKey="pv" name="weight" unit="kg" />
        <Tooltip includeHidden />
        {props.children}
      </ComposedChart>
    ));

    it("should render tooltip payload for hidden items", () => {
      mockGetBoundingClientRect({ width: 100, height: 100 });
      const { container } = renderTestCase();

      expectTooltipNotVisible(container);

      showTooltip(container, composedChartMouseHoverTooltipSelector);

      expectTooltipPayload(container, "2400", [
        "1 : 400",
        "2 : 2400",
        "3 : 2400",
        "5 : 2400",
        "stature : 2400cm",
        "weight : 2400kg",
      ]);
    });
  });

  describe("when includeHidden = false", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={400} height={400} data={PageData}>
        <Area dataKey="uv" hide name="1" />
        <Bar dataKey="pv" hide name="2" />
        <Line dataKey="amt" hide name="3" />
        <Scatter dataKey="uv" hide name="4" />
        <Line dataKey="pv" name="5" />
        <XAxis type="number" dataKey="amt" name="stature" unit="cm" />
        <YAxis type="number" dataKey="pv" name="weight" unit="kg" />
        <Tooltip includeHidden={false} />
        {props.children}
      </ComposedChart>
    ));

    it("should hide tooltip for hidden items", () => {
      mockGetBoundingClientRect({ width: 100, height: 100 });
      const { container } = renderTestCase();

      expectTooltipNotVisible(container);

      showTooltip(container, composedChartMouseHoverTooltipSelector);

      expectTooltipPayload(container, "2400", ["5 : 2400"]);
    });
  });
});
