// Tier B port of recharts 3.8.1 test/state/chartDataSlice.spec.ts.
//
// The recharts spec tests the Redux contract — `chartDataReducer(state, action)`
// and the `setChartData(payload)` action creator. The Solid-native port has no
// reducer/action-object, so this is re-expressed against the slice's store +
// action functions. The EXPECTED VALUES are golden-anchored to recharts (same
// start/end indices, same clearing behavior). Identity assertions (`toBe` on the
// stored array) become structural (`toEqual`): a Solid store proxies nested
// values, so the stored array is a reactive proxy, not the original reference.
import { describe, it, expect } from "vitest";

import { createChartDataSlice } from "../../src/state/chartDataSlice";

describe("chartDataSlice", () => {
  it("should start with undefined chartData", () => {
    const { state } = createChartDataSlice();
    expect(state.chartData).toBeUndefined();
    expect(state.dataStartIndex).toBe(0);
    expect(state.dataEndIndex).toBe(0);
  });

  it("should set chartData array with start and end index", () => {
    const chartData = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const { state, actions } = createChartDataSlice();
    actions.setChartData(chartData);
    expect(state.chartData).toEqual(chartData);
    expect(state.dataStartIndex).toBe(0);
    expect(state.dataEndIndex).toBe(2);
  });

  it("should set empty array with start and end index", () => {
    const chartData: never[] = [];
    const { state, actions } = createChartDataSlice();
    actions.setChartData(chartData);
    expect(state.chartData).toEqual(chartData);
    expect(state.dataStartIndex).toBe(0);
    expect(state.dataEndIndex).toBe(0);
  });

  it("should clear the state when set undefined", () => {
    const chartData = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const { state, actions } = createChartDataSlice();
    actions.setChartData(chartData);
    actions.setChartData(undefined);
    expect(state.chartData).toBeUndefined();
    expect(state.dataStartIndex).toBe(0);
    expect(state.dataEndIndex).toBe(0);
  });
});
