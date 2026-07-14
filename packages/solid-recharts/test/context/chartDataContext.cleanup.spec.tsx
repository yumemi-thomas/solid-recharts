import { createSignal, Show } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ChartDataContextProvider, SetComputedData } from "../../src/context/chartDataContext";
import { RechartsStoreContext } from "../../src/state/RechartsStoreContext";
import { createRechartsStore } from "../../src/state/store";

describe("chart data context cleanup", () => {
  it("clears chart data when its reporter is disposed", () => {
    const store = createRechartsStore();
    const data = [{ value: 1 }];
    const [mounted, setMounted] = createSignal(true);

    render(() => (
      <RechartsStoreContext.Provider value={store}>
        <Show when={mounted()}>
          <ChartDataContextProvider chartData={data} />
        </Show>
      </RechartsStoreContext.Provider>
    ));

    expect(store.state.chartData.chartData).toEqual(data);
    setMounted(false);
    expect(store.state.chartData.chartData).toBeUndefined();
  });

  it("runs SetComputedData teardown when its reporter is disposed", () => {
    const store = createRechartsStore();
    const data = [{ value: 1 }];
    const computedData = { nodes: [] };
    const [mounted, setMounted] = createSignal(true);
    store.actions.chartData.setChartData(data);

    render(() => (
      <RechartsStoreContext.Provider value={store}>
        <Show when={mounted()}>
          <SetComputedData computedData={computedData} />
        </Show>
      </RechartsStoreContext.Provider>
    ));

    expect(store.state.chartData.computedData).toEqual(computedData);
    setMounted(false);
    expect(store.state.chartData.chartData).toBeUndefined();
  });
});
