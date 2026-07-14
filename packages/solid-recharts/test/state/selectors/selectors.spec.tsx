// Ported from recharts 3.8.1 test/state/selectors/selectors.spec.tsx
// (commit 7a23854). Solid deviations: upstream's Redux dispatch cases use the
// Solid-native store actions; tooltip selector exports live in tooltipSelectors.
import { createEffect } from "solid-js";
import { describe, expect, it, test, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { RechartsStoreProvider } from "../../../src/state/RechartsStoreProvider";
import { createRechartsStore, type RechartsRootState } from "../../../src/state/store";
import { arrayTooltipSearcher } from "../../../src/state/optionsSlice";
import { useTooltipEventType } from "../../../src/state/selectors/selectTooltipEventType";
import {
  selectActiveCoordinate,
  selectActiveIndex,
  selectActivePropsFromChartPointer,
  selectIsTooltipActive,
  selectTooltipPayload,
  selectTooltipPayloadConfigurations,
} from "../../../src/state/selectors/tooltipSelectors";
import { selectTooltipState } from "../../../src/state/selectors/selectTooltipState";
import { combineTooltipPayload } from "../../../src/state/selectors/combiners/combineTooltipPayload";
import { useAppSelector } from "../../../src/state/hooks";
import type {
  TooltipIndex,
  TooltipPayload,
  TooltipPayloadConfiguration,
  TooltipPayloadEntry,
} from "../../../src/state/tooltipSlice";
import { ChartDataState, initialChartDataState } from "../../../src/state/chartDataSlice";
import { noop } from "../../../src/util/DataUtils";
import type {
  Coordinate,
  PolarCoordinate,
  RelativePointer,
  TooltipEventType,
} from "../../../src/util/types";
import type { TooltipTrigger } from "../../../src/chart/types";
import { produceState } from "../../helper/produceState";
import {
  Area,
  BarChart,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
} from "../../../src";
import { PageData, pageData } from "../../_data";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { useAppSelectorWithStableTest } from "../../helper/selectorTestHelpers";

// preloadedState used by selectTooltipPayload cases (mirrors recharts).
const preloadedTooltipState: Partial<RechartsRootState> = {
  options: {
    tooltipPayloadSearcher: arrayTooltipSearcher,
    chartName: "",
    eventEmitter: undefined,
    defaultTooltipEventType: "axis",
  },
};
const tooltipActiveCoordinate: Coordinate = { x: 100, y: 200 };
const activeCoordinate: Coordinate = { x: 100, y: 200 };

const allTooltipEventTypes: ReadonlyArray<TooltipEventType> = ["axis", "item"];

const exampleTooltipPayloadConfiguration1: TooltipPayloadConfiguration = {
  settings: {
    fill: "fill",
    name: "name is ignored in Scatter in recharts 2.x",
    color: "color",
    dataKey: "dataKey1",
    nameKey: "nameKey1",
    graphicalItemId: "graphicalItemId1",
  },
  dataDefinedOnItem: [
    [
      {
        name: "stature",
        unit: "cm",
        value: 100,
        payload: { x: 100, y: 200, z: 200 },
        dataKey: "x",
      },
      { name: "weight", unit: "kg", value: 200, payload: { x: 100, y: 200, z: 200 }, dataKey: "y" },
    ],
  ],
  getPosition: noop,
};
const exampleTooltipPayloadConfiguration2: TooltipPayloadConfiguration = {
  settings: {
    fill: "fill 2",
    name: "name 2",
    color: "color 2",
    dataKey: "dataKey2",
    nameKey: "nameKey2",
    graphicalItemId: "graphicalItemId2",
  },
  dataDefinedOnItem: [
    [
      { name: "height", unit: "cm", value: 100, payload: { x: 100, y: 200, z: 200 }, dataKey: "x" },
      { name: "width", unit: "m", value: 4, payload: { x: 10, y: 20, z: 20 }, dataKey: "y" },
    ],
  ],
  getPosition: noop,
};

type TestCaseTooltipCombination = {
  tooltipEventType: TooltipEventType;
  trigger: TooltipTrigger;
};

const allTooltipCombinations: ReadonlyArray<TestCaseTooltipCombination> = [
  { tooltipEventType: "axis", trigger: "hover" },
  { tooltipEventType: "axis", trigger: "click" },
  { tooltipEventType: "item", trigger: "hover" },
  { tooltipEventType: "item", trigger: "click" },
];

describe("useTooltipEventType", () => {
  type TooltipEventTypeTestScenario = {
    testName: string;
    shared: undefined | boolean;
    defaultTooltipEventType: TooltipEventType;
    validateTooltipEventTypes: ReadonlyArray<TooltipEventType>;
    expected: TooltipEventType;
  };

  const testCases: ReadonlyArray<TooltipEventTypeTestScenario> = [
    {
      testName: "default case",
      shared: undefined,
      defaultTooltipEventType: "item",
      validateTooltipEventTypes: [],
      expected: "item",
    },
    {
      testName: "shared and axis type is allowed",
      shared: true,
      defaultTooltipEventType: "item",
      validateTooltipEventTypes: ["axis", "item"],
      expected: "axis",
    },
    {
      testName: "shared but axis type is not allowed",
      shared: true,
      defaultTooltipEventType: "item",
      validateTooltipEventTypes: ["item"],
      expected: "item",
    },
    {
      testName: "not shared and item type is allowed",
      shared: false,
      defaultTooltipEventType: "axis",
      validateTooltipEventTypes: ["axis", "item"],
      expected: "item",
    },
    {
      testName: "not shared but item type is not allowed",
      shared: false,
      defaultTooltipEventType: "axis",
      validateTooltipEventTypes: ["axis"],
      expected: "axis",
    },
  ];

  it("should return undefined when outside of store context", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const eventType = useTooltipEventType(undefined);
      createEffect(() => {
        const value = (() => eventType())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => <Comp />);
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  test.each(testCases)(
    "$testName should return $expected",
    ({ shared, defaultTooltipEventType, validateTooltipEventTypes, expected }) => {
      const spy = vi.fn();
      const Comp = (): null => {
        const eventType = useTooltipEventType(shared);
        createEffect(() => {
          const value = (() => eventType())();
          ((value) => spy(value))(value);
        });
        return null;
      };
      const preloadedState: Partial<RechartsRootState> = {
        options: {
          defaultTooltipEventType,
          validateTooltipEventTypes,
          tooltipPayloadSearcher: arrayTooltipSearcher,
          chartName: "",
          eventEmitter: undefined,
        },
      };
      render(() => (
        <RechartsStoreProvider preloadedState={preloadedState}>
          <Comp />
        </RechartsStoreProvider>
      ));
      expect(spy).toHaveBeenCalledWith(expected);
    },
  );
});

describe("selectActiveCoordinate", () => {
  it.each(allTooltipCombinations)(
    "should return undefined for initial state for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const store = createRechartsStore();
      const actual = selectActiveCoordinate(store.state, tooltipEventType, trigger, undefined);
      expect(actual).toEqual(undefined);
    },
  );

  it("should return coordinate after setMouseOverAxisIndex", () => {
    const store = createRechartsStore();
    store.actions.tooltip.setMouseOverAxisIndex({
      activeCoordinate: { x: 3, y: 4 },
      activeDataKey: "uv",
      activeIndex: "1",
    });
    const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
    expect(actual).toEqual({ x: 3, y: 4 });
  });

  it("should return coordinate after setMouseClickAxisIndex", () => {
    const store = createRechartsStore();
    store.actions.tooltip.setMouseClickAxisIndex({
      activeCoordinate: { x: 7, y: 8 },
      activeDataKey: "uv",
      activeIndex: "2",
    });
    const actual = selectActiveCoordinate(store.state, "axis", "click", undefined);
    expect(actual).toEqual({ x: 7, y: 8 });
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
    const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
    expect(actual).toEqual({ x: 5, y: 6 });
  });

  it("should return coordinates when mouseOverAxisIndex is fired and stop returning them after mouseLeaveChart", () => {
    const store = createRechartsStore(preloadedTooltipState);

    const initialState = createRechartsStore().state;
    const expected: Coordinate | PolarCoordinate | undefined = { x: 100, y: 150 };
    expect(selectActiveCoordinate(initialState, "axis", "hover", undefined)).toBe(undefined);

    store.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeCoordinate: expected,
      activeDataKey: undefined,
    });
    expect(selectActiveCoordinate(store.state, "axis", "hover", undefined)).toEqual(expected);

    store.actions.tooltip.mouseLeaveChart();
    expect(selectActiveCoordinate(store.state, "axis", "hover", undefined)).toEqual({
      x: 100,
      y: 150,
    });
    // the selector stops returning the coordinates but they should still be present in store for the next animation
    expect(store.state.tooltip.axisInteraction.hover.coordinate).toEqual(expected);
  });

  it("should return coordinates when mouseClickAxisIndex is fired and keep them after mouseLeaveChart", () => {
    const store = createRechartsStore(preloadedTooltipState);

    const initialState = createRechartsStore().state;
    const expected: Coordinate | PolarCoordinate | undefined = { x: 100, y: 150 };
    expect(selectActiveCoordinate(initialState, "axis", "click", undefined)).toBe(undefined);

    store.actions.tooltip.setMouseClickAxisIndex({
      activeIndex: "1",
      activeCoordinate: expected,
      activeDataKey: undefined,
    });
    expect(selectActiveCoordinate(store.state, "axis", "click", undefined)).toEqual(expected);

    store.actions.tooltip.mouseLeaveChart();
    expect(selectActiveCoordinate(store.state, "axis", "click", undefined)).toEqual(expected);
  });

  it("should return coordinates when mouseOverItemIndex is fired and keep them after mouseLeaveItem", () => {
    const store = createRechartsStore(preloadedTooltipState);

    const initialState = createRechartsStore().state;
    const expected: Coordinate | PolarCoordinate | undefined = { x: 100, y: 150 };
    expect(selectActiveCoordinate(initialState, "item", "hover", undefined)).toBe(undefined);

    store.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "1",
      activeCoordinate: expected,
      activeDataKey: undefined,
      activeGraphicalItemId: "id-1",
    });
    expect(selectActiveCoordinate(store.state, "item", "hover", undefined)).toEqual(expected);

    // neither of these reset the coordinates and the selector does NOT stop returning them
    store.actions.tooltip.mouseLeaveItem();
    store.actions.tooltip.mouseLeaveChart();
    expect(selectActiveCoordinate(store.state, "item", "hover", undefined)).toEqual({
      x: 100,
      y: 150,
    });
    // the selector stops returning the coordinates but they should still be present in store for the next animation
    expect(store.state.tooltip.itemInteraction.hover.coordinate).toEqual(expected);
  });

  it("should return coordinates when mouseClickItemIndex is fired and keep them after mouseLeaveItem", () => {
    const store = createRechartsStore(preloadedTooltipState);

    const initialState = createRechartsStore().state;
    const expected: Coordinate | PolarCoordinate | undefined = {
      x: 100,
      y: 150,
    };
    expect(selectActiveCoordinate(initialState, "item", "click", undefined)).toBe(undefined);

    store.actions.tooltip.setActiveClickItemIndex({
      activeIndex: "1",
      activeCoordinate: expected,
      activeDataKey: undefined,
      activeGraphicalItemId: "id-1",
    });
    expect(selectActiveCoordinate(store.state, "item", "click", undefined)).toEqual(expected);

    // neither of these should reset coordinate
    store.actions.tooltip.mouseLeaveItem();
    store.actions.tooltip.mouseLeaveChart();
    expect(selectActiveCoordinate(store.state, "item", "click", undefined)).toEqual(expected);
  });
});

