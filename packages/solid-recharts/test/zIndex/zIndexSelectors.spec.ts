import { describe, it, expect } from "vitest";
import { createRechartsStore } from "../../src/state/store";
import {
  selectZIndexPortalElement,
  selectAllRegisteredZIndexes,
} from "../../src/zIndex/zIndexSelectors";

describe("zIndexSelectors", () => {
  describe("selectZIndexPortalElement", () => {
    it("should select zIndex portal elements correctly", () => {
      const store = createRechartsStore();

      expect(selectZIndexPortalElement(store.state, 1, false)).toBeUndefined();
      expect(selectZIndexPortalElement(store.state, -1, false)).toBeUndefined();

      const element1 = document.createElement("div");
      const element2 = document.createElement("div");
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: 1,
        element: element1,
        isPanorama: false,
      });
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: -1,
        element: element2,
        isPanorama: false,
      });
      expect(selectZIndexPortalElement(store.state, 1, false)).toBe(element1);
      expect(selectZIndexPortalElement(store.state, -1, false)).toBe(element2);

      store.actions.zIndex.unregisterZIndexPortalElement({ zIndex: 1, isPanorama: false });
      expect(selectZIndexPortalElement(store.state, 1, false)).toBeUndefined();
      expect(selectZIndexPortalElement(store.state, -1, false)).toBe(element2);
    });

    it("should return undefined for undefined zIndex", () => {
      const store = createRechartsStore();
      expect(selectZIndexPortalElement(store.state, undefined, true)).toBeUndefined();
      expect(selectZIndexPortalElement(store.state, undefined, false)).toBeUndefined();
    });

    it("should differentiate between panorama and main chart", () => {
      const store = createRechartsStore();

      const mainElement = document.createElement("div");
      const panoramaElement = document.createElement("div");
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: 10,
        element: mainElement,
        isPanorama: false,
      });
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: 10,
        element: panoramaElement,
        isPanorama: true,
      });
      expect(selectZIndexPortalElement(store.state, 10, false)).toBe(mainElement);
      expect(selectZIndexPortalElement(store.state, 10, true)).toBe(panoramaElement);
    });
  });

  describe("selectAllRegisteredZIndexes", () => {
    it("should select all registered zIndexes correctly", () => {
      const store = createRechartsStore();

      expect(selectAllRegisteredZIndexes(store.state)).toEqual([
        -100, -50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      store.actions.zIndex.registerZIndexPortal({ zIndex: 2 });
      store.actions.zIndex.registerZIndexPortal({ zIndex: -3 });
      store.actions.zIndex.registerZIndexPortal({ zIndex: 1 });

      expect(selectAllRegisteredZIndexes(store.state)).toEqual([
        -100, -50, -3, 1, 2, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      store.actions.zIndex.unregisterZIndexPortal({ zIndex: 1 });
      expect(selectAllRegisteredZIndexes(store.state)).toEqual([
        -100, -50, -3, 2, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      store.actions.zIndex.unregisterZIndexPortal({ zIndex: -3 });
      store.actions.zIndex.unregisterZIndexPortal({ zIndex: 2 });
      expect(selectAllRegisteredZIndexes(store.state)).toEqual([
        -100, -50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);
    });

    it("should memoize results based on array contents", () => {
      const store = createRechartsStore();

      store.actions.zIndex.registerZIndexPortal({ zIndex: 5 });
      store.actions.zIndex.registerZIndexPortal({ zIndex: 10 });

      const firstSelection = selectAllRegisteredZIndexes(store.state);
      const secondSelection = selectAllRegisteredZIndexes(store.state);

      expect(firstSelection).toBe(secondSelection);

      store.actions.zIndex.registerZIndexPortal({ zIndex: 15 });

      const thirdSelection = selectAllRegisteredZIndexes(store.state);
      expect(thirdSelection).not.toBe(firstSelection);
      expect(thirdSelection).toEqual([
        -100, -50, 5, 10, 15, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      const element1 = document.createElement("div");
      const element2 = document.createElement("div");
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: 5,
        element: element1,
        isPanorama: false,
      });
      store.actions.zIndex.registerZIndexPortalElement({
        zIndex: 5,
        element: element2,
        isPanorama: true,
      });
      const fourthSelection = selectAllRegisteredZIndexes(store.state);
      expect(fourthSelection).toBe(thirdSelection);
    });

    it("should not duplicate zIndex when registered multiple times", () => {
      const store = createRechartsStore();

      store.actions.zIndex.registerZIndexPortal({ zIndex: 50 });
      const firstSelection = selectAllRegisteredZIndexes(store.state);
      expect(firstSelection).toEqual([
        -100, -50, 50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      store.actions.zIndex.registerZIndexPortal({ zIndex: 50 });
      const secondSelection = selectAllRegisteredZIndexes(store.state);
      expect(secondSelection).toEqual([
        -100, -50, 50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);
      expect(secondSelection).toBe(firstSelection);
    });

    it("should not affect zIndex list when only registering/unregistering portal element", () => {
      const store = createRechartsStore();

      const initialSelection = selectAllRegisteredZIndexes(store.state);
      expect(initialSelection).toEqual([
        -100, -50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);

      const element = document.createElement("div");
      store.actions.zIndex.registerZIndexPortalElement({ zIndex: 100, element, isPanorama: false });
      const afterRegister = selectAllRegisteredZIndexes(store.state);
      expect(afterRegister).toEqual([
        -100, -50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);
      expect(afterRegister).toBe(initialSelection);

      store.actions.zIndex.unregisterZIndexPortalElement({ zIndex: 100, isPanorama: false });
      const afterUnregister = selectAllRegisteredZIndexes(store.state);
      expect(afterUnregister).toEqual([
        -100, -50, 100, 200, 300, 400, 500, 600, 1000, 1100, 1200, 2000,
      ]);
      expect(afterUnregister).toBe(initialSelection);
    });
  });
});
