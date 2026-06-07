import { describe, expect, it } from "vitest";
import { shouldReturnUndefinedOutOfContext } from "../../helper/selectorTestHelpers";
import {
  implicitXAxis,
  implicitYAxis,
  implicitZAxis,
  selectBaseAxis,
} from "../../../src/state/selectors/axisSelectors";
import { createRechartsStore } from "../../../src/state/store";
import type { RechartsRootState } from "../../../src/state/store";
import {
  implicitAngleAxis,
  implicitRadiusAxis,
} from "../../../src/state/selectors/polarAxisSelectors";

/*
 * Ported from recharts 3.8.1 test/state/selectors/selectBaseAxis.spec.tsx.
 * The "should be stable between renders" test is omitted — reselect reference
 * stability is N/A in this no-reselect Solid rewrite (store state read via
 * `store.state`, not `getState()`).
 */

describe("selectBaseAxis", () => {
  const selector = (state: RechartsRootState) => selectBaseAxis(state, "xAxis", "0");
  shouldReturnUndefinedOutOfContext(selector);

  it("should return implicit XAxis when called with initial state", () => {
    const initialState = createRechartsStore().state;
    const result = selectBaseAxis(initialState, "xAxis", "0");
    expect(result).toBe(implicitXAxis);
  });

  it("should return implicit YAxis when called with initial state", () => {
    const initialState = createRechartsStore().state;
    const result = selectBaseAxis(initialState, "yAxis", "0");
    expect(result).toBe(implicitYAxis);
  });

  it("should return implicit ZAxis when called with initial state", () => {
    const initialState = createRechartsStore().state;
    const result = selectBaseAxis(initialState, "zAxis", "0");
    expect(result).toBe(implicitZAxis);
  });

  it("should return implicit PolarAngleAxis when called with initial state", () => {
    const initialState = createRechartsStore().state;
    const result = selectBaseAxis(initialState, "angleAxis", "0");
    expect(result).toEqual({ ...implicitAngleAxis, type: "category" });
  });

  it("should return implicit RadiusAxis when called with initial state", () => {
    const initialState = createRechartsStore().state;
    const result = selectBaseAxis(initialState, "radiusAxis", "0");
    expect(result).toEqual({ ...implicitRadiusAxis, type: "category" });
  });
});
