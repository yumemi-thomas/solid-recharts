// Port of recharts 3.8.1 test/chart/LineChart.spec.tsx (commit 7a23854).
//
// Recoverable cases ported with byte-identical geometry / DOM assertions.
// Solid deviations:
//   - `render(() => …)`; store writes are microtask-batched, so a `flush()` is
//     issued before asserting where the line registers via an effect.
//   - React `useState`-driven rerenders → a Solid signal that flips the data/dataKey.
//   - Inline `<Comp>` selector spies → `createSelectorTestCase` (the Solid-idiomatic
//     equivalent), or `useAppSelector` + an effect-driven spy where shape demands it.
//   - Any reactive-graph diagnostic fired during a test fails it via test/setup.ts.
//
// PERMANENT-N/A (NOT ported, one-line reason each):
//   - "Renders customized active dot when activeDot is set to be a ReactElement":
//     element-form render prop needs React.cloneElement injection.
//   - "Renders 6 labels when label is a react element": element-form label.
//   - "Renders 6 dots when dot is a react element": element-form dot.
//   - "click on Curve should invoke onClick callback": asserts React-internal
//     `pathRef`/`onClick`/`onMouseDown` prop keys + props-first 2-arg handler.
//   - "<LineChart /> - Pure Rendering" (×2 blocks, ×2 each): render-spy counts
//     (toHaveBeenCalledTimes) — N/A under Solid's reactive model.
//   - "Rendering two line charts with syncId" (×5): fake-timer + cross-chart tooltip
//     sync coupling; deferred as a tooltip-sync integration concern, not Line.
//   - "should call the function and give it the latest data" / issue #4935: dataKey
//     call-count spies (render-count coupling).
import { describe, expect, it, test, vi } from "vitest";
import { createSignal, flush } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { Brush, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "../../src";
import type { CurveType } from "../../src/shape/Curve";
import type { LabelContentType } from "../../src/component/Label";
import { PageData, pageData, generateMockData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";
import { expectXAxisTicks } from "../helper/expectAxisTicks";
import { expectLines } from "../helper/expectLine";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import {
  selectAxisRangeWithReverse,
  selectTicksOfGraphicalItem,
} from "../../src/state/selectors/axisSelectors";
import { selectTooltipPayload } from "../../src/state/selectors/tooltipSelectors";
import { useViewBox, useChartWidth, useChartHeight } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { createEffect } from "solid-js";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

describe("<LineChart />", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  test("Render 1 line in simple LineChart", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const allLines = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(allLines).toHaveLength(1);
    const line = allLines[0];
    assertNotNull(line);
    expect(line.getAttributeNames().sort()).toEqual([
      "class",
      "d",
      "fill",
      "height",
      "id",
      "stroke",
      "stroke-dasharray",
      "stroke-width",
      "width",
    ]);
    expect(line).toHaveAttribute("stroke", "#ff7300");
    expect(line).toHaveAttribute("stroke-width", "1");
    expect(line).toHaveAttribute("fill", "none");
    expect(line).toHaveAttribute("width", "360");
    expect(line).toHaveAttribute("height", "360");
    expect(line).toHaveAttribute("id", expect.stringMatching("recharts-line-[:a-z0-9]+"));
    expect(line).toHaveAttribute("class", "recharts-curve recharts-line-curve");
    expect(line).toHaveAttribute("stroke-dasharray", "0px 0px");
    expect(line).toHaveAttribute(
      "d",
      "M20,20C44,65,68,110,92,110C116,110,140,110,164,110C188,110,212,200,236,200C260,200,284,129.8,308,129.8C332,129.8,356,169.85,380,209.9",
    );
  });

  test("Renders the same 1 line but smaller when LineChart has <XAxis /> and <YAxis />", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis />
        <YAxis type="category" />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const allLines = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(allLines).toHaveLength(1);
    const line = allLines[0];
    assertNotNull(line);
    expect(line).toHaveAttribute("stroke", "#ff7300");
    expect(line).toHaveAttribute("width", "300");
    expect(line).toHaveAttribute("height", "330");
    expect(line).toHaveAttribute("stroke-dasharray", "0px 0px");
    expect(line).toHaveAttribute(
      "d",
      "M80,350C100,308.75,120,267.5,140,267.5C160,267.5,180,267.5,200,267.5C220,267.5,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,380,20",
    );
  });

  describe("renders two lines with two axes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart
        width={500}
        height={300}
        data={pageData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid yAxisId="left" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Legend />
        <Line yAxisId="left" dataKey="pv" />
        <Line yAxisId="right" dataKey="uv" />
        {props.children}
      </LineChart>
    ));

    it("should select the x axis range and ticks and draw two lines", () => {
      const { spy: rangeSpy, container } = renderTestCase((state) =>
        selectAxisRangeWithReverse(state, "xAxis", 0, false),
      );
      expectLastCalledWith(rangeSpy, [80, 410]);

      const { spy: ticksSpy } = renderTestCase((state) =>
        selectTicksOfGraphicalItem(state, "xAxis", 0, false),
      );
      expectLastCalledWith(ticksSpy, [
        { coordinate: 80, index: 0, offset: 0, value: "Page A" },
        { coordinate: 135, index: 1, offset: 0, value: "Page B" },
        { coordinate: 190, index: 2, offset: 0, value: "Page C" },
        { coordinate: 245, index: 3, offset: 0, value: "Page D" },
        { coordinate: 300, index: 4, offset: 0, value: "Page E" },
        { coordinate: 355, index: 5, offset: 0, value: "Page F" },
        { coordinate: 410, index: 6, offset: 0, value: "Page G" },
      ]);

      const allLines = container.querySelectorAll(".recharts-line .recharts-line-curve");
      expect(allLines).toHaveLength(2);
      const line1 = allLines[0];
      const line2 = allLines[1];
      assertNotNull(line1);
      assertNotNull(line2);
      expect(line1).toHaveAttribute("stroke", "#3182bd");
      expect(line1).toHaveAttribute("width", "330");
      expect(line1).toHaveAttribute("height", "160");
      expect(line1).toHaveAttribute(
        "d",
        "M80,58.333L135,58.333L190,36.067L245,18.6L300,5L355,17.267L410,74.333",
      );
      expect(line2).toHaveAttribute("stroke", "#3182bd");
      expect(line2).toHaveAttribute("width", "330");
      expect(line2).toHaveAttribute("height", "160");
      expect(line2).toHaveAttribute("d", "M80,106L135,106L190,78.2L245,25.3L300,17L355,13L410,25");
      expect(line1.getAttribute("id")).not.toEqual(line2.getAttribute("id"));
    });
  });

  test("Sets title and description correctly", () => {
    const { container } = render(() => (
      <LineChart
        title="Chart title"
        desc="Chart description"
        width={400}
        height={400}
        data={PageData}
      >
        <Line type="monotone" dataKey="uv" />
      </LineChart>
    ));
    expect(container.querySelector("title")).toHaveTextContent("Chart title");
    expect(container.querySelector("desc")).toHaveTextContent("Chart description");
  });

  describe("curve type", () => {
    type CurveTestCase = { curve: CurveType; expectedD: string };
    const allCurves: ReadonlyArray<CurveTestCase> = [
      {
        curve: "basis",
        expectedD:
          "M80,350L90,336.25C100,322.5,120,295,140,281.25C160,267.5,180,267.5,200,253.75C220,240,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,370,33.75L380,20",
      },
      {
        curve: "basisClosed",
        expectedD:
          "M140,281.25C160,267.5,180,267.5,200,253.75C220,240,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,320,88.75C280,130,180,240,140,281.25C100,322.5,120,295,140,281.25",
      },
      {
        curve: "basisOpen",
        expectedD:
          "M140,281.25C160,267.5,180,267.5,200,253.75C220,240,240,212.5,260,185C280,157.5,300,130,320,102.5",
      },
      {
        curve: "bumpX",
        expectedD:
          "M80,350C110,350,110,267.5,140,267.5C170,267.5,170,267.5,200,267.5C230,267.5,230,185,260,185C290,185,290,102.5,320,102.5C350,102.5,350,20,380,20",
      },
      {
        curve: "bumpY",
        expectedD:
          "M80,350C80,308.75,140,308.75,140,267.5C140,267.5,200,267.5,200,267.5C200,226.25,260,226.25,260,185C260,143.75,320,143.75,320,102.5C320,61.25,380,61.25,380,20",
      },
      {
        curve: "bump",
        expectedD:
          "M80,350C110,350,110,267.5,140,267.5C170,267.5,170,267.5,200,267.5C230,267.5,230,185,260,185C290,185,290,102.5,320,102.5C350,102.5,350,20,380,20",
      },
      { curve: "linear", expectedD: "M80,350L140,267.5L200,267.5L260,185L320,102.5L380,20" },
      { curve: "linearClosed", expectedD: "M80,350L140,267.5L200,267.5L260,185L320,102.5L380,20Z" },
      {
        curve: "natural",
        expectedD:
          "M80,350C100,313.158,120,276.316,140,267.5C160,258.684,180,277.895,200,267.5C220,257.105,240,217.105,260,185C280,152.895,300,128.684,320,102.5C340,76.316,360,48.158,380,20",
      },
      {
        curve: "monotoneX",
        expectedD:
          "M80,350C100,308.75,120,267.5,140,267.5C160,267.5,180,267.5,200,267.5C220,267.5,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,380,20",
      },
      {
        curve: "monotoneY",
        expectedD:
          "M80,350C90,322.5,100,295,140,267.5C140,267.5,200,267.5,200,267.5C240,240,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,380,20",
      },
      {
        curve: "monotone",
        expectedD:
          "M80,350C100,308.75,120,267.5,140,267.5C160,267.5,180,267.5,200,267.5C220,267.5,240,212.5,260,185C280,157.5,300,130,320,102.5C340,75,360,47.5,380,20",
      },
      {
        curve: "step",
        expectedD:
          "M80,350L110,350L110,267.5L170,267.5L170,267.5L230,267.5L230,185L290,185L290,102.5L350,102.5L350,20L380,20",
      },
      {
        curve: "stepBefore",
        expectedD:
          "M80,350L80,267.5L140,267.5L140,267.5L200,267.5L200,185L260,185L260,102.5L320,102.5L320,20L380,20",
      },
      {
        curve: "stepAfter",
        expectedD:
          "M80,350L140,350L140,267.5L200,267.5L200,267.5L260,267.5L260,185L320,185L320,102.5L380,102.5L380,20",
      },
    ];

    it.each(allCurves)(
      "should render d=$expectedD when curve type=$curve",
      ({ curve, expectedD }) => {
        const { container } = render(() => (
          <LineChart
            width={400}
            height={400}
            data={PageData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis />
            <YAxis type="category" />
            <Line type={curve} dataKey="uv" stroke="#ff7300" />
          </LineChart>
        ));
        flush();
        const curves = container.querySelectorAll(".recharts-line .recharts-line-curve");
        expect(curves).toHaveLength(1);
        expect(curves[0]).toHaveAttribute("d", expectedD);
      },
    );
  });

  test("Render smooth curve when type of Line is monotone", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis />
        <YAxis type="category" />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const curves = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(curves).toHaveLength(1);
    expect(curves[0]!.getAttribute("d")?.indexOf("C")).not.toEqual(-1);
  });

  test("Render two paths when connectNulls is false", () => {
    const breakData = [
      { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
      { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
      { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
      { name: "Page D", uv: null, pv: 9800, amt: 2400 },
      { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
      { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
    ];
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={breakData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis />
        <YAxis type="category" />
        <Line type="monotone" connectNulls={false} dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const curves = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(curves).toHaveLength(1);
    const path = curves[0]!.getAttribute("d");
    assertNotNull(path);
    expect(path.length - path.split("M").join("").length).toEqual(2);
  });

  test("Render one path when connectNulls is true", () => {
    const breakData = [
      { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
      { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
      { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
      { name: "Page D", uv: null, pv: 9800, amt: 2400 },
      { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
      { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
    ];
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={breakData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis />
        <YAxis type="category" />
        <Line type="monotone" connectNulls dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const curves = container.querySelectorAll(".recharts-line .recharts-line-curve");
    expect(curves.length).toEqual(1);
    const path = curves[0]!.getAttribute("d");
    assertNotNull(path);
    expect(path.length - path.split("M").join("").length).toEqual(1);
  });

  test("Renders 1 dot no line when the length of data is 1", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData.slice(0, 1)}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line isAnimationActive={false} label type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(1);
  });

  test("Renders 6 labels when label = true", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line isAnimationActive={false} label type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const labels = container.querySelectorAll(".recharts-label");
    expect(labels).toHaveLength(6);

    labels.forEach((l) => {
      expect(Array.from(l.getAttributeNames()).sort()).toEqual([
        "class",
        "fill",
        "height",
        "offset",
        "text-anchor",
        "width",
        "x",
        "y",
      ]);
      expect(l).toHaveAttribute("offset", "5");
      expect(l).toHaveAttribute("class", "recharts-text recharts-label");
      expect(l).toHaveAttribute("text-anchor", "middle");
      expect(l).toHaveAttribute("fill", "#808080");
    });

    expect(labels[0]).toHaveAttribute("x", "20");
    expect(labels[0]).toHaveAttribute("y", "20");
    expect(labels[0]).toHaveTextContent("400");
    expect(labels[1]).toHaveAttribute("x", "92");
    expect(labels[1]).toHaveAttribute("y", "110");
    expect(labels[1]).toHaveTextContent("300");
    expect(labels[2]).toHaveAttribute("x", "164");
    expect(labels[2]).toHaveAttribute("y", "110");
    expect(labels[2]).toHaveTextContent("300");
    expect(labels[3]).toHaveAttribute("x", "236");
    expect(labels[3]).toHaveAttribute("y", "200");
    expect(labels[3]).toHaveTextContent("200");
    expect(labels[4]).toHaveAttribute("x", "308");
    expect(labels[4]).toHaveAttribute("y", "129.8");
    expect(labels[4]).toHaveTextContent("278");
    expect(labels[5]).toHaveAttribute("x", "380");
    expect(labels[5]).toHaveAttribute("y", "209.9");
    expect(labels[5]).toHaveTextContent("189");
  });

  test("Renders 6 labels when label is a function", () => {
    const renderLabel: LabelContentType = (props) => (
      <text class="customized-label" x={props.x} y={props.y}>
        test
      </text>
    );
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line isAnimationActive={false} label={renderLabel} dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    const labels = container.querySelectorAll(".customized-label");
    expect(labels).toHaveLength(6);
  });

  test("Adds a tick and datapoint when adding values to data array in state", () => {
    const [data, setData] = createSignal(PageData);
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={data()}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line isAnimationActive={false} label dataKey="uv" stroke="#ff7300" />
        <XAxis dataKey="name" />
      </LineChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(6);

    setData((d) => [...d, { name: "Page X", uv: 23092, pv: 223, amt: 2322 }]);
    flush();

    expect(container.querySelectorAll(".recharts-label")).toHaveLength(7);
    expect(container.textContent).toContain("Page X");
  });

  test("Renders 6 dots when dot = true", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line isAnimationActive={false} dot type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(6);
  });

  test("Renders 6 dots when dot is a function", () => {
    const renderDot = (props: { cx?: number; cy?: number }) => (
      <circle class="customized-dot" cx={props.cx} cy={props.cy} r={10} />
    );
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line
          isAnimationActive={false}
          dot={renderDot}
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
        />
      </LineChart>
    ));
    flush();
    expect(container.querySelectorAll(".customized-dot")).toHaveLength(6);
  });

  test("Should update the line chart when the brush changes", () => {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const { container } = render(() => (
      <LineChart width={400} height={400} data={PageData} margin={margin}>
        <Line isAnimationActive={false} type="monotone" dataKey="uv" stroke="#ff7300" />
        <Tooltip />
        <Brush />
      </LineChart>
    ));
    flush();

    const lineDots = container.querySelectorAll(".recharts-line-dots");
    expect(lineDots).toHaveLength(1);
    expect(lineDots[0]!.children).toHaveLength(6);
    expect(lineDots[0]!.children[2]!).toHaveAttribute("cx", "164");
    expect(lineDots[0]!.children[2]!).toHaveAttribute("cy", "100");

    const leftCursor = container.querySelectorAll(".recharts-brush-traveller")[0]!;
    const rightCursor = container.querySelectorAll(".recharts-brush-traveller")[1]!;

    // Solid 2.0 defers signal propagation to a flush boundary: the mousedown sets
    // isTravellerMoving/movingTravellerId, which the window-level mousemove handler
    // reads — so flush() between the mousedown and the move (the documented Brush
    // timing gotcha), otherwise the move sees stale state and no-ops.
    fireEvent.mouseDown(leftCursor, {
      pageX: 0,
      clientX: 0,
      clientY: 0,
      bubbles: true,
      cancelable: true,
    });
    flush();
    fireEvent.mouseMove(window, {
      pageX: 200,
      clientX: 200,
      clientY: 0,
      bubbles: true,
      cancelable: true,
    });
    fireEvent.mouseUp(window);
    flush();

    fireEvent.mouseDown(rightCursor, {
      pageX: 400,
      clientX: 400,
      clientY: 0,
      bubbles: true,
      cancelable: true,
    });
    flush();
    fireEvent.mouseMove(window, {
      pageX: 340,
      clientX: 340,
      clientY: 0,
      bubbles: true,
      cancelable: true,
    });
    fireEvent.mouseUp(window);
    flush();

    const newLineDots = container.querySelectorAll(".recharts-line-dots");
    expect(newLineDots).toHaveLength(1);
    expect(newLineDots[0]!.children).toHaveLength(3);
    expect(newLineDots[0]!.children[0]!).toHaveAttribute("cx", margin.left.toString());
    expect(newLineDots[0]!.children[0]!).toHaveAttribute("cy", "20");
    expect(newLineDots[0]!.children[1]!).toHaveAttribute("cx", "200");
    expect(newLineDots[0]!.children[1]!).toHaveAttribute("cy", "126.66666666666667");
  });

  describe("Tooltip integration", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line dataKey="y" isAnimationActive={false} id="line-y" />
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
          graphicalItemId: "line-y",
          hide: false,
          name: "y",
          nameKey: undefined,
          payload: { amt: 2400, name: "Page A", pv: 2400, uv: 400 },
          stroke: "#3182bd",
          strokeWidth: 1,
          type: undefined,
          unit: undefined,
          value: undefined,
        },
      ]);
    });
  });

  test("Render a line with clipDot option on the dot and expect attributes not to be NaN", () => {
    const { container } = render(() => (
      <LineChart width={100} height={100} data={PageData}>
        <Line type="monotone" dataKey="uv" stroke="#ff7300" dot={{ clipDot: false }} />
        <Tooltip />
        <XAxis dataKey="name" allowDataOverflow />
      </LineChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    const clipPaths = container.getElementsByTagName("clipPath");
    for (let i = 0; i < clipPaths.length; i++) {
      const clipPath = clipPaths.item(i);
      const rects = clipPath && clipPath.getElementsByTagName("rect");
      for (let j = 0; j < clipPaths.length; j++) {
        const rect = rects?.item(j);
        if (rect) {
          expect(Number(rect.getAttribute("height"))).not.toBeNaN();
          expect(Number(rect.getAttribute("width"))).not.toBeNaN();
          expect(Number(rect.getAttribute("x"))).not.toBeNaN();
          expect(Number(rect.getAttribute("y"))).not.toBeNaN();
        }
      }
    }
  });

  describe("LineChart - test ref access", () => {
    test("should allow access to the main SVG through the ref prop", () => {
      // recharts forwards the chart `ref` to the main SVG element. We capture the
      // node in the callback (asserting inside the callback would create effects
      // in an ownerless apply-phase scope → NO_OWNER_EFFECT) and assert after render.
      const holder: { node: SVGSVGElement | null } = { node: null };
      render(() => (
        <LineChart
          width={100}
          height={100}
          data={PageData}
          ref={(node: SVGSVGElement | null) => {
            holder.node = node;
          }}
        >
          <Line type="monotone" dataKey="uv" stroke="#ff7300" />
          <Tooltip />
          <XAxis dataKey="name" />
        </LineChart>
      ));
      flush();
      const captured = holder.node;
      assertNotNull(captured);
      expect(captured.tagName).toBe("svg");
      expect(captured.getAttribute("class")).toBe("recharts-surface");
    });
  });

  describe("LineChart layout context", () => {
    it("should provide viewBox", () => {
      const spy = vi.fn();
      const Comp = () => {
        const vb = useViewBox();
        createEffect(
          () => vb(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <LineChart width={100} height={50} barSize={20}>
          <Comp />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenCalledWith({ height: 40, width: 90, x: 5, y: 5 });
    });

    it("should provide clipPathId", () => {
      const spy = vi.fn();
      const Comp = () => {
        spy(useClipPathId());
        return null;
      };
      render(() => (
        <LineChart width={100} height={50} barSize={20}>
          <Comp />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/recharts\d+-clip/));
    });

    it("should provide width", () => {
      const spy = vi.fn();
      const Comp = () => {
        const w = useChartWidth();
        createEffect(
          () => w(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <LineChart width={100} height={50} barSize={20}>
          <Comp />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenCalledWith(100);
    });

    it("should provide height", () => {
      const spy = vi.fn();
      const Comp = () => {
        const h = useChartHeight();
        createEffect(
          () => h(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <LineChart width={100} height={50} barSize={20}>
          <Comp />
        </LineChart>
      ));
      flush();
      expect(spy).toHaveBeenCalledWith(50);
    });
  });
});

describe("<LineChart /> and various data sources", () => {
  const randData = generateMockData(10, 38405);
  const data1 = randData.slice(0, 5);
  const data2 = randData.slice(5);

  function expectLabels(container: HTMLElement, expectedTextContents: ReadonlyArray<string>): void {
    const labels = container.querySelectorAll(".recharts-label");
    const actualTextContents = Array.from(labels).map((el) => el.textContent);
    expect(actualTextContents).toEqual(expectedTextContents);
  }

  it("should render chart with one line and data on root chart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={data1}>
        <Line isAnimationActive={false} label dataKey="x" />
        <XAxis dataKey="label" />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 0", x: "5", y: "373" },
      { textContent: "Iter: 1", x: "102.5", y: "373" },
      { textContent: "Iter: 2", x: "200", y: "373" },
      { textContent: "Iter: 3", x: "297.5", y: "373" },
      { textContent: "Iter: 4", x: "395", y: "373" },
    ]);
  });

  it("should render chart with three lines and data on root chart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={data1}>
        <Line isAnimationActive={false} label dataKey="x" />
        <Line isAnimationActive={false} label dataKey="y" />
        <XAxis dataKey="label" />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117", "597", "745", "657", "538", "762"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 0", x: "5", y: "373" },
      { textContent: "Iter: 1", x: "102.5", y: "373" },
      { textContent: "Iter: 2", x: "200", y: "373" },
      { textContent: "Iter: 3", x: "297.5", y: "373" },
      { textContent: "Iter: 4", x: "395", y: "373" },
    ]);
  });

  it("should render the chart when the same data are defined on Line elements and not on the chart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400}>
        <Line data={data1} isAnimationActive={false} label dataKey="x" />
        <Line data={data1} isAnimationActive={false} label dataKey="y" />
        <XAxis dataKey="label" />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117", "597", "745", "657", "538", "762"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 0", x: "5", y: "373" },
      { textContent: "Iter: 1", x: "48.333333333333336", y: "373" },
      { textContent: "Iter: 2", x: "91.66666666666667", y: "373" },
      { textContent: "Iter: 3", x: "135", y: "373" },
      { textContent: "Iter: 4", x: "178.33333333333334", y: "373" },
      { textContent: "Iter: 0", x: "221.66666666666669", y: "373" },
      { textContent: "Iter: 1", x: "265", y: "373" },
      { textContent: "Iter: 2", x: "308.33333333333337", y: "373" },
      { textContent: "Iter: 3", x: "351.6666666666667", y: "373" },
      { textContent: "Iter: 4", x: "395", y: "373" },
    ]);
  });

  it("should render the chart when the same data are defined on Line elements and not on the chart with allowDuplicateCategory", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400}>
        <Line data={data1} isAnimationActive={false} label dataKey="x" />
        <Line data={data1} isAnimationActive={false} label dataKey="y" />
        <XAxis dataKey="label" allowDuplicatedCategory={false} />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117", "597", "745", "657", "538", "762"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 0", x: "5", y: "373" },
      { textContent: "Iter: 1", x: "102.5", y: "373" },
      { textContent: "Iter: 2", x: "200", y: "373" },
      { textContent: "Iter: 3", x: "297.5", y: "373" },
      { textContent: "Iter: 4", x: "395", y: "373" },
    ]);
  });

  it("should render the same chart when the different data are defined on Line elements and not on the chart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400}>
        <Line data={data1} isAnimationActive={false} label dataKey="x" />
        <Line data={data2} isAnimationActive={false} label dataKey="y" />
        <XAxis dataKey="label" />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117", "770", "622", "670", "495", "603"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 0", x: "5", y: "373" },
      { textContent: "Iter: 1", x: "48.333333333333336", y: "373" },
      { textContent: "Iter: 2", x: "91.66666666666667", y: "373" },
      { textContent: "Iter: 3", x: "135", y: "373" },
      { textContent: "Iter: 4", x: "178.33333333333334", y: "373" },
      { textContent: "Iter: 5", x: "221.66666666666669", y: "373" },
      { textContent: "Iter: 6", x: "265", y: "373" },
      { textContent: "Iter: 7", x: "308.33333333333337", y: "373" },
      { textContent: "Iter: 8", x: "351.6666666666667", y: "373" },
      { textContent: "Iter: 9", x: "395", y: "373" },
    ]);
  });

  it("should render chart where some data are defined on the line and some on the chart", () => {
    const { container } = render(() => (
      <LineChart width={400} height={400} data={data2}>
        <Line data={data1} isAnimationActive={false} label dataKey="x" />
        <Line isAnimationActive={false} label dataKey="y" />
        <XAxis dataKey="label" />
      </LineChart>
    ));
    flush();
    expectLabels(container, ["258", "295", "193", "168", "117", "770", "622", "670", "495", "603"]);
    expectXAxisTicks(container, [
      { textContent: "Iter: 5", x: "5", y: "373" },
      { textContent: "Iter: 6", x: "48.333333333333336", y: "373" },
      { textContent: "Iter: 7", x: "91.66666666666667", y: "373" },
      { textContent: "Iter: 8", x: "135", y: "373" },
      { textContent: "Iter: 9", x: "178.33333333333334", y: "373" },
      { textContent: "Iter: 0", x: "221.66666666666669", y: "373" },
      { textContent: "Iter: 1", x: "265", y: "373" },
      { textContent: "Iter: 2", x: "308.33333333333337", y: "373" },
      { textContent: "Iter: 3", x: "351.6666666666667", y: "373" },
      { textContent: "Iter: 4", x: "395", y: "373" },
    ]);
  });
});

