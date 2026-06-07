// Ported from recharts 3.8.1 test/state/selectors/containerSelectors.spec.tsx
// (commit 7a23854). Solid deviations: rerender assertions are driven by signals.
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import { BarChart, ComposedChart } from "../../../src";
import { createRechartsStore } from "../../../src/state/store";
import {
  selectChartHeight,
  selectChartWidth,
  selectContainerScale,
  selectMargin,
} from "../../../src/state/selectors/containerSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import {
  mockHTMLElementProperty,
  restoreHTMLElementProperties,
} from "../../helper/mockHTMLElementProperty";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

afterEach(() => {
  restoreHTMLElementProperties();
});

describe("selectContainerScale", () => {
  shouldReturnUndefinedOutOfContext(selectContainerScale);
  shouldReturnFromInitialState(selectContainerScale, 1);

  it("should return 1 in an initial state", () => {
    const store = createRechartsStore();
    expect(selectContainerScale(store.state)).toBe(1);
  });

  it("should return scale after it was set using an action", () => {
    const store = createRechartsStore();
    store.actions.layout.setScale(1.25);
    flush();
    expect(selectContainerScale(store.state)).toBe(1.25);
  });

  it("should return scale as the ratio of DOMRect / offsetWidth", () => {
    mockGetBoundingClientRect(
      {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      },
      false,
    );
    mockHTMLElementProperty("offsetWidth", 5);
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={5} height={6}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(selectContainerScale);
    expectLastCalledWith(spy, 3 / 5);
  });

  it("should return scale: 1 in jsdom because jsdom returns zeroes everywhere", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart width={5} height={6}>
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase(selectContainerScale);
    expectLastCalledWith(spy, 1);
  });
});

describe("selectMargin", () => {
  shouldReturnUndefinedOutOfContext(selectMargin);
  shouldReturnFromInitialState(selectMargin, {
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
  });

  it("should return margin from root chart props, and update it when props change", () => {
    const [margin, setMargin] = createSignal({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart margin={margin()} width={500} height={300}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectMargin);
    expectLastCalledWith(spy, {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });

    setMargin({ top: 20, right: 20, bottom: 20, left: 20 });
    rerenderSameComponent();
    expectLastCalledWith(spy, {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    });
  });
});

describe("selectChartWidth", () => {
  shouldReturnUndefinedOutOfContext(selectChartWidth);
  shouldReturnFromInitialState(selectChartWidth, 0);

  it("should return width when set from action", () => {
    const store = createRechartsStore();
    store.actions.layout.setChartSize({ width: 500, height: 300 });
    flush();
    expect(selectChartWidth(store.state)).toBe(500);
  });

  it("should return width from root chart props, and update it when props change", () => {
    const [size, setSize] = createSignal({ width: 500, height: 300 });
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={size().width} height={size().height}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectChartWidth);
    expectLastCalledWith(spy, 500);

    setSize({ width: 600, height: 400 });
    rerenderSameComponent();
    expectLastCalledWith(spy, 600);
  });
});

describe("selectChartHeight", () => {
  shouldReturnUndefinedOutOfContext(selectChartHeight);
  shouldReturnFromInitialState(selectChartHeight, 0);

  it("should return height when set from action", () => {
    const store = createRechartsStore();
    store.actions.layout.setChartSize({ width: 500, height: 300 });
    flush();
    expect(selectChartHeight(store.state)).toBe(300);
  });

  it("should return height from root chart props, and update it when props change", () => {
    const [size, setSize] = createSignal({ width: 500, height: 300 });
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={size().width} height={size().height}>
        {props.children}
      </BarChart>
    ));
    const { spy, rerenderSameComponent } = renderTestCase(selectChartHeight);
    expectLastCalledWith(spy, 300);

    setSize({ width: 600, height: 400 });
    rerenderSameComponent();
    expectLastCalledWith(spy, 400);
  });
});
