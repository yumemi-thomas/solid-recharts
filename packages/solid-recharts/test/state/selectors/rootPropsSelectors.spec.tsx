// Ported from recharts 3.8.1 test/state/selectors/rootPropsSelectors.spec.tsx
// (commit 7a23854). Solid deviations: update assertions are driven by signals.
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { Bar, BarChart } from "../../../src";
import { createRechartsStore } from "../../../src/state/store";
import {
  selectBarCategoryGap,
  selectBarGap,
  selectRootBarSize,
  selectRootMaxBarSize,
  selectSyncMethod,
} from "../../../src/state/selectors/rootPropsSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { SyncMethod } from "../../../src/util/types";

describe("selectRootMaxBarSize", () => {
  shouldReturnUndefinedOutOfContext(selectRootMaxBarSize);
  shouldReturnFromInitialState(selectRootMaxBarSize, undefined);

  it("should return undefined in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selectRootMaxBarSize);
    expectLastCalledWith(spy, undefined);
  });

  it("should return and update maxBarSize defined on chart root", () => {
    const [maxBarSize, setMaxBarSize] = createSignal(10);
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} maxBarSize={maxBarSize()}>
        <Bar maxBarSize={5} />
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectRootMaxBarSize);
    expectLastCalledWith(spy, 10);

    setMaxBarSize(20);
    rerenderSameComponent();
    expectLastCalledWith(spy, 20);
  });
});

describe("selectBarGap", () => {
  shouldReturnUndefinedOutOfContext(selectBarGap);
  shouldReturnFromInitialState(selectBarGap, 4);

  it("should return default value in a chart without barGap prop", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selectBarGap);
    expectLastCalledWith(spy, 4);
  });

  it("should return and update barGap defined on chart root", () => {
    const [barGap, setBarGap] = createSignal(10);
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} barGap={barGap()}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectBarGap);
    expectLastCalledWith(spy, 10);

    setBarGap(20);
    rerenderSameComponent();
    expectLastCalledWith(spy, 20);
  });
});

describe("selectBarCategoryGap", () => {
  shouldReturnUndefinedOutOfContext(selectBarCategoryGap);
  shouldReturnFromInitialState(selectBarCategoryGap, "10%");

  it("should return default value for initial state", () => {
    const store = createRechartsStore();
    expect(selectBarCategoryGap(store.state)).toBe("10%");
  });

  it("should return default value in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selectBarCategoryGap);
    expectLastCalledWith(spy, "10%");
  });

  it("should return and update barCategoryGap defined on chart root", () => {
    const [barCategoryGap, setBarCategoryGap] = createSignal<string | number>(10);
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} barCategoryGap={barCategoryGap()}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectBarCategoryGap);
    expectLastCalledWith(spy, 10);

    setBarCategoryGap(20);
    rerenderSameComponent();
    expectLastCalledWith(spy, 20);
  });
});

describe("selectRootBarSize", () => {
  shouldReturnUndefinedOutOfContext(selectRootBarSize);
  shouldReturnFromInitialState(selectRootBarSize, undefined);

  it("should return undefined in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selectRootBarSize);
    expectLastCalledWith(spy, undefined);
  });

  it("should return and update barSize defined on chart root", () => {
    const [barSize, setBarSize] = createSignal(10);
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} barSize={barSize()}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectRootBarSize);
    expectLastCalledWith(spy, 10);

    setBarSize(20);
    rerenderSameComponent();
    expectLastCalledWith(spy, 20);
  });
});

describe("selectSyncMethod", () => {
  it('should return "index" by default', () => {
    const store = createRechartsStore();
    expect(store.state.rootProps.syncMethod).toBe("index");
  });

  it("should return and update syncMethod defined on chart root", () => {
    const fn = () => 1;
    const [syncMethod, setSyncMethod] = createSignal<SyncMethod>("value");
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} syncMethod={syncMethod()}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectSyncMethod);
    expectLastCalledWith(spy, "value");

    setSyncMethod(() => fn);
    rerenderSameComponent();
    expectLastCalledWith(spy, fn);
  });
});
