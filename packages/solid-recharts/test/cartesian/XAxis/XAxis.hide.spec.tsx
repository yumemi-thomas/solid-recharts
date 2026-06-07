// Ported from recharts 3.8.1 test/cartesian/XAxis/XAxis.hide.spec.tsx (commit 7a23854).
import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { Line, LineChart, XAxis } from "../../../src";
import { selectAxisScale } from "../../../src/state/selectors/axisSelectors";
import { pageData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("XAxis hide", () => {
  it("Don't render x-axis when hide is set to be true", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart
        width={400}
        height={400}
        data={pageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis hide />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
        {props.children}
      </LineChart>
    ));
    const { container, spy } = renderTestCase((state) =>
      selectAxisScale(state, "xAxis", 0, false)?.domain(),
    );
    flush();

    expect(container.querySelectorAll(".recharts-xAxis")).toHaveLength(0);
    expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5, 6]);
  });
});