describe("<LineChart /> with dataKey as a function", () => {
  type MockDataPointType = {
    x?: { value: number };
    y?: { value: number };
    name: string;
  };
  const data1: ReadonlyArray<MockDataPointType> = [
    { x: { value: 1 }, name: "x1" },
    { x: { value: 2 }, name: "x2" },
    { x: { value: 3 }, name: "x3" },
  ];
  const data2: ReadonlyArray<MockDataPointType> = [
    { y: { value: 3 }, name: "y1" },
    { y: { value: 2 }, name: "y2" },
    { y: { value: 1 }, name: "y3" },
  ];
  const dataKey1 = (d: MockDataPointType) => {
    assertNotNull(d.x);
    return d.x.value;
  };
  const dataKey2 = (d: MockDataPointType) => {
    assertNotNull(d.y);
    return d.y.value;
  };

  it("should use the return value as data points", () => {
    const [useData2, setUseData2] = createSignal(false);
    const { container } = render(() => (
      <LineChart width={300} height={300} data={useData2() ? data2 : data1}>
        <Line dataKey={useData2() ? dataKey2 : dataKey1} isAnimationActive={false} />
      </LineChart>
    ));
    flush();
    expectLines(container, [{ d: "M5,198.333L150,101.667L295,5" }]);

    setUseData2(true);
    flush();
    expectLines(container, [{ d: "M5,5L150,101.667L295,198.333" }]);
  });
});
