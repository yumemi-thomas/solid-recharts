// Partial port of recharts 3.8.1 test/cartesian/Area.spec.tsx (commit 7a23854).
// Ported: the `events` describe (onClick / onMouseOver+Out / onTouchMove+End) — these
// exercise the parity fix that the Area now forwards user event handlers to its fill
// `.recharts-area-area` Curve, which (via adaptEventHandlers) calls them props-first
// `(curveProps, event)`. Asserted with objectContaining on the stable curve-prop
// subset (React-only keys className/width/height/id and the kebab fill-opacity dropped);
// userEvent → fireEvent.
// Deferred (impl gaps / Tier-B, tracked in TESTS.md): label (not wired), dot element-form
// + clipDot (clip infra), baseValue/curve-path golden render geometry, explicit-id clipPath,
// <Customized>/render-count state integration, getBaseValue/computeArea pure-fn suites.
import { describe, expect, it, test, vi } from "vitest";
import { Area, AreaChart } from "../../src";
import { getBaseValue, computeArea } from "../../src/cartesian/Area";
import { AreaSettings } from "../../src/state/types/AreaSettings";
import { BaseAxisWithScale, implicitYAxis } from "../../src/state/selectors/axisSelectors";
import { BaseValue } from "../../src/util/types";
import { mockXAxisWithScale, mockYAxisWithScale } from "../helper/mockAxes";
import { assertNotNull } from "../helper/assertNotNull";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { fireEvent, render } from "../helper/render";

const emptyBaseValues: ReadonlyArray<BaseValue | undefined> = [undefined, NaN];

type BaseValueTestCase = {
  domain: [number, number];
  expected: number;
  axisType: "number" | "category" | undefined;
};

const data = [
  { x: 10, y: 50, value: 100 },
  { x: 50, y: 50, value: 100 },
  { x: 90, y: 50, value: 100 },
  { x: 130, y: 50, value: 100 },
  { x: 170, y: 50, value: 100 },
];

