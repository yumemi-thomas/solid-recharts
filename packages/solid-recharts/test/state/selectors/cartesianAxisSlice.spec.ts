// Tier-B port of recharts 3.8.1 test/state/selectors/cartesianAxisSlice.spec.ts
// (commit 7a23854).
//
// Deviation: recharts drives the slice through the Redux API
// (`configureStore({ reducer: { cartesianAxis } })` + `store.dispatch(addYAxis(...))`
// + `store.getState().cartesianAxis.yAxis[...]`). Our Solid-native store has no
// dispatch — actions are called directly (`store.actions.cartesianAxis.addYAxis(...)`)
// and state is read off `store.state.cartesianAxis`. Expectations are unchanged.
// Store writes are microtask-batched, so each action is followed by `flush()`.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { createRechartsStore } from "../../../src/state/store";
import type { YAxisSettings } from "../../../src/state/cartesianAxisSlice";

describe("cartesianAxisSlice", () => {
  describe("updateYAxisWidth", () => {
    const yAxis: YAxisSettings = {
      id: "test-axis",
      width: "auto",
      scale: "auto",
      type: "number",
      dataKey: undefined,
      unit: undefined,
      name: undefined,
      allowDuplicatedCategory: true,
      allowDataOverflow: false,
      reversed: false,
      includeHidden: false,
      domain: undefined,
      allowDecimals: true,
      tickCount: 5,
      ticks: undefined,
      tick: true,
      interval: "preserveEnd",
      mirror: false,
      minTickGap: 5,
      angle: 0,
      hide: false,
      tickFormatter: undefined,
      niceTicks: "auto",
      padding: { top: 0, bottom: 0 },
      orientation: "left",
    };

    it("should stop updating width after oscillation is detected", () => {
      const store = createRechartsStore();

      store.actions.cartesianAxis.addYAxis(yAxis);
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe("auto");

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 50 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(50);

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 51 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(51);

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 50 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(50);

      // This is the 4th action. The oscillation should be detected and the update ignored.
      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 51 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(50);
    });

    it("should keep updating if the oscillation is larger than 1 pixel because that is likely to be intentional", () => {
      // https://github.com/recharts/recharts/issues/6424
      const store = createRechartsStore();

      store.actions.cartesianAxis.addYAxis(yAxis);
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe("auto");

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 50 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(50);

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 52 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(52);

      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 50 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(50);

      // This is the 4th action. The oscillation is larger than 1 pixel, so the update should be accepted.
      store.actions.cartesianAxis.updateYAxisWidth({ id: "test-axis", width: 52 });
      flush();
      expect(store.state.cartesianAxis.yAxis["test-axis"]?.width).toBe(52);
    });
  });
});
