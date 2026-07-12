import { describe, it, expect, vi } from "vitest";
import { createEffect, createSignal, flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { fireEvent, render } from "@solidjs/testing-library";
import {
  BarChart,
  CartesianGrid,
  Scatter,
  ScatterChart,
  Surface,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { useAppSelector } from "../../src/state/hooks";
import {
  selectAxisDomain,
  selectRealScaleType,
  selectZAxisSettings,
  selectZAxisWithScale,
} from "../../src/state/selectors/axisSelectors";
import { ZAxisSettings } from "../../src/state/cartesianAxisSlice";
import { useIsPanorama } from "../../src/context/PanoramaContext";
import { expectTooltipPayload } from "../component/Tooltip/tooltipTestHelpers";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

/*
 * Ported from recharts 3.8.1 test/cartesian/ZAxis.spec.tsx. Solid adaptations:
 * rechartsTestRender → render(() => …); userEvent.hover → fireEvent.mouseEnter +
 * flush()/runAllTimers; rerender → createSignal prop-toggle + flush(); the inline
 * selector-spy Comp reads each accessor via createEffect (sync body reads warn
 * STRICT_READ); React.useState id-change → createSignal; toHaveBeenCalledTimes dropped.
 */

describe("<ZAxis />", () => {
  const data = [
    { name: "Page A", xAxis: 590, zAxis: 800, yAxis: 1000 },
    { name: "Page B", xAxis: 490, zAxis: 100, yAxis: 1400 },
  ];

  it("should not render anything", () => {
    render(() => (
      <Surface width={500} height={500}>
        <ZAxis dataKey="x" name="stature" unit="cm" />
      </Surface>
    ));
    const svg = document.querySelector("svg");
    assertNotNull(svg);

    expect(svg).toBeInTheDocument();
    expect(svg.children).toHaveLength(2);
  });

  it("Renders Scatters symbols and tooltips with Z axis data", () => {
    mockGetBoundingClientRect({ width: 100, height: 100 });
    const { container } = render(() => (
      <ScatterChart height={400} width={400}>
        <XAxis dataKey="xAxis" type="number" />
        <YAxis dataKey="yAxis" />
        <ZAxis dataKey="zAxis" name="test name" range={[0, 2000]} unit="km" />
        <CartesianGrid />
        <Scatter data={data} name="pageData" isAnimationActive={false} />
        <Tooltip />
      </ScatterChart>
    ));

    const svg = document.querySelector("svg");
    assertNotNull(svg);
    const gContainers = svg.querySelectorAll(".recharts-layer.recharts-scatter-symbol");

    expect(gContainers).toHaveLength(data.length);

    const [row0, row1] = data;
    assertNotNull(row0);
    assertNotNull(row1);
    const g0 = gContainers[0];
    const g1 = gContainers[1];
    assertNotNull(g0);
    assertNotNull(g1);

    const firstShape = g0.querySelector("path");
    assertNotNull(firstShape);
    expect(firstShape.getAttribute("name")).toBe(row0.name);

    const secondShape = g1.querySelector("path");
    assertNotNull(secondShape);
    expect(secondShape.getAttribute("name")).toBe(row1.name);

    const firstShapeWidth = Number(firstShape.getAttribute("width"));
    const secondShapeWidth = Number(secondShape.getAttribute("width"));

    expect(firstShapeWidth).toBeGreaterThan(secondShapeWidth);

    const tooltip = container.querySelector(".recharts-tooltip-wrapper");
    expect(tooltip).not.toBeVisible();

    fireEvent.mouseEnter(g0, { clientX: 20, clientY: 20 });
    flush();
    vi.runAllTimers();
    flush();

    expectTooltipPayload(container, "", [
      `test name : ${row0.zAxis}km`,
      `xAxis : ${row0.xAxis}`,
      `yAxis : ${row0.yAxis}`,
    ]);

    fireEvent.mouseLeave(g0);
    flush();
    vi.runAllTimers();
    flush();
    expect(tooltip).not.toBeVisible();

    fireEvent.mouseEnter(g1, { clientX: 20, clientY: 20 });
    flush();
    vi.runAllTimers();
    flush();
    expectTooltipPayload(container, "", [
      `test name : ${row1.zAxis}km`,
      `xAxis : ${row1.xAxis}`,
      `yAxis : ${row1.yAxis}`,
    ]);
  });

  it("should respect domain prop for calculating sizes", () => {
    const dataOne = [{ x: 10, y: 10, z: 100 }];
    const [domain, setDomain] = createSignal<[number, number]>([0, 100]);
    const { container } = render(() => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="x" type="number" />
        <YAxis dataKey="y" type="number" />
        <Scatter data={dataOne} isAnimationActive={false} />
        <ZAxis dataKey="z" range={[0, 100]} domain={domain()} />
      </ScatterChart>
    ));

    const firstRenderSymbol = container.querySelector("path");
    assertNotNull(firstRenderSymbol);
    const firstWidth = Number(firstRenderSymbol.getAttribute("width"));

    // Larger domain → same z value (100) is a smaller portion → smaller size.
    setDomain([0, 200]);
    flush();

    const secondRenderSymbol = container.querySelector("path");
    assertNotNull(secondRenderSymbol);
    const secondWidth = Number(secondRenderSymbol.getAttribute("width"));

    expect(secondWidth).toBeLessThan(firstWidth);
  });

  it('should respect scale="log" prop for calculating sizes', () => {
    const dataTwo = [
      { x: 10, y: 10, z: 10 },
      { x: 20, y: 20, z: 1000 },
    ];
    // recharts re-renders the whole tree (rerender). Two static renders is the
    // faithful Solid equivalent and sidesteps merge()'s explicit-undefined gotcha
    // (a reactive `scale={undefined}` would not resolve back to the default).
    const linear = render(() => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="x" type="number" />
        <YAxis dataKey="y" type="number" />
        <Scatter data={dataTwo} isAnimationActive={false} />
        <ZAxis dataKey="z" range={[100, 500]} domain={[0, 1000]} />
      </ScatterChart>
    ));

    const linearSymbols = linear.container.querySelectorAll("path");
    const linearSmall = Number(linearSymbols[0]!.getAttribute("width"));
    const linearLarge = Number(linearSymbols[1]!.getAttribute("width"));
    const linearRatio = linearLarge / linearSmall;
    linear.unmount();

    const log = render(() => (
      <ScatterChart width={400} height={400}>
        <XAxis dataKey="x" type="number" />
        <YAxis dataKey="y" type="number" />
        <Scatter data={dataTwo} isAnimationActive={false} />
        <ZAxis dataKey="z" range={[100, 500]} scale="log" domain={[0.1, 1000]} />
      </ScatterChart>
    ));

    const logSymbols = log.container.querySelectorAll("path");
    const logSmall = Number(logSymbols[0]!.getAttribute("width"));
    const logLarge = Number(logSymbols[1]!.getAttribute("width"));
    const logRatio = logLarge / logSmall;

    // Log scale compresses the visual difference vs linear.
    expect(linearSmall).not.toBe(logSmall);
    expect(logRatio).toBeLessThan(linearRatio);
  });

  describe("state integration", () => {
    it("should publish its configuration to redux store", () => {
      const axisSettingsSpy = vi.fn();
      const axisDomainSpy = vi.fn();
      const axisScaleSpy = vi.fn();
      const Comp = (): null => {
        const isPanorama = useIsPanorama();
        const settings = useAppSelector((state) => selectZAxisSettings(state, "zaxis id"));
        const domain = useAppSelector((state) =>
          selectAxisDomain(state, "zAxis", "zaxis id", isPanorama),
        );
        const axis = useAppSelector((state) =>
          selectZAxisWithScale(state, "zAxis", "zaxis id", false),
        );
        const realScaleType = useAppSelector((state) =>
          selectRealScaleType(state, "zAxis", "zaxis id"),
        );
        createEffect(
          () => settings(),
          (v) => axisSettingsSpy(v),
        );
        createEffect(
          () => domain(),
          (v) => axisDomainSpy(v),
        );
        createEffect(
          () => ({
            domain: axis()?.scale?.domain(),
            range: axis()?.scale?.range(),
            realScaleType: realScaleType(),
          }),
          (v) => axisScaleSpy(v),
        );
        return null;
      };
      render(() => (
        <ScatterChart height={400} width={400}>
          <XAxis dataKey="xAxis" type="number" />
          <YAxis dataKey="yAxis" />
          <ZAxis zAxisId="zaxis id" dataKey="zAxis" name="test name" range={[20, 30]} unit="km" />
          <CartesianGrid />
          <Scatter data={data} name="pageData" zAxisId="zaxis id" isAnimationActive={false} />
          <Tooltip />
          <Comp />
        </ScatterChart>
      ));
      const expected: ZAxisSettings = {
        domain: undefined,
        allowDataOverflow: false,
        allowDuplicatedCategory: false,
        includeHidden: false,
        reversed: false,
        scale: "auto",
        type: "number",
        id: "zaxis id",
        dataKey: "zAxis",
        name: "test name",
        unit: "km",
        range: [20, 30],
      };
      expect(axisSettingsSpy).toHaveBeenLastCalledWith(expected);
      expect(axisDomainSpy).toHaveBeenLastCalledWith([0, 800]);
      expect(axisScaleSpy).toHaveBeenLastCalledWith({
        domain: [0, 800],
        range: [20, 30],
        realScaleType: "linear",
      });
    });

    it("should remove old ID configuration when the ID changes", () => {
      const IDChangingComponent = (props: { children?: JSX.Element }): JSX.Element => {
        const [id, setId] = createSignal("1");
        const onClick = () => setId("2");
        return (
          <>
            <button type="button" class="pushbutton" onClick={onClick}>
              Change ID
            </button>
            <BarChart width={100} height={100}>
              <ZAxis zAxisId={id()} scale="log" type="number" />
              {props.children}
            </BarChart>
          </>
        );
      };
      const renderTestCase = createSelectorTestCase(IDChangingComponent);

      const { spy, container } = renderTestCase((state) => state.cartesianAxis.zAxis);

      // only id "1" exists
      const lastCallArgs1 = spy.mock.lastCall?.[0];
      assertNotNull(lastCallArgs1);
      expect(Object.keys(lastCallArgs1)).toEqual(["1"]);

      fireEvent.click(container.getElementsByClassName("pushbutton")[0]!);
      flush();

      // only id "2" exists
      const lastCallArgs2 = spy.mock.lastCall?.[0];
      assertNotNull(lastCallArgs2);
      expect(Object.keys(lastCallArgs2)).toEqual(["2"]);
    });
  });
});
