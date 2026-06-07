// Tier-B port of recharts 3.8.1 test/state/graphicalItemsSlice.spec.ts (commit 7a23854).
//
// Deviation: recharts drives the slice through the Redux API
// (`store.dispatch(addCartesianGraphicalItem(item))` + `store.getState()`). Our
// Solid-native store has no dispatch — actions are called directly
// (`store.actions.graphicalItems.addCartesianGraphicalItem(item)`) and state is
// read via selectors against `store.state`. Expectations are unchanged.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { createRechartsStore } from "../../src/state/store";
import { PageData } from "../_data";
import { selectUnfilteredCartesianItems } from "../../src/state/selectors/axisSelectors";
import { BarSettings } from "../../src/state/types/BarSettings";
import { LineSettings } from "../../src/state/types/LineSettings";
import { AreaSettings } from "../../src/state/types/AreaSettings";

describe("graphicalItemsSlice", () => {
  const item1: BarSettings = {
    maxBarSize: 0,
    minPointSize: 0,
    id: "my-bar",
    isPanorama: false,
    type: "bar",
    stackId: undefined,
    dataKey: undefined,
    data: PageData,
    xAxisId: "x",
    yAxisId: "y",
    zAxisId: 0,
    hide: false,
    barSize: undefined,
    hasCustomShape: false,
  };

  const item2: LineSettings = {
    id: "my-line",
    isPanorama: false,
    type: "line",
    dataKey: undefined,
    data: PageData,
    xAxisId: "x",
    yAxisId: "y",
    zAxisId: 0,
    hide: false,
  };

  const item3: AreaSettings = {
    baseValue: undefined,
    connectNulls: false,
    id: "my-area",
    isPanorama: false,
    type: "area",
    stackId: undefined,
    dataKey: "a",
    data: PageData,
    xAxisId: "x",
    yAxisId: "y",
    zAxisId: 0,
    hide: false,
    barSize: undefined,
  };

  it("should add and remove graphical items from state", () => {
    const store = createRechartsStore();
    expect(selectUnfilteredCartesianItems(store.state)).toHaveLength(0);

    store.actions.graphicalItems.addCartesianGraphicalItem(item1);
    flush();
    expect(selectUnfilteredCartesianItems(store.state)).toEqual([item1]);

    store.actions.graphicalItems.removeCartesianGraphicalItem(item1);
    flush();
    expect(selectUnfilteredCartesianItems(store.state)).toHaveLength(0);
  });

  it("should replace graphical items in state and keep the order", () => {
    const store = createRechartsStore();
    expect(selectUnfilteredCartesianItems(store.state)).toHaveLength(0);

    store.actions.graphicalItems.addCartesianGraphicalItem(item1);
    store.actions.graphicalItems.addCartesianGraphicalItem(item2);
    flush();
    expect(selectUnfilteredCartesianItems(store.state)).toEqual([item1, item2]);

    // Replace item1 with item3
    store.actions.graphicalItems.replaceCartesianGraphicalItem({ prev: item1, next: item3 });
    flush();

    // item3 is now in place of item1, and item2 remains on the second position
    expect(selectUnfilteredCartesianItems(store.state)).toEqual([item3, item2]);
  });
});
