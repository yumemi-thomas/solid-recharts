// Regression gate for the memoized selector graph (ADR-0002).
//
// This is the direct test of the performance win: the expensive
// applied-values / displayed-data chain must be SHARED (a repeat call returns
// the identical reference) and must NOT be invalidated by a tooltip/mousemove
// interaction (the classic recharts hotspot), while STILL invalidating when the
// underlying chart data actually changes. Reference identity is the observable
// proxy for "did the O(series×points) combiner re-run".
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { Line, LineChart, XAxis } from "../../../src";
import { useAppStore } from "../../../src/state/hooks";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";
import {
  selectAllAppliedValues,
  selectAxisDomain,
  selectAxisScale,
  selectCartesianItemsSettings,
  selectDisplayedData,
  selectNumericalDomain,
  selectTicksOfGraphicalItem,
} from "../../../src/state/selectors/axisSelectors";
import type { RechartsStore } from "../../../src/state/store";

const data = [
  { name: "a", uv: 10 },
  { name: "b", uv: 30 },
  { name: "c", uv: 20 },
  { name: "d", uv: 40 },
];

function renderChartAndCaptureStore(): RechartsStore {
  let store: RechartsStore | undefined;
  const Capture = (): null => {
    store = useAppStore();
    return null;
  };
  render(() => (
    <LineChart width={200} height={200} data={data}>
      <XAxis dataKey="name" />
      <Line dataKey="uv" isAnimationActive={false} />
      <Capture />
    </LineChart>
  ));
  flush();
  flush();
  flush();
  if (store == null) {
    throw new Error("store capture failed");
  }
  return store;
}

describe("memoized selector graph", () => {
  it("shares the applied-values chain: a repeat call returns the identical reference", () => {
    const store = renderChartAndCaptureStore();
    const first = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);
    const second = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);
    expect(second).toBe(first);
    // The intermediate nodes are shared too.
    expect(selectDisplayedData(store.state, "xAxis", defaultAxisId, false)).toBe(
      selectDisplayedData(store.state, "xAxis", defaultAxisId, false),
    );
    expect(selectCartesianItemsSettings(store.state, "xAxis", defaultAxisId)).toBe(
      selectCartesianItemsSettings(store.state, "xAxis", defaultAxisId),
    );
  });

  it("does NOT invalidate the data chain on a tooltip/mousemove interaction (the fan-out win)", () => {
    const store = renderChartAndCaptureStore();
    const before = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);
    const displayedBefore = selectDisplayedData(store.state, "xAxis", defaultAxisId, false);

    // Simulate the per-frame mousemove state write.
    store.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "2",
      activeDataKey: undefined,
      activeCoordinate: { x: 50, y: 50 },
    });
    flush();

    const after = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);
    const displayedAfter = selectDisplayedData(store.state, "xAxis", defaultAxisId, false);
    // The expensive chain is untouched by the interaction — same references,
    // so no combiner re-ran. This is what collapses the ~10× mousemove fan-out.
    expect(after).toBe(before);
    expect(displayedAfter).toBe(displayedBefore);
  });

  it("keeps the full domain→scale→ticks chain stable across a mousemove", () => {
    const store = renderChartAndCaptureStore();
    const axes = ["xAxis", "yAxis"] as const;
    const before = axes.map((axisType) => ({
      numericalDomain: selectNumericalDomain(store.state, axisType, defaultAxisId, false),
      axisDomain: selectAxisDomain(store.state, axisType, defaultAxisId, false),
      scale: selectAxisScale(store.state, axisType, defaultAxisId, false),
      ticks: selectTicksOfGraphicalItem(store.state, axisType, defaultAxisId, false),
    }));

    store.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeDataKey: undefined,
      activeCoordinate: { x: 30, y: 30 },
    });
    flush();

    axes.forEach((axisType, i) => {
      const prev = before[i]!;
      expect(selectNumericalDomain(store.state, axisType, defaultAxisId, false)).toBe(
        prev.numericalDomain,
      );
      expect(selectAxisDomain(store.state, axisType, defaultAxisId, false)).toBe(prev.axisDomain);
      expect(selectAxisScale(store.state, axisType, defaultAxisId, false)).toBe(prev.scale);
      expect(selectTicksOfGraphicalItem(store.state, axisType, defaultAxisId, false)).toBe(
        prev.ticks,
      );
    });
  });

  it("DOES invalidate when the chart data changes (correctness)", () => {
    const store = renderChartAndCaptureStore();
    const before = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);

    store.actions.chartData.setChartData([
      { name: "a", uv: 11 },
      { name: "b", uv: 31 },
      { name: "c", uv: 21 },
    ]);
    flush();

    const after = selectAllAppliedValues(store.state, "xAxis", defaultAxisId, false);
    expect(after).not.toBe(before);
    expect(after.map((v) => v.value)).toEqual(["a", "b", "c"]);
  });
});
