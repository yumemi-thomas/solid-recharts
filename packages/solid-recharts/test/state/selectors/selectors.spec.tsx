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
} from "../../../src/state/selectors/tooltipSelectors";
import type { TooltipEventType } from "../../../src/util/types";
import type { TooltipTrigger } from "../../../src/chart/types";

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
