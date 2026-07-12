// Port of recharts 3.8.1 test/cartesian/Line.spec.tsx (commit 7a23854).
// Tier A (byte-identical DOM assertions): simple path, strokeDasharray=0,
// custom component, dot=null, clipDot false/true, explicit id, empty data,
// activeDot true/false.
// Tier B (React-render-count / internal-prop snapshots adapted):
//   - ErrorBar-report cases: value asserted via createSelectorTestCase selector
//     (the Solid-idiomatic equivalent of recharts' <Customized> spy); React
//     render-count (toHaveBeenCalledTimes) dropped.
//   - events cases: handler first-arg is the resolved curve props (recharts'
//     adaptEventHandlers props-first convention); asserted via objectContaining
//     on the stable observable subset (React-only keys pathRef/width/height
//     dropped). userEvent → fireEvent.
//   - tooltip-payload case: value byte-identical; render-count dropped.
import { describe, expect, it, test, vi } from "vitest";
import { ErrorBar, Line, LineChart, LineProps, Tooltip, XAxis } from "../../src";
import { selectErrorBarsSettings } from "../../src/state/selectors/axisSelectors";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { selectTooltipPayload } from "../../src/state/selectors/tooltipSelectors";
import { expectLines } from "../helper/expectLine";
import { PageData } from "../_data";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { lineChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import { assertNotNull } from "../helper/assertNotNull";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { fireEvent, render } from "../helper/render";

describe("<Line />", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  const data = [
    { x: 10, y: 50, value: 100 },
    { x: 50, y: 50, value: 100 },
    { x: 90, y: 50, value: 100 },
    { x: 130, y: 50, value: 100 },
    { x: 170, y: 50, value: 100 },
  ];

  it("Renders a path in a simple Line", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500}>
        <Line isAnimationActive={false} data={data} dataKey="y" />
      </LineChart>
    ));

    expectLines(container, [{ d: "M5,86.667L127.5,86.667L250,86.667L372.5,86.667L495,86.667" }]);
  });

  it("Forwards the user `class` onto the line group (recharts clsx('recharts-line', className))", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500}>
        <Line isAnimationActive={false} data={data} dataKey="y" class="my-line" />
      </LineChart>
    ));

    const group = container.querySelector(".recharts-line");
    expect(group).not.toBeNull();
    expect(group?.getAttribute("class")).toContain("recharts-line my-line");
  });

  it("Does not fall into infinite loop if strokeDasharray is 0", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500}>
        <Line data={data} dataKey="y" strokeDasharray="0" />
      </LineChart>
    ));

    const line = container.querySelectorAll(".recharts-line-curve");
    expect(line).toHaveLength(1);

    expect(line[0]!.getAttribute("stroke-dasharray")).toEqual("0px 0px");
  });

  it("Can be rendered in custom component", () => {
    const CustomLine = (props: LineProps) => {
      return <Line {...props} />;
    };

    const { container } = render(() => (
      <LineChart width={500} height={500}>
        <CustomLine isAnimationActive={false} data={data} dataKey="value" />
      </LineChart>
    ));

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(5);
  });

  it("Does not throw when dot is null", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500}>
        {/* @ts-expect-error Test that the error Cannot read properties of null (reading 'clipDot') does not appear in JS projects */}
        <Line isAnimationActive={false} data={data} dataKey="value" dot={null} />
      </LineChart>
    ));

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(0);
  });

  it("Does not render clip dot when clipDot is false", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500} data={data}>
        <Line isAnimationActive={false} dataKey="x" dot={{ clipDot: false }} />
        {/* Line must have an XAxis or YAxis in order for clips to render */}
        <XAxis allowDataOverflow />
      </LineChart>
    ));

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    const dots = container.querySelectorAll(".recharts-line-dot");
    expect(dots).toHaveLength(5);

    const dotsWrapper = container.querySelector(".recharts-line-dots");
    assertNotNull(dotsWrapper);
    // Well this is confusing. When clipDot is false the className contains 'dots'. AKA clip path name includes what is showing, rather than what is clipped.
    expect(dotsWrapper.getAttribute("clip-path")).toContain("url(#clipPath-dots-recharts-line");
  });

  it("Does render clip dot when clipDot is true", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500} data={data}>
        <Line isAnimationActive={false} dataKey="x" dot={{ clipDot: true }} />
        {/* Line must have an XAxis or YAxis in order for clips to render */}
        <XAxis allowDataOverflow />
      </LineChart>
    ));

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);

    const dots = container.querySelectorAll(".recharts-line-dot");
    expect(dots).toHaveLength(5);

    const dotsWrapper = container.querySelector(".recharts-line-dots");
    assertNotNull(dotsWrapper);
    expect(dotsWrapper.hasAttribute("clip-path")).toBe(true);
    expect(dotsWrapper.getAttribute("clip-path")).toContain("url(#clipPath-recharts-line");
  });

  describe("with explicit ID prop", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={500}>
        <Line isAnimationActive={false} data={data} dataKey="y" id="test-line-id" />
        <XAxis allowDataOverflow />
        {props.children}
      </LineChart>
    ));

    it("should pass id prop to an element in the DOM", () => {
      const { container } = renderTestCase();

      const line = container.querySelector("#test-line-id");
      assertNotNull(line);
      expect(line.tagName).toBe("path");
      expect(line.classList.value).toBe("recharts-curve recharts-line-curve");
    });

    it("should set the ID on the clipPath, if it needs clipping", () => {
      const { container } = renderTestCase();

      const clipPath = container.querySelector("#clipPath-test-line-id");
      assertNotNull(clipPath);
      expect(clipPath.tagName).toBe("clipPath");
    });
  });

  it("Don't render any path when data is empty", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500}>
        <Line data={[]} />
      </LineChart>
    ));

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(0);
  });

  it("should report its ErrorBars to state", () => {
    const { spy } = createSelectorTestCase((props) => (
      <LineChart width={500} height={500}>
        <Line data={data} isAnimationActive={false} dataKey="y">
          <ErrorBar dataKey="x" />
        </Line>
        {props.children}
      </LineChart>
    ))((state) => selectErrorBarsSettings(state, "yAxis", 0));

    expectLastCalledWith(spy, [
      {
        dataKey: "x",
        // this defaults to y even in an absence of explicit prop
        direction: "y",
      },
    ]);
  });

  it("should report its ErrorBars to state in vertical chart", () => {
    const { spy } = createSelectorTestCase((props) => (
      <LineChart width={500} height={500} layout="vertical">
        <Line data={data} isAnimationActive={false} dataKey="y">
          <ErrorBar dataKey="x" />
        </Line>
        {props.children}
      </LineChart>
    ))((state) => selectErrorBarsSettings(state, "xAxis", 0));

    expectLastCalledWith(spy, [
      {
        dataKey: "x",
        // in horizontal chart the default direction is y, in vertical it's x
        direction: "x",
      },
    ]);
  });

  describe("activeDot", () => {
    test("Renders active dot when activeDot=true", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400} data={PageData}>
          <Line activeDot type="monotone" dataKey="uv" />
          <Tooltip />
        </LineChart>
      ));

      showTooltip(container, lineChartMouseHoverTooltipSelector);
      expect(container.querySelectorAll(".recharts-active-dot")).toHaveLength(1);
    });

    test("Renders no active dot when activeDot=false", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400} data={PageData}>
          <Line activeDot={false} type="monotone" dataKey="uv" />
          <Tooltip />
        </LineChart>
      ));

      showTooltip(container, lineChartMouseHoverTooltipSelector);
      expect(container.querySelectorAll(".recharts-active-dot")).toHaveLength(0);
    });

    test("passes props to activeDot function", () => {
      const spy = vi.fn();
      const { container } = render(() => (
        <LineChart width={400} height={400} data={PageData}>
          <Line activeDot={spy} type="monotone" dataKey="uv" />
          <Tooltip />
        </LineChart>
      ));

      expect(spy).toHaveBeenCalledTimes(0);

      showTooltip(container, lineChartMouseHoverTooltipSelector);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          cx: 161,
          cy: 102.5,
          fill: "#3182bd",
          dataKey: "uv",
          index: 2,
          payload: {
            amt: 2400,
            name: "Page C",
            pv: 1398,
            uv: 300,
          },
          r: 4,
          stroke: "#fff",
          strokeWidth: 2,
          value: 300,
        }),
      );
    });
  });

  describe("events", () => {
    const points = [
      {
        payload: { value: 100, x: 10, y: 50 },
        value: 50,
        x: 5,
        y: 86.66666666666666,
      },
      {
        payload: { value: 100, x: 50, y: 50 },
        value: 50,
        x: 127.5,
        y: 86.66666666666666,
      },
      {
        payload: { value: 100, x: 90, y: 50 },
        value: 50,
        x: 250,
        y: 86.66666666666666,
      },
      {
        payload: { value: 100, x: 130, y: 50 },
        value: 50,
        x: 372.5,
        y: 86.66666666666666,
      },
      {
        payload: { value: 100, x: 170, y: 50 },
        value: 50,
        x: 495,
        y: 86.66666666666666,
      },
    ];
    it("should fire onClick event when clicking on the line", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <LineChart width={500} height={500} data={data}>
          <Line isAnimationActive={false} dataKey="y" onClick={handleClick} />
        </LineChart>
      ));

      const linePath = container.querySelector(".recharts-line-curve");
      assertNotNull(linePath);
      fireEvent.click(linePath);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleClick,
        expect.objectContaining({
          connectNulls: false,
          fill: "none",
          layout: "horizontal",
          stroke: "#3182bd",
          type: "linear",
          points,
        }),
        expect.any(Object),
      );
    });

    it("should fire onMouseOver and onMouseOut events when hovering over the line", () => {
      const handleMouseOver = vi.fn();
      const handleMouseOut = vi.fn();

      const { container } = render(() => (
        <LineChart width={500} height={500} data={data}>
          <Line
            isAnimationActive={false}
            dataKey="y"
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        </LineChart>
      ));

      const linePath = container.querySelector(".recharts-line-curve");
      assertNotNull(linePath);
      fireEvent.mouseOver(linePath);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOver,
        expect.objectContaining({
          connectNulls: false,
          fill: "none",
          layout: "horizontal",
          points,
          stroke: "#3182bd",
          type: "linear",
        }),
        expect.any(Object),
      );

      fireEvent.mouseOut(linePath);
      expect(handleMouseOut).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleMouseOut,
        expect.objectContaining({
          connectNulls: false,
          fill: "none",
          layout: "horizontal",
          points,
          stroke: "#3182bd",
          type: "linear",
        }),
        expect.any(Object),
      );
    });

    it("should fire onTouchMove and onTouchEnd events when touching the line", () => {
      const handleTouchMove = vi.fn();
      const handleTouchEnd = vi.fn();

      const { container } = render(() => (
        <LineChart width={500} height={500} data={data} throttledEvents={[]}>
          <Line
            isAnimationActive={false}
            dataKey="y"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </LineChart>
      ));

      const linePath = container.querySelector(".recharts-line-curve");
      assertNotNull(linePath);
      fireEvent.touchMove(linePath, { touches: [{ clientX: 200, clientY: 200 }] });
      expect(handleTouchMove).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleTouchMove,
        expect.objectContaining({
          connectNulls: false,
          fill: "none",
          layout: "horizontal",
          points,
          stroke: "#3182bd",
          type: "linear",
        }),
        expect.any(Object),
      );
    });
  });

  describe("Tooltip integration", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100}>
        <Line data={data} dataKey="y" isAnimationActive={false} />
        {props.children}
      </LineChart>
    ));

    it("should select tooltip payload", () => {
      const { spy } = renderTestCase((state) => selectTooltipPayload(state, "axis", "hover", "0"));
      expectLastCalledWith(spy, [
        {
          color: "#3182bd",
          dataKey: "y",
          fill: "#fff",
          graphicalItemId: expect.stringMatching(/^recharts-line-.+/),
          hide: false,
          name: "y",
          nameKey: undefined,
          payload: {
            value: 100,
            x: 10,
            y: 50,
          },
          stroke: "#3182bd",
          strokeWidth: 1,
          type: undefined,
          unit: undefined,
          value: 50,
        },
      ]);
    });
  });

  describe("Tooltip integration with tooltipType", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100}>
        <Line data={data} dataKey="y" tooltipType="none" isAnimationActive={false} />
        {props.children}
      </LineChart>
    ));

    it("should forward tooltipType as the payload entry type", () => {
      const { spy } = renderTestCase((state) => selectTooltipPayload(state, "axis", "hover", "0"));
      expectLastCalledWith(spy, [
        expect.objectContaining({
          dataKey: "y",
          type: "none",
          value: 50,
        }),
      ]);
    });
  });
});