describe("<Area /> as a child of AreaChart", () => {
  describe("events", () => {
    const points = [
      { payload: { value: 100, x: 10, y: 50 }, value: [0, 100], x: 5, y: 5 },
      { payload: { value: 100, x: 50, y: 50 }, value: [0, 100], x: 127.5, y: 5 },
      { payload: { value: 100, x: 90, y: 50 }, value: [0, 100], x: 250, y: 5 },
      { payload: { value: 100, x: 130, y: 50 }, value: [0, 100], x: 372.5, y: 5 },
      { payload: { value: 100, x: 170, y: 50 }, value: [0, 100], x: 495, y: 5 },
    ];

    it("should fire onClick event when clicking on the area", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <AreaChart width={500} height={500} data={data}>
          <Area dataKey="value" isAnimationActive={false} onClick={handleClick} />
        </AreaChart>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.click(areaPath);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleClick,
        expect.objectContaining({
          baseLine: 495,
          connectNulls: false,
          fill: "#3182bd",
          layout: "horizontal",
          points,
          stroke: "none",
          type: "linear",
        }),
        expect.any(Object),
      );
    });

    it("should fire onMouseOver and onMouseOut events when hovering over the area", () => {
      const handleMouseOver = vi.fn();
      const handleMouseOut = vi.fn();

      const { container } = render(() => (
        <AreaChart width={500} height={500} data={data}>
          <Area
            dataKey="value"
            isAnimationActive={false}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        </AreaChart>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.mouseOver(areaPath);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOver,
        expect.objectContaining({
          baseLine: 495,
          connectNulls: false,
          fill: "#3182bd",
          layout: "horizontal",
          points,
          stroke: "none",
          type: "linear",
        }),
        expect.any(Object),
      );

      fireEvent.mouseOut(areaPath);
      expect(handleMouseOut).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOut,
        expect.objectContaining({
          baseLine: 495,
          connectNulls: false,
          fill: "#3182bd",
          layout: "horizontal",
          points,
          stroke: "none",
          type: "linear",
        }),
        expect.any(Object),
      );
    });

    it("should fire onTouchMove and onTouchEnd events when touching the area", () => {
      const handleTouchMove = vi.fn();
      const handleTouchEnd = vi.fn();

      const { container } = render(() => (
        <AreaChart width={500} height={500} data={data} throttledEvents={[]}>
          <Area
            dataKey="value"
            isAnimationActive={false}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </AreaChart>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.touchMove(areaPath, { touches: [{ clientX: 200, clientY: 200 }] });
      expect(handleTouchMove).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleTouchMove,
        expect.objectContaining({
          baseLine: 495,
          connectNulls: false,
          fill: "#3182bd",
          layout: "horizontal",
          points,
          stroke: "none",
          type: "linear",
        }),
        expect.any(Object),
      );
    });
  });
});
describe("getBaseValue", () => {
  describe("when defined explicitly in props", () => {
    it("should return number if baseValue is a number", () => {
      const actual = getBaseValue(
        "horizontal",
        undefined,
        8,
        mockXAxisWithScale,
        mockYAxisWithScale,
      );
      expect(actual).toBe(8);
    });

    it("should read baseValue from chart props, if item.props.baseValue is undefined", () => {
      const actual = getBaseValue(
        "horizontal",
        9,
        undefined,
        mockXAxisWithScale,
        mockYAxisWithScale,
      );
      expect(actual).toBe(9);
    });

    it("should prefer baseValue from Area props, if both are provided", () => {
      const actual = getBaseValue("horizontal", 9, 10, mockXAxisWithScale, mockYAxisWithScale);
      expect(actual).toBe(10);
    });

    it("should return number from domain when baseValue is NaN", () => {
      const yAxis: BaseAxisWithScale = {
        ...implicitYAxis,
        // @ts-expect-error incomplete mock
        scale: {
          domain: () => [30, 40],
        },
      };
      const actual = getBaseValue("horizontal", undefined, NaN, mockXAxisWithScale, yAxis);
      expect(actual).toBe(30);
    });
  });

  describe.each(emptyBaseValues)("when baseValue is %s", (baseValue) => {
    const testCases: ReadonlyArray<BaseValueTestCase> = [
      { domain: [4, 5], expected: 4, axisType: "number" },
      { domain: [5, 4], expected: 4, axisType: "number" },
      { domain: [5, 4], expected: 5, axisType: "category" },
      { domain: [5, 4], expected: 5, axisType: undefined },
      {
        domain: [-10, -20],
        expected: -10,
        axisType: "number",
      },
      {
        domain: [-20, -10],
        expected: -10,
        axisType: "number",
      },
      {
        domain: [-10, -20],
        expected: -10,
        axisType: "category",
      },
      {
        domain: [-20, -10],
        expected: -20,
        axisType: "category",
      },
      {
        domain: [-10, -20],
        expected: -10,
        axisType: undefined,
      },
      {
        domain: [-20, -10],
        expected: -20,
        axisType: undefined,
      },
    ];

    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue(
            "horizontal",
            baseValue,
            baseValue,
            mockXAxisWithScale,
            yAxis,
          );
          expect(actual).toBe(expected);
        },
      );
    });

    describe("in vertical layout behaves the same but uses X axis instead of Y", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const xAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue("vertical", baseValue, baseValue, xAxis, mockYAxisWithScale);
          expect(actual).toBe(expected);
        },
      );
    });
  });

  describe('when baseValue is "dataMin"', () => {
    const baseValue = "dataMin";
    const testCases: ReadonlyArray<BaseValueTestCase> = [
      { domain: [4, 5], expected: 4, axisType: "number" },
      { domain: [5, 4], expected: 4, axisType: "number" },
      { domain: [5, 4], expected: 5, axisType: "category" },
      { domain: [5, 4], expected: 5, axisType: undefined },
      {
        domain: [-10, -20],
        expected: -20, // this is different from the 'undefined' behaviour!
        axisType: "number",
      },
      {
        domain: [-20, -10],
        expected: -20, // this is different from the 'undefined' behaviour!
        axisType: "number",
      },
      {
        domain: [-10, -20],
        expected: -10,
        axisType: "category",
      },
      {
        domain: [-20, -10],
        expected: -20,
        axisType: "category",
      },
      {
        domain: [-10, -20],
        expected: -10,
        axisType: undefined,
      },
      {
        domain: [-20, -10],
        expected: -20,
        axisType: undefined,
      },
    ];
    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue(
            "horizontal",
            baseValue,
            baseValue,
            mockXAxisWithScale,
            yAxis,
          );
          expect(actual).toBe(expected);
        },
      );
    });
    describe("in vertical layout behaves the same but uses X axis instead of Y", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const xAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue("vertical", baseValue, baseValue, xAxis, mockYAxisWithScale);
          expect(actual).toBe(expected);
        },
      );
    });
  });

  describe('when baseValue is "dataMax"', () => {
    const baseValue = "dataMax";
    const testCases: ReadonlyArray<BaseValueTestCase> = [
      // "max" means mathematical maximum for numerical axis
      { domain: [4, 5], expected: 5, axisType: "number" },
      { domain: [5, 4], expected: 5, axisType: "number" },
      // but it means "second" in categorical axis
      { domain: [5, 4], expected: 4, axisType: "category" },
      { domain: [5, 4], expected: 4, axisType: undefined },
      // and same for negative numbers
      {
        domain: [-10, -20],
        expected: -10,
        axisType: "number",
      },
      {
        domain: [-20, -10],
        expected: -10,
        axisType: "number",
      },
      {
        domain: [-10, -20],
        expected: -20,
        axisType: "category",
      },
      {
        domain: [-20, -10],
        expected: -10,
        axisType: "category",
      },
      {
        domain: [-10, -20],
        expected: -20,
        axisType: undefined,
      },
      {
        domain: [-20, -10],
        expected: -10,
        axisType: undefined,
      },
    ];
    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue(
            "horizontal",
            baseValue,
            baseValue,
            mockXAxisWithScale,
            yAxis,
          );
          expect(actual).toBe(expected);
        },
      );
    });
    describe("in vertical layout behaves the same but uses X axis instead of Y", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const xAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: {
              domain: () => domain,
            },
            // @ts-expect-error typescript is correct here, but we are testing runtime behavior with invalid input
            type: axisType,
          };
          const actual = getBaseValue("vertical", baseValue, baseValue, xAxis, mockYAxisWithScale);
          expect(actual).toBe(expected);
        },
      );
    });
  });
});

