// Port of recharts 3.8.1 test/cartesian/Area.spec.tsx (commit 7a23854).
//
// Component-level cases run across the charts that support <Area> (ComposedChart +
// AreaChart) via `describe.each(chartsThatSupportArea)`, mirroring the reference.
//
// Tier A (byte-identical DOM assertions): label (function form), dot (function form,
// null, clipDot false/true), baseValue + curve-path golden geometry (horizontal /
// vertical / no-axes), explicit id forwarding + clipPath id, empty data, curve
// stacking order, and the render-gate (no curves in charts that don't support Area).
// Tier B (React-render-count / internal-prop snapshots adapted):
//   - state-integration: cartesianItems / Legend / Tooltip payload value asserted via
//     createSelectorTestCase selector (the Solid-idiomatic equivalent of recharts'
//     <Customized> spy); React render-count (toHaveBeenCalledTimes) dropped.
//   - events: handler first-arg is the resolved curve props (recharts' adaptEventHandlers
//     props-first convention) asserted via objectContaining on the stable subset;
//     userEvent → fireEvent.
//
// PERMANENT-N/A (not ported): element-form custom label/dot (React.isValidElement /
// cloneElement — Solid uses function form, ported); the categorical-axis baseValue
// blocks are `describe.todo` in the reference too.
import { describe, expect, it, test, vi } from "vitest";
import { createEffect } from "solid-js";
import { Area, Brush, Tooltip, XAxis, YAxis, DefaultZIndexes } from "../../src";
import { getBaseValue, computeArea } from "../../src/cartesian/Area";
import { useAppSelector } from "../../src/state/hooks";
import { selectTooltipPayloadConfigurations } from "../../src/state/selectors/tooltipSelectors";
import type { Props as LabelProps } from "../../src/component/Label";
import { useLegendPayload } from "../../src/context/legendPayloadContext";
import { AreaSettings } from "../../src/state/types/AreaSettings";
import { BaseAxisWithScale, implicitYAxis } from "../../src/state/selectors/axisSelectors";
import { BaseValue, DotItemDotProps } from "../../src/util/types";
import { noop } from "../../src/util/DataUtils";
import { mockXAxisWithScale, mockYAxisWithScale } from "../helper/mockAxes";
import { assertNotNull } from "../helper/assertNotNull";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import {
  AreaChartCase,
  ComposedChartCase,
  allCartesianChartsExcept,
  type CartesianChartTestCase,
} from "../helper/parameterizedTestCases";
import { fireEvent, render, screen } from "@solidjs/testing-library";

const emptyBaseValues: ReadonlyArray<BaseValue | undefined> = [undefined, NaN];

type BaseValueTestCase = {
  domain: [number, number];
  expected: number;
  axisType: "number" | "category" | undefined;
};

const chartsThatSupportArea: ReadonlyArray<CartesianChartTestCase> = [
  ComposedChartCase,
  AreaChartCase,
];

const chartsThatDoNotSupportArea: ReadonlyArray<CartesianChartTestCase> =
  allCartesianChartsExcept(chartsThatSupportArea);

const data = [
  { x: 10, y: 50, value: 100 },
  { x: 50, y: 50, value: 100 },
  { x: 90, y: 50, value: 100 },
  { x: 130, y: 50, value: 100 },
  { x: 170, y: 50, value: 100 },
];

