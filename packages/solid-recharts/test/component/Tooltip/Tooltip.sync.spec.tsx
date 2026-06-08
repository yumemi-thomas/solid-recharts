import { describe, expect, it } from "vitest";
import { flush } from "solid-js";

import { createRechartsStore } from "../../../src/state/store";
import {
  selectActiveCoordinate,
  selectActiveIndex,
  selectIsTooltipActive,
} from "../../../src/state/selectors/tooltipSelectors";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.sync.spec.tsx.
 *
 * Only the pure-store selector cases (`describe('selectActiveCoordinate')`,
 * `describe('selectIsTooltipActive')`, `describe('selectActiveIndex')`) are
 * ported here: they drive a bare `createRechartsStore()` and read selectors, so
 * they need no cross-chart synchronisation wiring.
 *
 * The bulk of this reference spec exercises CROSS-CHART tooltip/cursor/brush
 * synchronisation (two charts sharing a `syncId`, `createSynchronisedSelectorTestCase`,
 * `selectSynchronisedTooltipState`, `selectSyncId`). That mechanism is explicitly
 * DEFERRED in this port — RechartsWrapper documents cross-chart synchronisation as
 * not yet wired — so those cases are left unported (see the run report's `blocked`).
 *
 * Solid adaptations:
 *  - Redux `store.dispatch(actionCreator(payload))` -> Solid slice action
 *    `store.actions.tooltip.<fn>(payload)` + `flush()` (store writes are batched).
 *  - `store.getState()` -> `store.state`.
 *  - tooltip selector exports live in `state/selectors/tooltipSelectors`, not
 *    `state/selectors/selectors`.
 */

describe("Tooltip synchronization", () => {
  describe("selectActiveCoordinate", () => {
    it("should return undefined for initial state", () => {
      const store = createRechartsStore();
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual(undefined);
    });

    it("should return coordinate after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 3, y: 4 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      flush();
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({ x: 3, y: 4 });
    });

    it("should return coordinate after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        coordinate: { x: 5, y: 6 },
        dataKey: "uv",
        index: "1",
        label: "Page B",
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      flush();
      const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({ x: 5, y: 6 });
    });
  });

  describe("selectIsTooltipActive", () => {
    it("should return false for initial state", () => {
      const store = createRechartsStore();
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: null,
        isActive: false,
      });
    });

    it("should return true after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 0, y: 0 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      flush();
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: "1",
        isActive: true,
      });
    });

    it("should return true after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        dataKey: "uv",
        index: "1",
        label: "Page B",
        coordinate: { x: 0, y: 0 },
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      flush();
      const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
      expect(actual).toEqual({
        activeIndex: "1",
        isActive: true,
      });
    });
  });

  describe("selectActiveIndex", () => {
    it("should return null for initial state", () => {
      const store = createRechartsStore();
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual(null);
    });

    it("should return index after mouseMoveAction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setMouseOverAxisIndex({
        activeCoordinate: { x: 0, y: 0 },
        activeDataKey: "uv",
        activeIndex: "1",
      });
      flush();
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual("1");
    });

    it("should return index after setSyncInteraction", () => {
      const store = createRechartsStore();
      store.actions.tooltip.setSyncInteraction({
        active: true,
        dataKey: "uv",
        index: "2",
        label: "Page B",
        coordinate: { x: 0, y: 0 },
        sourceViewBox: { x: 0, y: 0, width: 100, height: 100 },
        graphicalItemId: undefined,
      });
      flush();
      const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
      expect(actual).toEqual("2");
    });
  });
});