describe("selectIsTooltipActive", () => {
  it.each(allTooltipCombinations)(
    "should return false for initial state for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const store = createRechartsStore();
      const actual = selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined);
      expect(actual).toEqual({
        activeIndex: null,
        isActive: false,
      });
    },
  );

  it("should return true after setMouseOverAxisIndex", () => {
    const store = createRechartsStore();
    store.actions.tooltip.setMouseOverAxisIndex({
      activeCoordinate: { x: 0, y: 0 },
      activeDataKey: "uv",
      activeIndex: "1",
    });
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
    const actual = selectIsTooltipActive(store.state, "axis", "hover", undefined);
    expect(actual).toEqual({
      activeIndex: "1",
      isActive: true,
    });
  });

  describe.each(allTooltipCombinations)(
    "tooltipEventType: $tooltipEventType tooltipTrigger: $trigger",
    ({ tooltipEventType, trigger }) => {
      it("should return true if a defaultIndex has been set", () => {
        const store = createRechartsStore();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, "1")).toEqual({
          isActive: true,
          activeIndex: "1",
        });
      });
    },
  );

  describe("trigger: hover", () => {
    const trigger = "hover";

    describe.each(allTooltipEventTypes)("tooltipEventType: %s", (tooltipEventType) => {
      it("should return false if user is clicking on a graphical item", () => {
        // in browser, this is difficult to reproduce - one usually has to mouse over first before clicking
        const store = createRechartsStore();
        store.actions.tooltip.setActiveClickItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });

      it("should return false if user is clicking on an axis", () => {
        // in browser, this is difficult to reproduce - one usually has to mouse over first before clicking
        const store = createRechartsStore();
        store.actions.tooltip.setMouseClickAxisIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });
    });

    describe("tooltipEventType: item", () => {
      const tooltipEventType = "item";
      it("should return true if user is hovering over a graphical item but not axis", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setMouseOverAxisIndex({
          activeIndex: "1",
          activeDataKey: undefined,
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
        store.actions.tooltip.setActiveMouseOverItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.mouseLeaveItem();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });

      it("should return false after mouse leaves the chart element", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setActiveMouseOverItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "id-1",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.mouseLeaveChart();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });
    });

    describe("tooltipEventType: axis", () => {
      const tooltipEventType = "axis";
      it(`should return true if user is hovering over an axis,
          and then continue returning true when user hovers over and then leaves a graphical item`, () => {
        const store = createRechartsStore();
        store.actions.tooltip.setActiveMouseOverItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
        store.actions.tooltip.setMouseOverAxisIndex({
          activeIndex: "1",
          activeDataKey: undefined,
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.setActiveMouseOverItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.mouseLeaveItem();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
      });

      it.todo("should return false after mouse leaves the chart element");
    });
  });

  describe("trigger: click", () => {
    const trigger = "click";

    describe.each(allTooltipEventTypes)("tooltipEventType: %s", (tooltipEventType) => {
      it("should return false if user is hovering over a graphical item", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setActiveMouseOverItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });

      it("should return false if user is hovering over an axis", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setMouseOverAxisIndex({
          activeIndex: null,
          activeDataKey: undefined,
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });
    });

    describe("tooltipEventType: item", () => {
      const tooltipEventType = "item";
      it(`should return true if user is clicking a graphical item and continue returning true forever,
          because recharts does not allow ever turning off a tooltip that was triggered by a click`, () => {
        const store = createRechartsStore();
        store.actions.tooltip.setActiveClickItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "foo",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.setActiveClickItemIndex({
          activeIndex: "2",
          activeDataKey: undefined,
          activeCoordinate,
          activeGraphicalItemId: "bar",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
        store.actions.tooltip.mouseLeaveItem();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
        store.actions.tooltip.setMouseClickAxisIndex({
          activeIndex: "1",
          activeDataKey: undefined,
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
      });

      it("should return false if user is clicking on an axis", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setMouseClickAxisIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: false,
          activeIndex: null,
        });
      });
    });

    describe("tooltipEventType: axis", () => {
      const tooltipEventType = "axis";
      it("should return true if user is clicking on an axis, and continue returning true forever", () => {
        const store = createRechartsStore();
        store.actions.tooltip.setMouseClickAxisIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "1",
        });
        store.actions.tooltip.setMouseClickAxisIndex({
          activeIndex: "2",
          activeDataKey: undefined,
          activeCoordinate,
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
        store.actions.tooltip.mouseLeaveItem();
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
        store.actions.tooltip.setActiveClickItemIndex({
          activeIndex: "1",
          activeDataKey: "dataKey1",
          activeCoordinate,
          activeGraphicalItemId: "id-1",
        });
        expect(selectIsTooltipActive(store.state, tooltipEventType, trigger, undefined)).toEqual({
          isActive: true,
          activeIndex: "2",
        });
      });
    });
  });
});

describe("selectActiveIndexFromChartPointer", () => {
  const exampleChartPointer: RelativePointer = {
    relativeX: 10,
    relativeY: 10,
  };

  it("should return active props after mouse hover", () => {
    const tooltipActiveSpy = vi.fn();
    mockGetBoundingClientRect({ width: 100, height: 100 });
    const Comp = (): null => {
      const props = useAppSelectorWithStableTest((state) =>
        selectActivePropsFromChartPointer(state, exampleChartPointer),
      );
      createEffect(() => {
        const value = (() => props())();
        ((value) => tooltipActiveSpy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart data={pageData} width={100} height={100}>
        <Line dataKey="pv" />
        <Comp />
      </LineChart>
    ));
    expect(tooltipActiveSpy).toHaveBeenLastCalledWith({
      activeCoordinate: {
        x: 5,
        y: 10,
      },
      activeIndex: "0",
    });
  });
});

describe("selectTooltipState.tooltipItemPayloads", () => {
  it("should return undefined when called outside of store context", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const payload = useAppSelectorWithStableTest(selectTooltipState);
      createEffect(() => {
        const value = (() => payload())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => <Comp />);
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it("should return empty array for initial state", () => {
    const store = createRechartsStore();
    expect(selectTooltipState(store.state).tooltipItemPayloads).toEqual([]);
  });

  it("should return empty array in an empty chart", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const tooltipState = useAppSelectorWithStableTest(selectTooltipState);
      createEffect(() => {
        const value = (() =>
          tooltipState()?.tooltipItemPayloads.map((tp) => tp.dataDefinedOnItem))();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <BarChart data={PageData} width={100} height={100}>
        <Comp />
      </BarChart>
    ));
    expectLastCalledWith(spy, []);
  });

  it("should return all tooltip payloads defined on graphical items in ComposedChart", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const tooltipState = useAppSelectorWithStableTest(selectTooltipState);
      createEffect(() => {
        const value = (() =>
          tooltipState()?.tooltipItemPayloads.map((tp) => tp.dataDefinedOnItem))();
        ((value) => spy(value))(value);
      });
      return null;
    };
    const data1 = [{ x: 1 }, { x: 2 }, { x: 3 }];
    const data2 = [{ x: 10 }, { x: 20 }, { x: 30 }];
    render(() => (
      <ComposedChart data={PageData} width={100} height={100}>
        <Area dataKey="x" data={data1} />
        <Area dataKey="x" data={data2} />
        <Line data={[4, 5, 6]} />
        <Line data={[40, 50, 60]} />
        <Scatter data={[{ x: 7 }, { x: 8 }, { x: 9 }]} dataKey="x" />
        <Scatter data={[{ y: 70 }, { y: 80 }, { y: 90 }]} dataKey="y" />
        <Comp />
      </ComposedChart>
    ));
    // two of these elements will send the data as defined; Scatter decides to pre-chew it
    expectLastCalledWith(spy, [
      data1,
      data2,
      [4, 5, 6],
      [40, 50, 60],
      [
        [
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 7,
            },
            type: undefined,
            unit: "",
            value: 7,
          },
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 7,
            },
            type: undefined,
            unit: "",
            value: 7,
          },
        ],
        [
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 8,
            },
            type: undefined,
            unit: "",
            value: 8,
          },
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 8,
            },
            type: undefined,
            unit: "",
            value: 8,
          },
        ],
        [
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 9,
            },
            type: undefined,
            unit: "",
            value: 9,
          },
          {
            dataKey: "x",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              x: 9,
            },
            type: undefined,
            unit: "",
            value: 9,
          },
        ],
      ],
      [
        [
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 70,
            },
            type: undefined,
            unit: "",
            value: 70,
          },
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 70,
            },
            type: undefined,
            unit: "",
            value: 70,
          },
        ],
        [
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 80,
            },
            type: undefined,
            unit: "",
            value: 80,
          },
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 80,
            },
            type: undefined,
            unit: "",
            value: 80,
          },
        ],
        [
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 90,
            },
            type: undefined,
            unit: "",
            value: 90,
          },
          {
            dataKey: "y",
            graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            name: undefined,
            payload: {
              y: 90,
            },
            type: undefined,
            unit: "",
            value: 90,
          },
        ],
      ],
    ]);
  });

  it("should return all payloads in PieChart", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const tooltipState = useAppSelectorWithStableTest(selectTooltipState);
      createEffect(() => {
        const value = (() =>
          tooltipState()?.tooltipItemPayloads.map((tp) => tp.dataDefinedOnItem))();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <PieChart width={100} height={100}>
        <Comp />
        <Pie data={[{ x: 1 }, { x: 2 }, { x: 3 }]} dataKey="x" id="pie-1" />
        <Pie data={[{ y: 10 }, { y: 20 }, { y: 30 }]} dataKey="y" id="pie-2" />
      </PieChart>
    ));
    expectLastCalledWith(spy, [
      [
        [
          {
            color: "#808080",
            dataKey: "x",
            fill: "#808080",
            name: 0,
            payload: { x: 1 },
            type: undefined,
            value: 1,
            graphicalItemId: "pie-1",
          },
        ],
        [
          {
            color: "#808080",
            dataKey: "x",
            fill: "#808080",
            name: 1,
            payload: { x: 2 },
            type: undefined,
            value: 2,
            graphicalItemId: "pie-1",
          },
        ],
        [
          {
            color: "#808080",
            dataKey: "x",
            fill: "#808080",
            name: 2,
            payload: { x: 3 },
            type: undefined,
            value: 3,
            graphicalItemId: "pie-1",
          },
        ],
      ],
      [
        [
          {
            color: "#808080",
            dataKey: "y",
            fill: "#808080",
            name: 0,
            payload: { y: 10 },
            type: undefined,
            value: 10,
            graphicalItemId: "pie-2",
          },
        ],
        [
          {
            color: "#808080",
            dataKey: "y",
            fill: "#808080",
            name: 1,
            payload: { y: 20 },
            type: undefined,
            value: 20,
            graphicalItemId: "pie-2",
          },
        ],
        [
          {
            color: "#808080",
            dataKey: "y",
            fill: "#808080",
            name: 2,
            payload: { y: 30 },
            type: undefined,
            value: 30,
            graphicalItemId: "pie-2",
          },
        ],
      ],
    ]);
  });
});