describe.each(chartsThatSupportArea)("<Area /> as a child of $testName", ({ ChartElement }) => {
  describe("label", () => {
    test("Render customized label when label is set to be a function", () => {
      // The assertion only checks the rendered text count, so position is omitted
      // (the LabelList-derived viewBox is a Cartesian/Polar union here).
      const renderLabel = (_props: LabelProps) => (
        <text class="customized-label">Customized Label</text>
      );

      render(() => (
        <ChartElement data={data}>
          <Area dataKey="value" isAnimationActive={false} label={renderLabel} />
        </ChartElement>
      ));

      expect(screen.getAllByText("Customized Label")).toHaveLength(data.length);
    });
  });

  describe("dot", () => {
    test("Render customized dot when dot is set to be a function", () => {
      let areaDotProps: DotItemDotProps | undefined;
      const renderDot = (props: DotItemDotProps) => {
        areaDotProps = props;
        return <circle role="cell" cx={props.cx} cy={props.cy} r={5} class="customized-dot" />;
      };

      render(() => (
        <ChartElement data={data}>
          <Area dataKey="value" isAnimationActive={false} dot={renderDot} />
        </ChartElement>
      ));

      expect(screen.getAllByRole("cell")).toHaveLength(data.length);
      expect(areaDotProps).toHaveProperty("points");
    });

    test("Render customized dot when dot is set via a function returning a component", () => {
      const CustomizedDot = (props: { cx?: number; cy?: number }) => (
        <circle role="cell" cx={props.cx} cy={props.cy} r={5} class="customized-dot" />
      );

      render(() => (
        <ChartElement data={data}>
          <Area
            dataKey="value"
            isAnimationActive={false}
            dot={({ cx, cy }) => <CustomizedDot cx={cx} cy={cy} />}
          />
        </ChartElement>
      ));

      expect(screen.getAllByRole("cell")).toHaveLength(data.length);
    });

    test("Does not throw when dot is null", () => {
      const { container } = render(() => (
        <ChartElement data={data}>
          {/* @ts-expect-error TypeScript should flag this, but strict null checks are off in JS projects */}
          <Area dataKey="value" dot={null} isAnimationActive={false} />
          <XAxis dataKey="x" allowDataOverflow />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-area-dot")).toHaveLength(0);
    });

    test("Does not clip dots when clipDot is false", () => {
      const { container } = render(() => (
        <ChartElement width={500} height={500} data={data}>
          <Area dataKey="value" dot={{ clipDot: false }} isAnimationActive={false} />
          <XAxis dataKey="x" allowDataOverflow />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(1);
      const dots = container.querySelectorAll(".recharts-area-dot");
      expect(dots).toHaveLength(5);
      const dotsWrapper = container.querySelector(".recharts-area-dots");
      assertNotNull(dotsWrapper);
      // When clipDot is false the clip-path className contains 'dots' (it names what
      // is showing, rather than what is clipped).
      expect(dotsWrapper.getAttribute("clip-path")).toContain("url(#clipPath-dots-recharts-area");
    });

    test("Does clip dots when clipDot is true", () => {
      const { container } = render(() => (
        <ChartElement width={500} height={500} data={data}>
          <Area dataKey="value" dot={{ clipDot: true }} isAnimationActive={false} />
          <XAxis dataKey="x" allowDataOverflow />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(1);
      const dots = container.querySelectorAll(".recharts-area-dot");
      expect(dots).toHaveLength(5);
      const dotsWrapper = container.querySelector(".recharts-area-dots");
      assertNotNull(dotsWrapper);
      // When clipDot is true the className does not contain 'dots'.
      expect(dotsWrapper.getAttribute("clip-path")).toContain("url(#clipPath-recharts-area");
    });
  });

  describe("events", () => {
    // Solid handlers are forwarded to the fill `.recharts-area-area` Curve, which (via
    // adaptEventHandlers) calls them props-first `(curveProps, event)`. Asserted with
    // objectContaining on the stable curve-prop subset (React-only keys
    // className/width/height/id and the kebab fill-opacity dropped); userEvent → fireEvent.
    const points = [
      { payload: { value: 100, x: 10, y: 50 }, value: [0, 100], x: 5, y: 5 },
      { payload: { value: 100, x: 50, y: 50 }, value: [0, 100], x: 127.5, y: 5 },
      { payload: { value: 100, x: 90, y: 50 }, value: [0, 100], x: 250, y: 5 },
      { payload: { value: 100, x: 130, y: 50 }, value: [0, 100], x: 372.5, y: 5 },
      { payload: { value: 100, x: 170, y: 50 }, value: [0, 100], x: 495, y: 5 },
    ];
    const expectedCurveProps = {
      baseLine: 495,
      connectNulls: false,
      fill: "#3182bd",
      layout: "horizontal",
      points,
      stroke: "none",
      type: "linear",
    };

    it("should fire onClick event when clicking on the area", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <ChartElement data={data}>
          <Area dataKey="value" isAnimationActive={false} onClick={handleClick} />
        </ChartElement>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.click(areaPath);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleClick,
        expect.objectContaining(expectedCurveProps),
        expect.any(Object),
      );
    });

    it("should fire onMouseOver and onMouseOut events when hovering over the area", () => {
      const handleMouseOver = vi.fn();
      const handleMouseOut = vi.fn();

      const { container } = render(() => (
        <ChartElement data={data}>
          <Area
            dataKey="value"
            isAnimationActive={false}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        </ChartElement>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.mouseOver(areaPath);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOver,
        expect.objectContaining(expectedCurveProps),
        expect.any(Object),
      );

      fireEvent.mouseOut(areaPath);
      expect(handleMouseOut).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOut,
        expect.objectContaining(expectedCurveProps),
        expect.any(Object),
      );
    });

    it("should fire onTouchMove and onTouchEnd events when touching the area", () => {
      const handleTouchMove = vi.fn();
      const handleTouchEnd = vi.fn();

      const { container } = render(() => (
        <ChartElement data={data} throttledEvents={[]}>
          <Area
            dataKey="value"
            isAnimationActive={false}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </ChartElement>
      ));

      const areaPath = container.querySelector(".recharts-area-area");
      assertNotNull(areaPath);
      fireEvent.touchMove(areaPath, { touches: [{ clientX: 200, clientY: 200 }] });
      expect(handleTouchMove).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleTouchMove,
        expect.objectContaining(expectedCurveProps),
        expect.any(Object),
      );
    });
  });

  describe("baseValue and curve paths", () => {
    describe("horizontal layout with numeric Y axis", () => {
      const layout = "horizontal";
      it("should default baseValue to zero if no domain is defined in the axis", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <YAxis />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M65,5L172.5,5L280,5L387.5,5L495,5L495,495L387.5,495L280,495L172.5,495L65,495Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M65,5L172.5,5L280,5L387.5,5L495,5");
      });

      it("should default baseValue to the first number in domain", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <YAxis domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M65,355L172.5,355L280,355L387.5,355L495,355L495,495L387.5,495L280,495L172.5,495L65,495Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M65,355L172.5,355L280,355L387.5,355L495,355");
      });

      it("should set baseValue to dataMin", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" baseValue="dataMin" isAnimationActive={false} />
            <YAxis domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M65,355L172.5,355L280,355L387.5,355L495,355L495,495L387.5,495L280,495L172.5,495L65,495Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M65,355L172.5,355L280,355L387.5,355L495,355");
      });

      it("should set baseValue to dataMax", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" baseValue="dataMax" isAnimationActive={false} />
            <YAxis domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M65,355L172.5,355L280,355L387.5,355L495,355L495,5L387.5,5L280,5L172.5,5L65,5Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M65,355L172.5,355L280,355L387.5,355L495,355");
      });
    });

    describe("vertical layout with numeric X axis requires dataKey on YAxis to be defined", () => {
      const layout = "vertical";
      it("should default baseValue to zero if no domain is defined in the axis", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <XAxis type="number" />
            <YAxis dataKey="y" />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M495,388.333L495,388.333L495,388.333L495,388.333L495,388.333L65,388.333L65,388.333L65,388.333L65,388.333L65,388.333Z",
          );
        expect
          .soft(curves[1])
          .toHaveAttribute("d", "M495,388.333L495,388.333L495,388.333L495,388.333L495,388.333");
      });

      it("should not set curve path if YAxis is not present", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <XAxis type="number" />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect.soft(curves[0]).not.toHaveAttribute("d");
        expect.soft(curves[1]).not.toHaveAttribute("d");
      });

      it("should set curve path to null if YAxis is present but it has no dataKey", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <XAxis type="number" />
            <YAxis />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect.soft(curves[0]).not.toHaveAttribute("d");
        expect.soft(curves[1]).not.toHaveAttribute("d");
      });

      it("should default baseValue to the first number in domain", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" isAnimationActive={false} />
            <XAxis type="number" />
            <YAxis dataKey="y" domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L65,54.286L65,54.286L65,54.286L65,54.286L65,54.286Z",
          );
        expect
          .soft(curves[1])
          .toHaveAttribute("d", "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286");
      });

      it("should set baseValue to dataMin", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" baseValue="dataMin" isAnimationActive={false} />
            <XAxis type="number" />
            <YAxis dataKey="y" domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L65,54.286L65,54.286L65,54.286L65,54.286L65,54.286Z",
          );
        expect
          .soft(curves[1])
          .toHaveAttribute("d", "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286");
      });

      it("should set baseValue to dataMax", () => {
        const { container } = render(() => (
          <ChartElement data={data} layout={layout}>
            <Area dataKey="value" baseValue="dataMax" isAnimationActive={false} />
            <XAxis type="number" />
            <YAxis dataKey="y" domain={[20, 300]} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L495,54.286L495,54.286Z",
          );
        expect
          .soft(curves[1])
          .toHaveAttribute("d", "M495,54.286L495,54.286L495,54.286L495,54.286L495,54.286");
      });
    });

    describe("with no axes", () => {
      it("should default baseValue to 0", () => {
        const { container } = render(() => (
          <ChartElement data={data}>
            <Area dataKey="value" isAnimationActive={false} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M5,5L127.5,5L250,5L372.5,5L495,5L495,495L372.5,495L250,495L127.5,495L5,495Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M5,5L127.5,5L250,5L372.5,5L495,5");
      });

      it("should set baseValue to a number", () => {
        const { container } = render(() => (
          <ChartElement data={data}>
            <Area dataKey="value" baseValue={9} isAnimationActive={false} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M5,5L127.5,5L250,5L372.5,5L495,5L495,450.9L372.5,450.9L250,450.9L127.5,450.9L5,450.9Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M5,5L127.5,5L250,5L372.5,5L495,5");
      });

      it("should set baseValue to 0 when dataMin", () => {
        const { container } = render(() => (
          <ChartElement data={data}>
            <Area dataKey="value" baseValue="dataMin" isAnimationActive={false} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M5,5L127.5,5L250,5L372.5,5L495,5L495,495L372.5,495L250,495L127.5,495L5,495Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M5,5L127.5,5L250,5L372.5,5L495,5");
      });

      it("should set baseValue to dataMax", () => {
        const { container } = render(() => (
          <ChartElement data={data}>
            <Area dataKey="value" baseValue="dataMax" isAnimationActive={false} />
          </ChartElement>
        ));
        const curves = container.querySelectorAll(".recharts-curve");
        expect(curves).toHaveLength(2);
        expect
          .soft(curves[0])
          .toHaveAttribute(
            "d",
            "M5,5L127.5,5L250,5L372.5,5L495,5L495,5L372.5,5L250,5L127.5,5L5,5Z",
          );
        expect.soft(curves[1]).toHaveAttribute("d", "M5,5L127.5,5L250,5L372.5,5L495,5");
      });
    });
  });

  describe("with explicit ID prop", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ChartElement data={data}>
        <Area dataKey="value" id="my-custom-area-id" isAnimationActive={false} />
        <XAxis allowDataOverflow />
        {props.children}
      </ChartElement>
    ));

    it("should pass id prop to the path element", () => {
      const { container } = renderTestCase();

      const area = container.querySelector("#my-custom-area-id");
      assertNotNull(area);
      expect(area.tagName).toBe("path");
      expect(area.classList.value).toBe("recharts-curve recharts-area-area");
    });

    it("should set the ID on the clipPath, if it needs clipping", () => {
      const { container } = renderTestCase();

      const clipPath = container.querySelector("#clipPath-my-custom-area-id");
      assertNotNull(clipPath);
      expect(clipPath.tagName).toBe("clipPath");
    });
  });

  describe("state integration", () => {
    it("should report its props to redux state", () => {
      const data2 = [{ value: 1 }, { value: 2 }, { value: 3 }];
      const { spy } = createSelectorTestCase((props) => (
        <ChartElement data={data}>
          <Area
            dataKey="value"
            data={data2}
            xAxisId={7}
            yAxisId={9}
            stackId="q"
            hide
            id="my-custom-area-id"
            connectNulls
            baseValue={123}
          />
          {props.children}
        </ChartElement>
      ))((state) => state.graphicalItems.cartesianItems);

      expectLastCalledWith(spy, [
        {
          isPanorama: false,
          type: "area",
          data: data2,
          dataKey: "value",
          xAxisId: 7,
          yAxisId: 9,
          zAxisId: 0,
          stackId: "q",
          hide: true,
          barSize: undefined,
          id: "my-custom-area-id",
          connectNulls: true,
          baseValue: 123,
        },
      ]);
    });

    it("should report default props to redux state", () => {
      const data2 = [{ value: 1 }, { value: 2 }, { value: 3 }];
      const { spy } = createSelectorTestCase((props) => (
        <ChartElement data={data}>
          <Area dataKey="value" data={data2} />
          {props.children}
        </ChartElement>
      ))((state) => state.graphicalItems.cartesianItems);

      expectLastCalledWith(spy, [
        {
          id: expect.stringMatching("^recharts-area-[:a-z0-9]+$"),
          isPanorama: false,
          type: "area",
          data: data2,
          dataKey: "value",
          xAxisId: 0,
          yAxisId: 0,
          zAxisId: 0,
          stackId: undefined,
          hide: false,
          barSize: undefined,
          baseValue: undefined,
          connectNulls: false,
        },
      ]);
    });

    it("should add a record to Legend payload", () => {
      const { spy } = createSelectorTestCase((props) => (
        <ChartElement data={data}>
          <Area dataKey="value" />
          {props.children}
        </ChartElement>
      ))(() => useLegendPayload());

      expectLastCalledWith(spy, [
        {
          color: "#3182bd",
          dataKey: "value",
          inactive: false,
          payload: {
            activeDot: true,
            animationBegin: 0,
            animationDuration: 1500,
            animationEasing: "ease",
            connectNulls: false,
            dataKey: "value",
            dot: false,
            fill: "#3182bd",
            fillOpacity: 0.6,
            hide: false,
            isAnimationActive: "auto",
            label: false,
            legendType: "line",
            name: "value",
            stroke: "#3182bd",
            strokeWidth: 1,
            type: "linear",
            xAxisId: 0,
            yAxisId: 0,
            zIndex: DefaultZIndexes.area,
          },
          type: "line",
          value: "value",
        },
      ]);
    });

    it("should add a record to Tooltip payload", () => {
      const { spy } = createSelectorTestCase((props) => (
        <ChartElement data={data}>
          <Area dataKey="value" />
          <Tooltip />
          {props.children}
        </ChartElement>
      ))((state) => selectTooltipPayloadConfigurations(state, "axis", "hover", undefined));

      expectLastCalledWith(spy, [
        {
          dataDefinedOnItem: undefined,
          getPosition: noop,
          settings: {
            color: "#3182bd",
            dataKey: "value",
            fill: "#3182bd",
            graphicalItemId: expect.stringMatching(/^recharts-area-.+/),
            hide: false,
            name: "value",
            nameKey: undefined,
            stroke: "#3182bd",
            strokeWidth: 1,
            type: undefined,
            unit: undefined,
          },
        },
      ]);
    });

    it("should add no record to Legend and Tooltip payloads when inside Brush Panorama", () => {
      const legendSpy = vi.fn();
      const tooltipSpy = vi.fn();
      const Comp = (): null => {
        const legend = useLegendPayload();
        const tooltip = useAppSelector((state) =>
          selectTooltipPayloadConfigurations(state, "axis", "hover", undefined),
        );
        createEffect(() => {
          const value = legend();
          ((v) => legendSpy(v))(value);
        });
        createEffect(() => {
          const value = tooltip();
          ((v) => tooltipSpy(v))(value);
        });
        return null;
      };

      render(() => (
        <ChartElement data={data} class="my-unique-classname">
          <Comp />
          <Brush>
            <ChartElement>
              <Area dataKey="value" />
            </ChartElement>
          </Brush>
        </ChartElement>
      ));

      expect(legendSpy).toHaveBeenLastCalledWith([]);
      expect(tooltipSpy).toHaveBeenLastCalledWith([]);
    });
  });

  test.each([{ myData: undefined }, { myData: [] }])(
    "Don't render any path when data is $myData",
    ({ myData }) => {
      const { container } = render(() => (
        <ChartElement data={myData}>
          <Area dataKey="value" />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-area-area")).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-area-curve")).toHaveLength(0);
      expect(container.querySelectorAll(".recharts-area-dot")).toHaveLength(0);
    },
  );

  test("renders the curve with the stroke on top (2nd) of the curve with the fill (1st)", () => {
    const { container } = render(() => (
      <ChartElement data={data}>
        <Area dataKey="value" stroke="teal" fill="teal" isAnimationActive={false} />
      </ChartElement>
    ));

    const curveCount = container.querySelectorAll(".recharts-curve").length;

    expect(container.querySelectorAll(".recharts-curve")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-curve")[0]).toHaveAttribute("stroke", "none");
    expect(container.querySelectorAll(".recharts-curve")[0]).toHaveAttribute("fill", "teal");
    expect(container.querySelectorAll(".recharts-curve")[curveCount - 1]).toHaveAttribute(
      "stroke",
      "teal",
    );
    expect(container.querySelectorAll(".recharts-curve")[curveCount - 1]).toHaveAttribute(
      "fill",
      "none",
    );
  });
});

