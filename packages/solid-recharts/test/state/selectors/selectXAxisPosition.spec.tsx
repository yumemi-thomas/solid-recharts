import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectXAxisPosition } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectXAxisPosition.spec.tsx.
 * The "should be stable between renders" test is omitted — reselect reference
 * stability is N/A in this no-reselect Solid rewrite (see selectorTestHelpers
 * header and the test-porting-tier1-tier2-done memory).
 */

describe("selectXAxisPosition", () => {
  const selector = (state: RechartsRootState) => selectXAxisPosition(state, defaultAxisId);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, { x: 5, y: 0 });
});
