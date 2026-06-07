import { describe } from "vitest";
import { selectChartOffsetInternal } from "../../../src/state/selectors/selectChartOffsetInternal";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectChartOffset.spec.tsx.
 * The "should be stable" test (reselect reference stability via repeated
 * useAppSelector reads) is omitted — N/A in this no-reselect Solid rewrite; see
 * the selectorTestHelpers header and the test-porting-tier1-tier2-done memory.
 */

describe("selectChartOffset", () => {
  shouldReturnUndefinedOutOfContext(selectChartOffsetInternal);
  shouldReturnFromInitialState(selectChartOffsetInternal, {
    bottom: 5,
    brushBottom: 5,
    height: 0,
    left: 5,
    right: 5,
    top: 5,
    width: 0,
  });
});