describe.each(chartsThatDoNotSupportArea)(
  "<Area /> as a child of $testName",
  ({ ChartElement }) => {
    it("should not render any curves", () => {
      const { container } = render(() => (
        <ChartElement data={data}>
          <Area dataKey="value" stroke="teal" fill="teal" />
        </ChartElement>
      ));

      expect(container.querySelectorAll(".recharts-curve")).toHaveLength(0);
    });
  },
);

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
      { domain: [-10, -20], expected: -10, axisType: "number" },
      { domain: [-20, -10], expected: -10, axisType: "number" },
      { domain: [-10, -20], expected: -10, axisType: "category" },
      { domain: [-20, -10], expected: -20, axisType: "category" },
      { domain: [-10, -20], expected: -10, axisType: undefined },
      { domain: [-20, -10], expected: -20, axisType: undefined },
    ];

    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
      { domain: [-10, -20], expected: -20, axisType: "number" },
      { domain: [-20, -10], expected: -20, axisType: "number" },
      { domain: [-10, -20], expected: -10, axisType: "category" },
      { domain: [-20, -10], expected: -20, axisType: "category" },
      { domain: [-10, -20], expected: -10, axisType: undefined },
      { domain: [-20, -10], expected: -20, axisType: undefined },
    ];
    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
      { domain: [4, 5], expected: 5, axisType: "number" },
      { domain: [5, 4], expected: 5, axisType: "number" },
      { domain: [5, 4], expected: 4, axisType: "category" },
      { domain: [5, 4], expected: 4, axisType: undefined },
      { domain: [-10, -20], expected: -10, axisType: "number" },
      { domain: [-20, -10], expected: -10, axisType: "number" },
      { domain: [-10, -20], expected: -20, axisType: "category" },
      { domain: [-20, -10], expected: -10, axisType: "category" },
      { domain: [-10, -20], expected: -20, axisType: undefined },
      { domain: [-20, -10], expected: -10, axisType: undefined },
    ];
    describe("in horizontal layout uses Y axis", () => {
      test.each(testCases)(
        "should return $expected when $axisType axis domain is $domain",
        ({ domain, axisType, expected }) => {
          const yAxis: BaseAxisWithScale = {
            // @ts-expect-error incomplete mock
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
            scale: { domain: () => domain },
            // @ts-expect-error testing runtime behavior with invalid input
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
      { payload: { v: 1 }, value: [0, 1], x: 3, y: 2 },
      { payload: { v: 2 }, value: [0, 2], x: 6, y: 4 },
      { payload: { v: 3 }, value: [0, 3], x: 9, y: 6 },
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
      { payload: { v: 1 }, value: [0, 1], x: 3, y: 2 },
      { payload: { v: 2 }, value: [0, 2], x: 6, y: 4 },
      { payload: { v: 3 }, value: [0, 3], x: 9, y: 6 },
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
      { payload: { v: 1 }, value: [1, 2], x: 3, y: 4 },
      { payload: { v: 2 }, value: [2, 4], x: 6, y: 8 },
      { payload: { v: 3 }, value: [3, 6], x: 9, y: 12 },
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
      { payload: { v: 1 }, value: [1, 2], x: 6, y: 2 },
      { payload: { v: 2 }, value: [2, 4], x: 12, y: 4 },
      { payload: { v: 3 }, value: [3, 6], x: 18, y: 6 },
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
      { payload: { v: 1 }, value: [1, 2], x: 6, y: null },
      { payload: { v: 2 }, value: [2, 4], x: 12, y: null },
      { payload: { v: 3 }, value: [3, 6], x: 18, y: null },
    ]);
  });
});
