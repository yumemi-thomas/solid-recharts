// Ported from recharts 3.8.1 test/state/selectors/brushSelectors.spec.tsx.
// The vendored "should return brush height if set" case uses <Customized> to
// mount a probe inside the chart store; we have no Customized (PERMANENT-N/A —
// findAllByType/Customized), so it is reproduced via createSelectorTestCase,
// which renders a Spy child inside the chart store and spies the selector value.
import { describe, expect } from "vitest";
import { BarChart, Brush } from "../../../src";
import { selectBrushHeight } from "../../../src/state/selectors/selectChartOffsetInternal";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";

describe("selectBrushHeight", () => {
  shouldReturnUndefinedOutOfContext(selectBrushHeight);
  shouldReturnFromInitialState(selectBrushHeight, 0);

  const renderTestCase = createSelectorTestCase((props) => (
    <BarChart width={100} height={100}>
      <Brush height={7} />
      {props.children}
    </BarChart>
  ));

  it("should return brush height if set", () => {
    const { spy } = renderTestCase(selectBrushHeight);
    expect(spy).toHaveBeenLastCalledWith(7);
  });
});
