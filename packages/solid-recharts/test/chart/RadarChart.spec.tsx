// Ported from recharts 3.8.1 test/chart/RadarChart.spec.tsx (commit 7a23854).
//
// The reference `expectRadarPolygons` helper is not part of the ported test/helper
// set, so the polygon `d`/fill/fillOpacity assertions are inlined here. `flush()`
// is needed because Radar registers via an effect and points compute from the store.
//
// Reference cases that use `rerender` to change a CHART-LEVEL prop (innerRadius /
// outerRadius / clockWise / startAngle "does nothing") are ported via a reactive
// signal driving that prop — the assertion (unchanged geometry) is identical.
//
// PERMANENT-N/A: the `Customized`-component-based "Renders polygon with
// implicit/default axes" cases (no Customized in the port) — the selector
// assertions they make are already covered by the createSelectorTestCase cases here.
import { createEffect, createSignal, flush } from "solid-js";
import { describe, expect, it, test, vi } from "vitest";
import { exampleRadarData } from "../_data";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "../../src";
import { render, fireEvent } from "../helper/render";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { expectLastCalledWithScale } from "../helper/expectScale";
import { selectRealScaleType } from "../../src/state/selectors/axisSelectors";
import {
  selectAngleAxis,
  selectMaxRadius,
  selectOuterRadius,
  selectPolarOptions,
  selectRadiusAxisRangeWithReversed,
} from "../../src/state/selectors/polarAxisSelectors";
import { selectPolarAxisScale } from "../../src/state/selectors/polarScaleSelectors";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";

type ExpectedRadarPolygon = {
  d: string | null;
  fill: string | null;
  fillOpacity: string | null;
};

function expectRadarPolygons(
  container: Element,
  expected: ReadonlyArray<ExpectedRadarPolygon>,
): void {
  const polygons = container.querySelectorAll(".recharts-radar-polygon path");
  const actual = Array.from(polygons).map((p) => ({
    d: p.getAttribute("d"),
    fill: p.getAttribute("fill"),
    fillOpacity: p.getAttribute("fill-opacity"),
  }));
  expect(actual).toEqual(expected);
}