describe("computeArea", () => {
  const mockScale = { map: (n: number) => n * 2, domain: () => [0, "auto"] };
  const mockScale2 = { map: (n: number) => n * 3, domain: () => [0, "auto"] };

  it("should return empty points if displayedData is empty array", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      areaSettings,
      displayedData: [],
      layout: "horizontal",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale },
    });
    expect(points).toEqual([]);
  });

  it("should return displayedData mapped with getCateCoordinateOfLine in horizontal layout", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "v",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      displayedData: [{ v: 1 }, { v: 2 }, { v: 3 }],
      areaSettings,
      layout: "horizontal",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale },
      // @ts-expect-error incomplete mock
      xAxis: { scale: mockScale2, dataKey: "v" },
    });
    expect(points).toEqual([
      {
        payload: {
          v: 1,
        },
        value: [0, 1],
        x: 3,
        y: 2,
      },
      {
        payload: {
          v: 2,
        },
        value: [0, 2],
        x: 6,
        y: 4,
      },
      {
        payload: {
          v: 3,
        },
        value: [0, 3],
        x: 9,
        y: 6,
      },
    ]);
  });

  it("should return displayedData mapped with getCateCoordinateOfLine in vertical layout", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "v",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      displayedData: [{ v: 1 }, { v: 2 }, { v: 3 }],
      areaSettings,
      layout: "vertical",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale, dataKey: "v" },
      // @ts-expect-error incomplete mock
      xAxis: { scale: mockScale2 },
    });
    expect(points).toEqual([
      {
        payload: {
          v: 1,
        },
        value: [0, 1],
        x: 3,
        y: 2,
      },
      {
        payload: {
          v: 2,
        },
        value: [0, 2],
        x: 6,
        y: 4,
      },
      {
        payload: {
          v: 3,
        },
        value: [0, 3],
        x: 9,
        y: 6,
      },
    ]);
  });

  it("should return displayedData mapped to stackedData mapped to getCateCoordinateOfLine in horizontal chart", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "v",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      displayedData: [{ v: 1 }, { v: 2 }, { v: 3 }],
      stackedData: [
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 8],
        [5, 10],
        [6, 12],
      ],
      dataStartIndex: 0,
      areaSettings,
      layout: "horizontal",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale },
      // @ts-expect-error incomplete mock
      xAxis: { scale: mockScale2, dataKey: "v" },
    });
    expect(points).toEqual([
      {
        payload: {
          v: 1,
        },
        value: [1, 2],
        x: 3,
        y: 4,
      },
      {
        payload: {
          v: 2,
        },
        value: [2, 4],
        x: 6,
        y: 8,
      },
      {
        payload: {
          v: 3,
        },
        value: [3, 6],
        x: 9,
        y: 12,
      },
    ]);
  });

  it("should return displayedData mapped to stackedData mapped to getCateCoordinateOfLine in vertical chart", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "v",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      displayedData: [{ v: 1 }, { v: 2 }, { v: 3 }],
      stackedData: [
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 8],
        [5, 10],
        [6, 12],
      ],
      dataStartIndex: 0,
      areaSettings,
      layout: "vertical",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale, dataKey: "v" },
      // @ts-expect-error incomplete mock
      xAxis: { scale: mockScale2 },
    });
    expect(points).toEqual([
      {
        payload: {
          v: 1,
        },
        value: [1, 2],
        x: 6,
        y: 2,
      },
      {
        payload: {
          v: 2,
        },
        value: [2, 4],
        x: 12,
        y: 4,
      },
      {
        payload: {
          v: 3,
        },
        value: [3, 6],
        x: 18,
        y: 6,
      },
    ]);
  });

  it("should return .y coordinate set to null in vertical chart when YAxis dataKey is undefined", () => {
    const areaSettings: AreaSettings = {
      hide: false,
      isPanorama: false,
      type: "area",
      xAxisId: 0,
      yAxisId: 0,
      zAxisId: 0,
      id: "area-0",
      barSize: undefined,
      connectNulls: false,
      baseValue: 0,
      dataKey: "v",
      stackId: "",
      data: [],
    };
    const { points } = computeArea({
      displayedData: [{ v: 1 }, { v: 2 }, { v: 3 }],
      stackedData: [
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 8],
        [5, 10],
        [6, 12],
      ],
      dataStartIndex: 0,
      areaSettings,
      layout: "vertical",
      // @ts-expect-error incomplete mock
      yAxis: { scale: mockScale },
      // @ts-expect-error incomplete mock
      xAxis: { scale: mockScale2 },
    });
    expect(points).toEqual([
      {
        payload: {
          v: 1,
        },
        value: [1, 2],
        x: 6,
        y: null,
      },
      {
        payload: {
          v: 2,
        },
        value: [2, 4],
        x: 12,
        y: null,
      },
      {
        payload: {
          v: 3,
        },
        value: [3, 6],
        x: 18,
        y: null,
      },
    ]);
  });
});