describe("selectActiveIndex", () => {
  it.each(allTooltipCombinations)(
    "should return null for initial state for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const store = createRechartsStore();
      const actual = selectActiveIndex(store.state, tooltipEventType, trigger, undefined);
      expect(actual).toEqual(null);
    },
  );

  it("should return index after setMouseOverAxisIndex", () => {
    const store = createRechartsStore();
    store.actions.tooltip.setMouseOverAxisIndex({
      activeCoordinate: { x: 0, y: 0 },
      activeDataKey: "uv",
      activeIndex: "1",
    });
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
    const actual = selectActiveIndex(store.state, "axis", "hover", undefined);
    expect(actual).toEqual("2");
  });

  it("should return null for initial state", () => {
    const initialState = createRechartsStore().state;
    const expected: TooltipIndex = null;
    expect(selectActiveIndex(initialState, "axis", "hover", undefined)).toBe(expected);
    expect(selectActiveIndex(initialState, "axis", "click", undefined)).toBe(expected);
    expect(selectActiveIndex(initialState, "item", "hover", undefined)).toBe(expected);
    expect(selectActiveIndex(initialState, "item", "click", undefined)).toBe(expected);
  });

  it("should return defaultIndex if it is defined", () => {
    const initialState = createRechartsStore().state;
    const expected: TooltipIndex = "7";
    expect(selectActiveIndex(initialState, "axis", "hover", "7")).toBe(expected);
    expect(selectActiveIndex(initialState, "axis", "click", "7")).toBe(expected);
    expect(selectActiveIndex(initialState, "item", "hover", "7")).toBe(expected);
    expect(selectActiveIndex(initialState, "item", "click", "7")).toBe(expected);
  });

  it("should ignore defaultIndex if item hover index is set and active", () => {
    const state = produceState((draft) => {
      draft.tooltip.itemInteraction.hover.active = true;
      draft.tooltip.itemInteraction.hover.index = "7";
    });
    expect(selectActiveIndex(state, "axis", "hover", "8")).toBe("8" satisfies TooltipIndex);
    expect(selectActiveIndex(state, "axis", "click", "8")).toBe("8" satisfies TooltipIndex);
    expect(selectActiveIndex(state, "item", "hover", "8")).toBe("7" satisfies TooltipIndex);
    expect(selectActiveIndex(state, "item", "click", "8")).toBe("8" satisfies TooltipIndex);
  });

  it("should return item hover index", () => {
    const state = produceState((draft) => {
      draft.tooltip.itemInteraction.hover.active = true;
      draft.tooltip.itemInteraction.hover.index = "7";
    });
    const expected: TooltipIndex = "7";
    expect(selectActiveIndex(state, "item", "hover", "9")).toBe(expected);
  });

  it("should return item click index", () => {
    const state = produceState((draft) => {
      draft.tooltip.itemInteraction.click.active = true;
      draft.tooltip.itemInteraction.click.index = "7";
    });
    const expected: TooltipIndex = "7";
    expect(selectActiveIndex(state, "item", "click", "11")).toBe(expected);
  });

  it("should return axis hover index", () => {
    const state = produceState((draft) => {
      draft.tooltip.axisInteraction.hover.active = true;
      draft.tooltip.axisInteraction.hover.index = "7";
    });
    const expected: TooltipIndex = "7";
    expect(selectActiveIndex(state, "axis", "hover", "13")).toBe(expected);
  });

  it("should return axis click index", () => {
    const state = produceState((draft) => {
      draft.tooltip.axisInteraction.click.active = true;
      draft.tooltip.axisInteraction.click.index = "7";
    });
    const expected: TooltipIndex = "7";
    expect(selectActiveIndex(state, "axis", "click", "17")).toBe(expected);
  });
});

