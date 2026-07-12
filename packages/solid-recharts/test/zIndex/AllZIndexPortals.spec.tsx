// Ported from recharts 3.8.1 test/zIndex/AllZIndexPortals.spec.tsx (commit 7a23854).
//
// Harness adaptation (Tier-A, behaviour byte-identical): recharts wraps the
// component in react-redux `<Provider store context>` and dispatches actions via
// `store.dispatch(action)` inside `act(() => …)`. The Solid-native store has no
// Redux runtime — the store is `{ state, actions }`, provided via
// `RechartsStoreContext`, and actions are called directly. Reactive `<For>`
// re-renders are driven by `flush()` (Solid batches store writes on a microtask
// boundary), so `act(() => { dispatch; vi.runOnlyPendingTimers() })` becomes
// `store.actions.zIndex.registerZIndexPortal(…)` + `flush()`.
import { beforeEach, describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { RechartsStoreContext } from "../../src/state/RechartsStoreContext";
import { AllZIndexPortals } from "../../src/zIndex/ZIndexPortal";
import { createRechartsStore, type RechartsStore } from "../../src/state/store";
import { selectAllRegisteredZIndexes } from "../../src/zIndex/zIndexSelectors";
import { DefaultZIndexes } from "../../src/zIndex/DefaultZIndexes";
import { isNotNil } from "../../src/util/DataUtils";

describe("AllZIndexPortals", () => {
  let store: RechartsStore;

  beforeEach(() => {
    store = createRechartsStore();
  });

  it("should add z-index portal when z-index consumer is registered", () => {
    const { container } = render(() => (
      <svg>
        <RechartsStoreContext value={store}>
          <AllZIndexPortals isPanorama={false}>child</AllZIndexPortals>
        </RechartsStoreContext>
      </svg>
    ));
    flush();

    const allZIndexes = selectAllRegisteredZIndexes(store.state);

    const newZIndexDefinitelyNotOneOfTheDefaults =
      Object.values(DefaultZIndexes).reduce(
        (acc, val) => Math.max(acc, val),
        Number.NEGATIVE_INFINITY,
      ) + 1;

    // all z-index portals should be rendered (they are <g> elements with tabIndex={-1})
    expect(container.querySelectorAll('g[tabindex="-1"]')).toHaveLength(allZIndexes.length);

    store.actions.zIndex.registerZIndexPortal({ zIndex: newZIndexDefinitelyNotOneOfTheDefaults });
    flush();

    // After registering, should have one more z-index portal
    const zIndexPortals = container.querySelectorAll('g[tabindex="-1"]');
    expect(zIndexPortals).toHaveLength(allZIndexes.length + 1);
  });

  it("should render one child for each of the registered elements", () => {
    const { container } = render(() => (
      <svg>
        <RechartsStoreContext value={store}>
          <AllZIndexPortals isPanorama={false}>
            <div data-testid="child">child</div>
          </AllZIndexPortals>
        </RechartsStoreContext>
      </svg>
    ));
    flush();

    const state = store.state;

    const renderedElements = Array.from(container.querySelectorAll('g[tabindex="-1"]'));
    const storedElementIds = Object.values(state.zIndex.zIndexMap)
      .map((entry) => entry.element?.id)
      .filter(isNotNil);

    expect(renderedElements).toHaveLength(storedElementIds.length);

    // each rendered element should be in the store
    renderedElements.forEach((el) => {
      expect(storedElementIds).toContain(el.id);
    });
  });
});
