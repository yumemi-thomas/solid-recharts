import { describe } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectStackGroups } from "../../../src/state/selectors/axisSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectStackGroups.spec.tsx.
 * Only the pure value assertions are ported; the render-based cases (Customized +
 * useAppSelectorWithStableTest + fireEvent) assert reselect stability / require the
 * render-spy item-registration path and are deferred (see selectorTestHelpers and
 * the test-porting-tier1-tier2-done memory).
 */

describe("selectStackGroups", () => {
  const selector = (state: RechartsRootState) => selectStackGroups(state, "xAxis", 0, false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, {});
});
