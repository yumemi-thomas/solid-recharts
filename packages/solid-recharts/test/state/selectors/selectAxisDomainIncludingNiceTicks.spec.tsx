// Port of recharts 3.8.1 test/state/selectors/selectAxisDomainIncludingNiceTicks.spec.tsx
// (commit 7a23854). The out-of-context + initial-state VALUE cases are ported; the
// `assertStableBetweenRenders` reselect reference-stability case is omitted — N/A in the
// no-reselect Solid store (see selectorTestHelpers header / state-architecture-decision).
import { describe } from "vitest";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { selectAxisDomainIncludingNiceTicks } from "../../../src/state/selectors/axisSelectors";
import { RechartsRootState } from "../../../src/state/store";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";

describe("selectAxisDomainIncludingNiceTicks", () => {
  const selector = (state: RechartsRootState) =>
    selectAxisDomainIncludingNiceTicks(state, "xAxis", defaultAxisId, false);
  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);
});
