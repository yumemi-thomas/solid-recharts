// Solid-recharts spec (no recharts counterpart): regression tests for the
// zIndex slice's per-store isolation. The slice once shallow-copied
// `initialZIndexState.zIndexMap`, so every chart store wrapped the SAME
// module-level ZIndexEntry objects — one chart registering its portal <g>
// overwrote every other chart's portal element and graphical items portal'd
// into a different chart's svg (bars rendered inside a sibling pie chart).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { createRechartsStore } from "../../src/state/store";
import { initialZIndexState } from "../../src/state/zIndexSlice";
import { DefaultZIndexes } from "../../src/zIndex/DefaultZIndexes";
import { selectZIndexPortalElement } from "../../src/zIndex/zIndexSelectors";
import { assertNotNull } from "../helper/assertNotNull";

describe("zIndexSlice", () => {
  it("keeps portal element registrations isolated between two stores", () => {
    const storeA = createRechartsStore();
    const storeB = createRechartsStore();
    const elementA = document.createElement("g");
    const elementB = document.createElement("g");

    storeA.actions.zIndex.registerZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      element: elementA,
      isPanorama: false,
    });
    flush();
    storeB.actions.zIndex.registerZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      element: elementB,
      isPanorama: false,
    });
    flush();

    // Pre-fix, B's registration overwrote the shared default entry, so A
    // resolved B's element here.
    expect(selectZIndexPortalElement(storeA.state, DefaultZIndexes.bar, false)).toBe(elementA);
    expect(selectZIndexPortalElement(storeB.state, DefaultZIndexes.bar, false)).toBe(elementB);
  });

  it("does not mutate the module-level initial state when registering", () => {
    const store = createRechartsStore();
    const element = document.createElement("g");

    store.actions.zIndex.registerZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      element,
      isPanorama: false,
    });
    flush();

    const initialEntry = initialZIndexState.zIndexMap[DefaultZIndexes.bar];
    assertNotNull(initialEntry);
    expect(initialEntry.element).toBeUndefined();
    expect(initialEntry.consumers).toBe(0);
  });

  it("unregistering an element in one store leaves the other store's element intact", () => {
    const storeA = createRechartsStore();
    const storeB = createRechartsStore();
    const elementA = document.createElement("g");
    const elementB = document.createElement("g");

    storeA.actions.zIndex.registerZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      element: elementA,
      isPanorama: false,
    });
    storeB.actions.zIndex.registerZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      element: elementB,
      isPanorama: false,
    });
    flush();

    storeB.actions.zIndex.unregisterZIndexPortalElement({
      zIndex: DefaultZIndexes.bar,
      isPanorama: false,
    });
    flush();

    expect(selectZIndexPortalElement(storeA.state, DefaultZIndexes.bar, false)).toBe(elementA);
    expect(selectZIndexPortalElement(storeB.state, DefaultZIndexes.bar, false)).toBeUndefined();
  });
});