describe("<RadarChart />", () => {
  describe("with implicit axes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <RadarChart
        cx={100}
        cy={150}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" />
        {props.children}
      </RadarChart>
    ));

    it("should select angle settings", () => {
      const { spy } = renderTestCase((state) => selectAngleAxis(state, 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: false,
        dataKey: undefined,
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: undefined,
        ticks: undefined,
        type: "category",
        unit: undefined,
      });
    });

    it("should select angle axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
      expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5, 6, 7], range: [-270, 90] });
    });

    it("should select angle axis scale type", () => {
      const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
      expectLastCalledWith(spy, "band");
    });

    it("should select max radius", () => {
      const { spy } = renderTestCase(selectMaxRadius);
      expectLastCalledWith(spy, 245);
    });

    it("should select polar options", () => {
      const { spy } = renderTestCase(selectPolarOptions);
      expectLastCalledWith(spy, {
        cx: 100,
        cy: 150,
        endAngle: -270,
        innerRadius: 0,
        outerRadius: 150,
        startAngle: 90,
      });
    });

    it("should select outer radius", () => {
      const { spy } = renderTestCase(selectOuterRadius);
      expectLastCalledWith(spy, 150);
    });

    it("should select radius axis range", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
      expectLastCalledWith(spy, [0, 150]);
    });

    it("should select radius axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
      expectLastCalledWithScale(spy, { domain: [0, 1000], range: [0, 150] });
    });

    it("should select radius axis scale type", () => {
      const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
      expectLastCalledWith(spy, "linear");
    });

    it("should render polygon", () => {
      const { container } = render(() => (
        <RadarChart
          cx={100}
          cy={150}
          outerRadius={150}
          width={600}
          height={500}
          data={exampleRadarData}
        >
          <Radar dataKey="value" />
        </RadarChart>
      ));
      flush();
      expectRadarPolygons(container, [
        {
          d: "M100,150L100,150L100,150L100,150L100,150L100,150L100,150L100,150L100,150Z",
          fill: null,
          fillOpacity: null,
        },
      ]);
    });
  });

  test("innerRadius prop does not do anything", () => {
    const [innerRadius, setInnerRadius] = createSignal(10);
    const expectedPolygons: ReadonlyArray<ExpectedRadarPolygon> = [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: null,
        fillOpacity: null,
      },
    ];
    const { container } = render(() => (
      <RadarChart innerRadius={innerRadius()} width={600} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, expectedPolygons);

    setInnerRadius(20);
    flush();
    expectRadarPolygons(container, expectedPolygons);
  });

  test("outerRadius prop does not do anything", () => {
    const [outerRadius, setOuterRadius] = createSignal(10);
    const expectedPolygons: ReadonlyArray<ExpectedRadarPolygon> = [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: null,
        fillOpacity: null,
      },
    ];
    const { container } = render(() => (
      <RadarChart outerRadius={outerRadius()} width={600} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, expectedPolygons);

    setOuterRadius(20);
    flush();
    expectRadarPolygons(container, expectedPolygons);
  });

  test("startAngle and endAngle props do not do anything", () => {
    const [angles, setAngles] = createSignal({ startAngle: 20, endAngle: 70 });
    const { container } = render(() => (
      <RadarChart
        startAngle={angles().startAngle}
        endAngle={angles().endAngle}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: null,
        fillOpacity: null,
      },
    ]);

    setAngles({ startAngle: 90, endAngle: 270 });
    flush();
    expectRadarPolygons(container, [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: null,
        fillOpacity: null,
      },
    ]);
  });

  test("renders multiple polygons with different dataKeys", () => {
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" fill="green" fillOpacity={0.3} />
        <Radar dataKey="half" fill="blue" fillOpacity={0.6} />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: "green",
        fillOpacity: "0.3",
      },
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: "blue",
        fillOpacity: "0.6",
      },
    ]);
  });

  it("should move the polygons when cx and cy are percent string", () => {
    const { container } = render(() => (
      <RadarChart
        cx="10%"
        cy="90%"
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" fill="green" fillOpacity={0.3} />
        <Radar dataKey="half" fill="blue" fillOpacity={0.6} />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, [
      {
        d: "M60,450L60,450L60,450L60,450L60,450L60,450L60,450L60,450L60,450Z",
        fill: "green",
        fillOpacity: "0.3",
      },
      {
        d: "M60,450L60,450L60,450L60,450L60,450L60,450L60,450L60,450L60,450Z",
        fill: "blue",
        fillOpacity: "0.6",
      },
    ]);
  });

  it("should place the polygons in the middle by default when cx and cy are undefined", () => {
    const { container } = render(() => (
      <RadarChart outerRadius={150} width={600} height={500} data={exampleRadarData}>
        <Radar dataKey="value" fill="green" fillOpacity={0.3} />
        <Radar dataKey="half" fill="blue" fillOpacity={0.6} />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, [
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: "green",
        fillOpacity: "0.3",
      },
      {
        d: "M300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250L300,250Z",
        fill: "blue",
        fillOpacity: "0.6",
      },
    ]);
  });

  it("should move polygons when cx and cy and outerRadius are updated", () => {
    const [pos, setPos] = createSignal({ cx: 100, cy: 120, outerRadius: 150 });
    const { container } = render(() => (
      <RadarChart
        cx={pos().cx}
        cy={pos().cy}
        outerRadius={pos().outerRadius}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" fill="green" fillOpacity={0.3} />
        <Radar dataKey="half" fill="blue" fillOpacity={0.6} />
      </RadarChart>
    ));
    flush();
    expectRadarPolygons(container, [
      {
        d: "M100,120L100,120L100,120L100,120L100,120L100,120L100,120L100,120L100,120Z",
        fill: "green",
        fillOpacity: "0.3",
      },
      {
        d: "M100,120L100,120L100,120L100,120L100,120L100,120L100,120L100,120L100,120Z",
        fill: "blue",
        fillOpacity: "0.6",
      },
    ]);

    setPos({ cx: 200, cy: 230, outerRadius: 100 });
    flush();
    expectRadarPolygons(container, [
      {
        d: "M200,230L200,230L200,230L200,230L200,230L200,230L200,230L200,230L200,230Z",
        fill: "green",
        fillOpacity: "0.3",
      },
      {
        d: "M200,230L200,230L200,230L200,230L200,230L200,230L200,230L200,230L200,230Z",
        fill: "blue",
        fillOpacity: "0.6",
      },
    ]);
  });

  test("Render 8 dots when dot=true", () => {
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar isAnimationActive={false} dot dataKey="value" />
      </RadarChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-radar-dot")).toHaveLength(8);
  });

  test("Render 8 labels when label=true", () => {
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar isAnimationActive={false} label dataKey="value" />
      </RadarChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-label")).toHaveLength(8);
  });

  test("Render 1 PolarGrid 1 PolarAngleAxis and 1 PolarRadiusAxis in simple Radar", () => {
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        startAngle={45}
        innerRadius={20}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" fill="#9597E4" fillOpacity={0.6} stroke="#8889DD" strokeWidth={3} />
        <PolarGrid />
        <PolarAngleAxis />
        <PolarRadiusAxis orientation="middle" angle={67.5} />
      </RadarChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-polar-grid")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-polar-angle-axis")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-polar-radius-axis")).toHaveLength(1);
  });

  test("Render 8 angle grid angle line, 8 angle axis ticks, and 5 radius axis ticks", () => {
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        startAngle={45}
        innerRadius={20}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" fill="#9597E4" fillOpacity={0.6} stroke="#8889DD" strokeWidth={3} />
        <PolarGrid />
        <PolarAngleAxis />
        <PolarRadiusAxis orientation="middle" angle={67.5} />
      </RadarChart>
    ));
    flush();
    expect(
      container.querySelectorAll(".recharts-polar-grid .recharts-polar-grid-angle line"),
    ).toHaveLength(8);
    expect(
      container.querySelectorAll(".recharts-polar-angle-axis .recharts-polar-angle-axis-tick"),
    ).toHaveLength(8);
    expect(
      container.querySelectorAll(".recharts-polar-radius-axis .recharts-polar-radius-axis-tick"),
    ).toHaveLength(5);
  });

  test("click on Sector should invoke onClick callback", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <RadarChart
        cx={300}
        cy={250}
        outerRadius={150}
        width={600}
        height={500}
        data={exampleRadarData}
      >
        <Radar dataKey="value" onClick={onClick} />
      </RadarChart>
    ));
    flush();
    const radar = container.querySelector(".recharts-polygon");
    expect(radar).not.toBeNull();
    fireEvent.click(radar!);
    expect(onClick).toBeCalled();
  });

  describe("RadarChart layout context", () => {
    it("should provide viewBox", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const viewBox = useViewBox();
        createEffect(
          () => viewBox(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <RadarChart width={100} height={50} barSize={20}>
          <Comp />
        </RadarChart>
      ));
      flush();
      expect(spy).toHaveBeenLastCalledWith({ height: 40, width: 90, x: 5, y: 5 });
    });

    it("should provide chart width", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const width = useChartWidth();
        createEffect(
          () => width(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <RadarChart width={100} height={50} barSize={20}>
          <Comp />
        </RadarChart>
      ));
      flush();
      expect(spy).toHaveBeenLastCalledWith(100);
    });

    it("should provide chart height", () => {
      const spy = vi.fn();
      const Comp = (): null => {
        const height = useChartHeight();
        createEffect(
          () => height(),
          (v) => spy(v),
        );
        return null;
      };
      render(() => (
        <RadarChart width={100} height={50} barSize={20}>
          <Comp />
        </RadarChart>
      ));
      flush();
      expect(spy).toHaveBeenLastCalledWith(50);
    });
  });
});