describe("selectTooltipPayload", () => {
  it.each(allTooltipCombinations)(
    "should return undefined when outside of store context for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const spy = vi.fn();
      const Comp = (): null => {
        const payload = useAppSelector((state) =>
          selectTooltipPayload(state, tooltipEventType, trigger, undefined),
        );
        createEffect(() => {
          const value = (() => payload())();
          ((value) => spy(value))(value);
        });
        return null;
      };
      render(() => <Comp />);
      expect(spy).toHaveBeenCalledWith(undefined);
    },
  );

  it.each(allTooltipCombinations)(
    "initial state should return undefined for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const store = createRechartsStore();
      expect(selectTooltipPayload(store.state, tooltipEventType, trigger, undefined)).toEqual(
        undefined,
      );
    },
  );

  it("should return settings and data from axis hover, if activeIndex is set for the item", () => {
    const store = createRechartsStore(preloadedTooltipState);
    const tooltipSettings1: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: { nameKey: "y", graphicalItemId: "graphicalItemId1" },
      dataDefinedOnItem: undefined,
    };
    const expectedEntry1: TooltipPayloadEntry = {
      payload: undefined,
      dataKey: undefined,
      name: undefined,
      nameKey: "y",
      value: undefined,
      graphicalItemId: "graphicalItemId1",
    };
    const tooltipSettings2: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: {
        stroke: "red",
        fill: "green",
        dataKey: "x",
        nameKey: "y",
        name: "foo",
        unit: "bar",
        graphicalItemId: "graphicalItemId2",
      },
      dataDefinedOnItem: [
        { x: 8, y: 9 },
        { x: 10, y: 11 },
      ],
    };
    const expectedEntry2: TooltipPayloadEntry = {
      name: 11,
      dataKey: "x",
      nameKey: "y",
      stroke: "red",
      fill: "green",
      payload: { x: 10, y: 11 },
      value: 10,
      unit: "bar",
      graphicalItemId: "graphicalItemId2",
    };
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings1);
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings2);
    expect(selectTooltipPayload(store.state, "axis", "hover", undefined)).toEqual(undefined);
    store.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeDataKey: undefined,
      activeCoordinate: tooltipActiveCoordinate,
    });
    expect(selectTooltipPayload(store.state, "axis", "hover", undefined)).toEqual([
      expectedEntry1,
      expectedEntry2,
    ]);
  });

  it("should return settings and data if defaultIndex is provided", () => {
    const store = createRechartsStore(preloadedTooltipState);
    const tooltipSettings1: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: { nameKey: "y", graphicalItemId: "graphicalItemId1" },
      dataDefinedOnItem: undefined,
    };
    const expectedEntry1: TooltipPayloadEntry = {
      payload: undefined,
      dataKey: undefined,
      name: undefined,
      nameKey: "y",
      value: undefined,
      graphicalItemId: "graphicalItemId1",
    };
    const tooltipSettings2: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: {
        stroke: "red",
        fill: "green",
        dataKey: "x",
        nameKey: "y",
        name: "foo",
        unit: "bar",
        graphicalItemId: "graphicalItemId2",
      },
      dataDefinedOnItem: [
        { x: 8, y: 9 },
        { x: 10, y: 11 },
      ],
    };
    const expectedEntry2: TooltipPayloadEntry = {
      name: 11,
      dataKey: "x",
      nameKey: "y",
      stroke: "red",
      fill: "green",
      payload: { x: 10, y: 11 },
      value: 10,
      unit: "bar",
      graphicalItemId: "graphicalItemId2",
    };
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings1);
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings2);
    expect(selectTooltipPayload(store.state, "axis", "hover", "1")).toEqual([
      expectedEntry1,
      expectedEntry2,
    ]);
  });

  it("should fill in chartData, if it is not defined on the item for item hover", () => {
    const store = createRechartsStore(preloadedTooltipState);
    const tooltipSettings: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: {
        stroke: "red",
        fill: "green",
        dataKey: "y",
        nameKey: "x",
        name: "foo",
        unit: "bar",
        graphicalItemId: "graphicalItemId1",
      },
      dataDefinedOnItem: undefined,
    };
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings);
    store.actions.chartData.setChartData([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    store.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "0",
      activeDataKey: "y",
      activeCoordinate: tooltipActiveCoordinate,
      activeGraphicalItemId: tooltipSettings.settings.graphicalItemId,
    });
    const expectedEntry: TooltipPayloadEntry = {
      name: 1,
      dataKey: "y",
      nameKey: "x",
      stroke: "red",
      fill: "green",
      payload: { x: 1, y: 2 },
      value: 2,
      unit: "bar",
      graphicalItemId: "graphicalItemId1",
    };
    expect(selectTooltipPayload(store.state, "item", "hover", undefined)).toEqual([expectedEntry]);
  });

  it("should return sliced data if set by Brush for item hover", () => {
    const store = createRechartsStore(preloadedTooltipState);
    const tooltipSettings: TooltipPayloadConfiguration = {
      getPosition: noop,
      settings: {
        stroke: "red",
        fill: "green",
        dataKey: "y",
        nameKey: "x",
        name: "foo",
        graphicalItemId: "graphicalItemId3",
      },
      dataDefinedOnItem: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    };
    store.actions.tooltip.addTooltipEntrySettings(tooltipSettings);
    store.actions.chartData.setChartData([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(selectTooltipPayload(store.state, "item", "hover", undefined)).toEqual(undefined);
    store.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "0",
      activeDataKey: "y",
      activeCoordinate: tooltipActiveCoordinate,
      activeGraphicalItemId: tooltipSettings.settings.graphicalItemId,
    });
    store.actions.chartData.setDataStartEndIndexes({ startIndex: 1, endIndex: 10 });
    const expectedEntry: TooltipPayloadEntry = {
      name: 3,
      dataKey: "y",
      nameKey: "x",
      stroke: "red",
      fill: "green",
      payload: { x: 3, y: 4 },
      value: 4,
      graphicalItemId: "graphicalItemId3",
    };
    expect(selectTooltipPayload(store.state, "item", "hover", undefined)).toEqual([expectedEntry]);
  });

  it("should return array of payloads for Scatter because Scatter naturally does its own special thing", () => {
    const chartDataState: ChartDataState = initialChartDataState;
    const actual: TooltipPayload | undefined = combineTooltipPayload(
      [exampleTooltipPayloadConfiguration1],
      "0",
      chartDataState,
      undefined,
      undefined,
      arrayTooltipSearcher,
      "item",
    );
    const expectedEntry1: TooltipPayloadEntry = {
      name: "stature",
      color: "color",
      fill: "fill",
      unit: "cm",
      value: 100,
      payload: { x: 100, y: 200, z: 200 },
      dataKey: "x",
      nameKey: "nameKey1",
      graphicalItemId: "graphicalItemId1",
    };
    const expectedEntry2: TooltipPayloadEntry = {
      name: "weight",
      color: "color",
      fill: "fill",
      unit: "kg",
      value: 200,
      payload: { x: 100, y: 200, z: 200 },
      dataKey: "y",
      nameKey: "nameKey1",
      graphicalItemId: "graphicalItemId1",
    };
    expect(actual).toEqual([expectedEntry1, expectedEntry2]);
  });

  it("should use dataKey from tooltipAxis, if item dataKey is undefined", () => {
    const tooltipPayloadConfiguration: TooltipPayloadConfiguration = {
      settings: { nameKey: undefined, graphicalItemId: "graphicalItemId1" },
      dataDefinedOnItem: [],
      getPosition: noop,
    };
    const chartDataState: ChartDataState = initialChartDataState;
    const actual: TooltipPayload | undefined = combineTooltipPayload(
      [tooltipPayloadConfiguration],
      "0",
      chartDataState,
      "dataKeyOnAxis",
      undefined,
      arrayTooltipSearcher,
      "axis",
    );
    const expected: TooltipPayloadEntry = {
      dataKey: "dataKeyOnAxis",
      payload: undefined,
      value: undefined,
      graphicalItemId: "graphicalItemId1",
    };
    expect(actual).toEqual([expected]);
  });
});

