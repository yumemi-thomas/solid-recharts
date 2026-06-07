import { describe } from "vitest";
import { selectAllXAxes, selectAllYAxes } from "../../../src/state/selectors/selectAllAxes";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";

// Ported from recharts 3.8.1 test/state/selectors/selectAllAxes.spec.tsx.

describe("selectAllXAxes", () => {
  shouldReturnUndefinedOutOfContext(selectAllXAxes);
  shouldReturnFromInitialState(selectAllXAxes, []);
});

describe("selectAllYAxes", () => {
  shouldReturnUndefinedOutOfContext(selectAllYAxes);
  shouldReturnFromInitialState(selectAllYAxes, []);
});
