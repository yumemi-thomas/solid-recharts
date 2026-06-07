// Ported from recharts 3.8.1 test/state/selectors/selectors.spec.tsx
// (commit 7a23854). Solid deviations: upstream's Redux dispatch cases use the
// Solid-native store actions; tooltip selector exports live in tooltipSelectors.
import { createEffect, flush } from "solid-js";
import { describe, expect, it, test, vi } from "vitest";
import { render } from "../../helper/render";
import { RechartsStoreProvider } from "../../../src/state/RechartsStoreProvider";
import { createRechartsStore, type RechartsRootState } from "../../../src/state/store";
import { arrayTooltipSearcher } from "../../../src/state/optionsSlice";
import { useTooltipEventType } from "../../../src/state/selectors/selectTooltipEventType";
import {
  selectActiveCoordinate,
  selectActiveIndex,
  selectIsTooltipActive,
  selectTooltipPayload,
  selectTooltipPayloadConfigurations,
} from "../../../src/state/selectors/tooltipSelectors";
import { combineTooltipPayload } from "../../../src/state/selectors/combiners/combineTooltipPayload";
import { useAppSelector } from "../../../src/state/hooks";
import type {
  TooltipPayload,
  TooltipPayloadConfiguration,
  TooltipPayloadEntry,
} from "../../../src/state/tooltipSlice";
import { ChartDataState, initialChartDataState } from "../../../src/state/chartDataSlice";
import { noop } from "../../../src/util/DataUtils";
import type { Coordinate, TooltipEventType } from "../../../src/util/types";
import type { TooltipTrigger } from "../../../src/chart/types";

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
      createEffect(
        () => eventType(),
        (value) => spy(value),
      );
      return null;
    };
    render(() => <Comp />);
    flush();
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  test.each(testCases)(
    "$testName should return $expected",
    ({ shared, defaultTooltipEventType, validateTooltipEventTypes, expected }) => {
      const spy = vi.fn();
      const Comp = (): null => {
        const eventType = useTooltipEventType(shared);
        createEffect(
          () => eventType(),
          (value) => spy(value),
        );
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
      flush();
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
    flush();
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
    flush();
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
    flush();
    const actual = selectActiveCoordinate(store.state, "axis", "hover", undefined);
    expect(actual).toEqual({ x: 5, y: 6 });
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

describe("selectTooltipPayload", () => {
  it.each(allTooltipCombinations)(
    "should return undefined when outside of store context for $tooltipEventType $trigger",
    ({ tooltipEventType, trigger }) => {
      const spy = vi.fn();
      const Comp = (): null => {
        const payload = useAppSelector((state) =>
          selectTooltipPayload(state, tooltipEventType, trigger, undefined),
        );
        createEffect(
          () => payload(),
          (value) => spy(value),
        );
        return null;
      };
      render(() => <Comp />);
      flush();
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
    flush();
    expect(selectTooltipPayload(store.state, "axis", "hover", undefined)).toEqual(undefined);
    store.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeDataKey: undefined,
      activeCoordinate: tooltipActiveCoordinate,
    });
    flush();
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
    flush();
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
    flush();
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
    flush();
    expect(selectTooltipPayload(store.state, "item", "hover", undefined)).toEqual(undefined);
    store.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "0",
      activeDataKey: "y",
      activeCoordinate: tooltipActiveCoordinate,
      activeGraphicalItemId: tooltipSettings.settings.graphicalItemId,
    });
    store.actions.chartData.setDataStartEndIndexes({ startIndex: 1, endIndex: 10 });
    flush();
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
    flush();
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
          createEffect(
            () => result(),
            (value) => spy(value),
          );
          return null;
        };
        render(() => <Comp />);
        flush();
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
    flush();
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([exampleTooltipPayloadConfiguration1]);
    exampleStore.actions.tooltip.setActiveMouseOverItemIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
      activeCoordinate: undefined,
      activeGraphicalItemId: exampleTooltipPayloadConfiguration2.settings.graphicalItemId,
    });
    flush();
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
    flush();
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", undefined),
    ).toEqual([]);
    exampleStore.actions.tooltip.setMouseClickAxisIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
    });
    flush();
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
    flush();
    expect(
      selectTooltipPayloadConfigurations(exampleStore.state, "item", "click", undefined),
    ).toEqual([]);
    exampleStore.actions.tooltip.setMouseOverAxisIndex({
      activeIndex: "1",
      activeDataKey: "dataKey2",
    });
    flush();
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
      flush();
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
      flush();
      expect(selectTooltipPayloadConfigurations(exampleStore.state, "item", "hover", "1")).toEqual(
        [],
      );
    });
  });
});