describe("selectTooltipPayloadConfigurations", () => {
  let exampleStore: ReturnType<typeof createRechartsStore>;

  beforeEach(() => {
    exampleStore = createRechartsStore();
    exampleStore.actions.tooltip.addTooltipEntrySettings(exampleTooltipPayloadConfiguration1);
    exampleStore.actions.tooltip.addTooltipEntrySettings(exampleTooltipPayloadConfiguration2);
  });

  describe.each(allTooltipCombinations)(
    "tooltipEventType: $tooltipEventType tooltipTrigger: $trigger",
    ({ tooltipEventType, trigger }) => {
      it("should return undefined when outside of store context", () => {
        const spy = vi.fn();
        const Comp = (): null => {
          const result = useAppSelector((state) =>
            selectTooltipPayloadConfigurations(state, tooltipEventType, trigger, undefined),
          );
          createEffect(() => {
            const value = (() => result())();
            ((value) => spy(value))(value);
          });
          return null;
        };
        render(() => <Comp />);
        expect(spy).toHaveBeenCalledWith(undefined);
      });

      it("should return empty array from empty state", () => {
        const store = createRechartsStore();
        expect(
          selectTooltipPayloadConfigurations(store.state, tooltipEventType, trigger, undefined),
        ).toEqual([]);
      });
    },
  );

  describe.each<TooltipTrigger>(["hover", "click"])(
    'tooltipEventType: "axis" tooltipTrigger: %s',
    (trigger) => {
      it("should return unfiltered configurations with tooltipEventType: axis", () => {
        const expected: ReadonlyArray<TooltipPayloadConfiguration> = [
          exampleTooltipPayloadConfiguration1,
          exampleTooltipPayloadConfiguration2,
        ];
        expect(
          selectTooltipPayloadConfigurations(exampleStore.state, "axis", trigger, undefined),
        ).toEqual(expected);
      });
    },
  );

  it("should filter by dataKey with tooltipEventType: item and trigger: hover", () => {
    exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "1",
      activeDataKey: "dataKey1",
      activeCoordinate: undefined,
      activeGraphicalItemId: exampleTooltipPayloadConfiguration1.settings.graphicalItemId,
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([exampleTooltipPayloadConfiguration1]);
    exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
      activeCoordinate: undefined,
      activeGraphicalItemId: exampleTooltipPayloadConfiguration2.settings.graphicalItemId,
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([exampleTooltipPayloadConfiguration2]);
  });

  it("should return nothing if the tooltipEventType is hover but the only interactions are clicks", () => {
    exampleStore.actions.tooltip.setActiveClickItemIndex({
      activeIndex: "1",
      activeDataKey: "dataKey1",
      activeGraphicalItemId: "foo",
      activeCoordinate: undefined,
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([]);
    exampleStore.actions.tooltip.setMouseClickAxisIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([]);
  });

  it("should return nothing if the tooltipEventType is click but the only interactions are hovers", () => {
    exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "1",
      activeDataKey: "dataKey1",
      activeCoordinate: undefined,
      activeGraphicalItemId: "foo",
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "click", undefined),
    ).toEqual([]);
    exampleStore.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
    });
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "click", undefined),
    ).toEqual([]);
  });

  describe("with defaultIndex", () => {
    it("should return the first configuration if the tooltipEventType is item and the defaultIndex is set, before user started interacting with the chart", () => {
      expect(selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", "1")).toEqual([
        exampleTooltipPayloadConfiguration1,
      ]);
    });

    it("should return configuration that matches the dataKey after user has started interacting", () => {
      exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
        activeIndex: "1",
        activeDataKey: "dataKey2",
        activeCoordinate: undefined,
        activeGraphicalItemId: exampleTooltipPayloadConfiguration2.settings.graphicalItemId,
      });
      expect(selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", "1")).toEqual([
        exampleTooltipPayloadConfiguration2,
      ]);
    });

    it("should return empty array if user interacted with a an item that is not represented in the tooltip payloads", () => {
      exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
        activeIndex: "1",
        activeGraphicalItemId: "id-notPresentInPayloads",
        activeCoordinate: undefined,
        activeDataKey: "dataKey-notPresentInPayloads",
      });
      expect(selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", "1")).toEqual(
        [],
      );
    });
  });
});
