import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectNumericalDomain } from "../../../src/state/selectors/axisSelectors";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectNumericalDomain.spec.tsx.
 * The "stable between renders" test is omitted (reselect stability — N/A here).
 */

describe("selectNumericalDomain", () => {
  const selector = (state: RechartsRootState) =>
    selectNumericalDomain(state, "xAxis", defaultAxisId, false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);
});
