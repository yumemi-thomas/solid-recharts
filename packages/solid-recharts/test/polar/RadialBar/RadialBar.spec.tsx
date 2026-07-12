// Ported from recharts 3.8.1 test/polar/RadialBar/RadialBar.spec.tsx (commit
// 7a23854). Tier-B selector cases are golden-anchored to recharts; Tier-A render
// cases assert byte-identical sector `d` paths via an inlined expectRadialBars
// (the reference helper isn't in the ported test/helper set).
//
// `ringsData` and the inlined `expectRadialBars` live here because they are not
// part of the shared ported fixtures/helpers and this spec may only edit itself.
//
// The recharts "calls mouse handler events" / "calls touch handler events" cases
// ARE ported: the ported RadialBar forwards user-supplied
// onMouseEnter/onMouseLeave/onClick/onTouchMove/onTouchEnd to each sector's
// wrapping <Layer> g. mouseenter does NOT bubble, so (per the repo pattern) the
// ported cases fireEvent on that wrapping g (the parent of the sector path),
// not on the inner path; the handler-arg assertions are unchanged except for the
// extra `clockWise: false` field the Solid sector shape carries (see the selector
// cases above).
import { createEffect, createSignal, flush, Show } from "solid-js";
import type { Mock } from "vitest";
import type { RadialBarDataItem } from "../../../src/polar/RadialBar";
import { describe, expect, it, vi } from "vitest";
import {
  DefaultZIndexes,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Tooltip,
} from "../../../src";
import { assertZIndexLayerOrder } from "../../helper/assertZIndexLayerOrder";
import { fireEvent, render } from "../../helper/render";
import { useAppSelector } from "../../../src/state/hooks";
import { selectPolarItemsSettings } from "../../../src/state/selectors/polarSelectors";
import { PageData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import {
  selectPolarAxisScale,
  selectPolarAxisTicks,
  selectPolarGraphicalItemAxisTicks,
} from "../../../src/state/selectors/polarScaleSelectors";
import {
  selectBandSizeOfPolarAxis,
  selectPolarBarBandSize,
  selectPolarBarPosition,
  selectPolarBarSizeList,
  selectRadialBarSectors,
} from "../../../src/state/selectors/radialBarSelectors";
import {
  selectAngleAxis,
  selectRadiusAxis,
  selectRadiusAxisRangeWithReversed,
} from "../../../src/state/selectors/polarAxisSelectors";
import {
  selectBarCategoryGap,
  selectBarGap,
  selectRootMaxBarSize,
} from "../../../src/state/selectors/rootPropsSelectors";
import { selectRealScaleType } from "../../../src/state/selectors/axisSelectors";
import type { RadialBarSettings } from "../../../src/state/types/RadialBarSettings";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { trim } from "../../helper/trim";
import { assertNotNull } from "../../helper/assertNotNull";

// Inlined from recharts 3.8.1 test/helper/expectRadialBars.ts.
type ExpectRadialBar = { d: string };

function getRadialBarPaths(container: Element): ReadonlyArray<ExpectRadialBar> {
  const bars = container.querySelectorAll(
    ".recharts-radial-bar-sectors path.recharts-sector.recharts-radial-bar-sector",
  );
  return Array.from(bars).map((bar) => {
    const trimmed = trim(bar.getAttribute("d"));
    assertNotNull(trimmed);
    return { d: trimmed };
  });
}

function expectRadialBars(
  container: Element,
  expectedRadialBars: ReadonlyArray<ExpectRadialBar>,
): void {
  const actualBars = getRadialBarPaths(container);
  expect(actualBars).toEqual(expectedRadialBars);
}

// Ported from recharts 3.8.1 test/_data.ts `ringsData` (not in the shared ported
// fixtures).
const ringsData = [
  { name: "Elves", rings: 3, fill: "green" },
  { name: "Dwarves", rings: 7, fill: "blue" },
  { name: "Humans", rings: 9, fill: "red" },
  { name: "Sauron", rings: 1, fill: "black" },
];

describe("<RadialBar />", () => {
  describe("with implicit axes", () => {
    const radialBarSettings: RadialBarSettings = {
      id: "radial-bar-uv",
      dataKey: "pv",
      minPointSize: 0,
      stackId: undefined,
      maxBarSize: undefined,
      barSize: undefined,
      type: "radialBar",
      angleAxisId: 0,
      radiusAxisId: 0,
      data: undefined,
      hide: false,
    };

    const renderTestCase = createSelectorTestCase((props) => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar isAnimationActive={false} dataKey="pv" />
        {props.children}
      </RadialBarChart>
    ));

    it("should select polar items", () => {
      const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
      expectLastCalledWith(spy, [
        {
          id: expect.stringMatching("recharts-radial-bar-"),
          maxBarSize: undefined,
          minPointSize: 0,
          angleAxisId: 0,
          barSize: undefined,
          data: undefined,
          dataKey: "pv",
          hide: false,
          radiusAxisId: 0,
          stackId: undefined,
          type: "radialBar",
        },
      ]);
    });

    it("should select angle axis settings", () => {
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
        type: "number",
        unit: undefined,
      });
    });

    it("should select angle axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 9800],
        range: [0, 360],
      });
    });

    it("should select radius axis settings", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: true,
        dataKey: undefined,
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: 5,
        ticks: undefined,
        type: "category",
        unit: undefined,
      });
    });

    it("should select radius axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 1, 2, 3, 4, 5],
        range: [0, 196],
      });
    });

    it("should select radius axis ticks", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarAxisTicks(state, "radiusAxis", 0, false),
      );
      expectLastCalledWith(spy, [
        { coordinate: 16.333333333333332, index: 0, offset: 16.333333333333332, value: 0 },
        { coordinate: 49, index: 1, offset: 16.333333333333332, value: 1 },
        { coordinate: 81.66666666666666, index: 2, offset: 16.333333333333332, value: 2 },
        { coordinate: 114.33333333333333, index: 3, offset: 16.333333333333332, value: 3 },
        { coordinate: 147, index: 4, offset: 16.333333333333332, value: 4 },
        { coordinate: 179.66666666666666, index: 5, offset: 16.333333333333332, value: 5 },
      ]);
    });

    it("should select barBandSize", () => {
      const { spy } = renderTestCase((state) => selectBandSizeOfPolarAxis(state, 0, 0));
      expectLastCalledWith(spy, 32.666666666666664);
    });

    it("should select selectRootMaxBarSize", () => {
      const { spy } = renderTestCase(selectRootMaxBarSize);
      expectLastCalledWith(spy, undefined);
    });

    it("should select bar size list", () => {
      const { spy } = renderTestCase((state) => selectPolarBarSizeList(state, 0, 0));
      expectLastCalledWith(spy, [
        {
          barSize: undefined,
          dataKeys: ["pv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select barGap", () => {
      const { spy } = renderTestCase(selectBarGap);
      expectLastCalledWith(spy, 4);
    });

    it("should select barCategoryGap", () => {
      const { spy } = renderTestCase(selectBarCategoryGap);
      expectLastCalledWith(spy, "10%");
    });

    it("should select bandSize", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarBarBandSize(state, 0, 0, radialBarSettings),
      );
      expectLastCalledWith(spy, 32.666666666666664);
    });

    it("should select bar position and offset", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarBarPosition(state, 0, 0, radialBarSettings),
      );
      expectLastCalledWith(spy, { offset: 3.266666666666666, size: 26 });
    });

    it("should select radial bar sectors", () => {
      const { spy } = renderTestCase((state) =>
        selectRadialBarSectors(state, 0, 0, radialBarSettings, undefined),
      );
      expectLastCalledWith(spy, [
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 3.266666666666666,
            outerRadius: 29.266666666666666,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 88.16326530612244,
          innerRadius: 3.266666666666666,
          name: "Page A",
          outerRadius: 29.266666666666666,
          payload: { amt: 2400, name: "Page A", pv: 2400, uv: 400 },
          pv: 2400,
          startAngle: 0,
          uv: 400,
          value: 2400,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 35.93333333333333,
            outerRadius: 61.93333333333333,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 167.76734693877552,
          innerRadius: 35.93333333333333,
          name: "Page B",
          outerRadius: 61.93333333333333,
          payload: { amt: 2400, name: "Page B", pv: 4567, uv: 300 },
          pv: 4567,
          startAngle: 0,
          uv: 300,
          value: 4567,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 68.6,
            outerRadius: 94.6,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 51.35510204081632,
          innerRadius: 68.6,
          name: "Page C",
          outerRadius: 94.6,
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          pv: 1398,
          startAngle: 0,
          uv: 300,
          value: 1398,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 101.26666666666667,
            outerRadius: 127.26666666666667,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 360,
          innerRadius: 101.26666666666667,
          name: "Page D",
          outerRadius: 127.26666666666667,
          payload: { amt: 2400, name: "Page D", pv: 9800, uv: 200 },
          pv: 9800,
          startAngle: 0,
          uv: 200,
          value: 9800,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 133.93333333333334,
            outerRadius: 159.93333333333334,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 143.5591836734694,
          innerRadius: 133.93333333333334,
          name: "Page E",
          outerRadius: 159.93333333333334,
          payload: { amt: 2400, name: "Page E", pv: 3908, uv: 278 },
          pv: 3908,
          startAngle: 0,
          uv: 278,
          value: 3908,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 166.6,
            outerRadius: 192.6,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 176.32653061224488,
          innerRadius: 166.6,
          name: "Page F",
          outerRadius: 192.6,
          payload: { amt: 2400, name: "Page F", pv: 4800, uv: 189 },
          pv: 4800,
          startAngle: 0,
          uv: 189,
          value: 4800,
        },
      ]);
    });

    it("should render sectors", () => {
      const { container } = renderTestCase();

      expectRadialBars(container, [
        {
          d: "M 279.2667,250 A 29.2667,29.2667,0, 0,0, 250.938,220.7484 L 250.1047,246.735 A 3.2667,3.2667,0, 0,1, 253.2667,250 Z",
        },
        {
          d: "M 311.9333,250 A 61.9333,61.9333,0, 0,0, 189.4728,236.8775 L 214.8825,242.3864 A 35.9333,35.9333,0, 0,1, 285.9333,250 Z",
        },
        {
          d: "M 344.6,250 A 94.6,94.6,0, 0,0, 309.0769,176.1144 L 292.8401,196.4212 A 68.6,68.6,0, 0,1, 318.6,250 Z",
        },
        {
          d: "M 377.2667,250 A 127.2667,127.2667,0, 1,0, 377.2667,250.0022 L 351.2667,250.0018 A 101.2667,101.2667,0, 1,1, 351.2667,250 Z",
        },
        {
          d: "M 409.9333,250 A 159.9333,159.9333,0, 0,0, 121.3383,155.0009 L 142.2545,170.4447 A 133.9333,133.9333,0, 0,1, 383.9333,250 Z",
        },
        {
          d: "M 442.6,250 A 192.6,192.6,0, 0,0, 57.7957,237.6601 L 83.7423,239.3259 A 166.6,166.6,0, 0,1, 416.6,250 Z",
        },
      ]);
    });
  });

  describe("with configured axes", () => {
    const radialBarSettings: RadialBarSettings = {
      id: "my-radial-bar",
      dataKey: "pv",
      minPointSize: 0,
      stackId: undefined,
      maxBarSize: undefined,
      barSize: undefined,
      type: "radialBar",
      angleAxisId: "",
      radiusAxisId: "",
      data: [],
      hide: false,
    };

    const renderTestCase = createSelectorTestCase((props) => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <PolarAngleAxis dataKey="pv" type="number" axisLineType="circle" />
        <PolarRadiusAxis dataKey="name" orientation="middle" type="category" angle={90} />
        <RadialBar isAnimationActive={false} dataKey="pv" />
        {props.children}
      </RadialBarChart>
    ));

    it("should select polar items", () => {
      const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
      expectLastCalledWith(spy, [
        {
          id: expect.stringMatching("recharts-radial-bar-"),
          angleAxisId: 0,
          barSize: undefined,
          data: undefined,
          dataKey: "pv",
          hide: false,
          radiusAxisId: 0,
          stackId: undefined,
          type: "radialBar",
          maxBarSize: undefined,
          minPointSize: 0,
        },
      ]);
    });

    it("should select angle axis settings", () => {
      const { spy } = renderTestCase((state) => selectAngleAxis(state, 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: false,
        dataKey: "pv",
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
        type: "number",
        unit: undefined,
      });
    });

    it("should select angle axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 9800],
        range: [0, 360],
      });
    });

    it("should select radius axis settings", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: true,
        dataKey: "name",
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: 5,
        ticks: undefined,
        type: "category",
        unit: undefined,
      });
    });

    it("should select radius axis realScaleType", () => {
      const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
      expectLastCalledWith(spy, "band");
    });

    it("should select radius axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: ["Page A", "Page B", "Page C", "Page D", "Page E", "Page F"],
        range: [0, 196],
        bandwidth: 32.666666666666664,
      });
    });

    it("should select radius axis range", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
      expectLastCalledWith(spy, [0, 196]);
    });

    it("should select radius axis ticks", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarAxisTicks(state, "radiusAxis", 0, false),
      );
      expectLastCalledWith(spy, [
        { coordinate: 16.333333333333332, index: 0, offset: 16.333333333333332, value: "Page A" },
        { coordinate: 49, index: 1, offset: 16.333333333333332, value: "Page B" },
        { coordinate: 81.66666666666666, index: 2, offset: 16.333333333333332, value: "Page C" },
        { coordinate: 114.33333333333333, index: 3, offset: 16.333333333333332, value: "Page D" },
        { coordinate: 147, index: 4, offset: 16.333333333333332, value: "Page E" },
        { coordinate: 179.66666666666666, index: 5, offset: 16.333333333333332, value: "Page F" },
      ]);
    });

    it("should select bar size and offset", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarBarPosition(state, 0, 0, radialBarSettings),
      );
      expectLastCalledWith(spy, { offset: 3.266666666666666, size: 26 });
    });

    it("should select bandSize", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarBarBandSize(state, 0, 0, radialBarSettings),
      );
      expectLastCalledWith(spy, 32.666666666666664);
    });

    it("should select bar size list", () => {
      const { spy } = renderTestCase((state) => selectPolarBarSizeList(state, 0, 0));
      expectLastCalledWith(spy, [
        {
          barSize: undefined,
          dataKeys: ["pv"],
          stackId: undefined,
        },
      ]);
    });

    it("should select barGap", () => {
      const { spy } = renderTestCase(selectBarGap);
      expectLastCalledWith(spy, 4);
    });

    it("should select barCategoryGap", () => {
      const { spy } = renderTestCase(selectBarCategoryGap);
      expectLastCalledWith(spy, "10%");
    });

    it("should select radial bar sectors", () => {
      const { spy } = renderTestCase((state) =>
        selectRadialBarSectors(state, 0, 0, radialBarSettings, undefined),
      );
      expectLastCalledWith(spy, [
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 3.266666666666666,
            outerRadius: 29.266666666666666,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 88.16326530612244,
          innerRadius: 3.266666666666666,
          name: "Page A",
          outerRadius: 29.266666666666666,
          payload: { amt: 2400, name: "Page A", pv: 2400, uv: 400 },
          pv: 2400,
          startAngle: 0,
          uv: 400,
          value: 2400,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 35.93333333333333,
            outerRadius: 61.93333333333333,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 167.76734693877552,
          innerRadius: 35.93333333333333,
          name: "Page B",
          outerRadius: 61.93333333333333,
          payload: { amt: 2400, name: "Page B", pv: 4567, uv: 300 },
          pv: 4567,
          startAngle: 0,
          uv: 300,
          value: 4567,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 68.6,
            outerRadius: 94.6,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 51.35510204081632,
          innerRadius: 68.6,
          name: "Page C",
          outerRadius: 94.6,
          payload: { amt: 2400, name: "Page C", pv: 1398, uv: 300 },
          pv: 1398,
          startAngle: 0,
          uv: 300,
          value: 1398,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 101.26666666666667,
            outerRadius: 127.26666666666667,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 360,
          innerRadius: 101.26666666666667,
          name: "Page D",
          outerRadius: 127.26666666666667,
          payload: { amt: 2400, name: "Page D", pv: 9800, uv: 200 },
          pv: 9800,
          startAngle: 0,
          uv: 200,
          value: 9800,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 133.93333333333334,
            outerRadius: 159.93333333333334,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 143.5591836734694,
          innerRadius: 133.93333333333334,
          name: "Page E",
          outerRadius: 159.93333333333334,
          payload: { amt: 2400, name: "Page E", pv: 3908, uv: 278 },
          pv: 3908,
          startAngle: 0,
          uv: 278,
          value: 3908,
        },
        {
          amt: 2400,
          background: {
            cx: 250,
            cy: 250,
            endAngle: 360,
            innerRadius: 166.6,
            outerRadius: 192.6,
            startAngle: 0,
          },
          clockWise: false,
          cx: 250,
          cy: 250,
          endAngle: 176.32653061224488,
          innerRadius: 166.6,
          name: "Page F",
          outerRadius: 192.6,
          payload: { amt: 2400, name: "Page F", pv: 4800, uv: 189 },
          pv: 4800,
          startAngle: 0,
          uv: 189,
          value: 4800,
        },
      ]);
    });

    it("should render sectors", () => {
      const { container } = renderTestCase();
      expectRadialBars(container, [
        {
          d: "M 279.2667,250 A 29.2667,29.2667,0, 0,0, 250.938,220.7484 L 250.1047,246.735 A 3.2667,3.2667,0, 0,1, 253.2667,250 Z",
        },
        {
          d: "M 311.9333,250 A 61.9333,61.9333,0, 0,0, 189.4728,236.8775 L 214.8825,242.3864 A 35.9333,35.9333,0, 0,1, 285.9333,250 Z",
        },
        {
          d: "M 344.6,250 A 94.6,94.6,0, 0,0, 309.0769,176.1144 L 292.8401,196.4212 A 68.6,68.6,0, 0,1, 318.6,250 Z",
        },
        {
          d: "M 377.2667,250 A 127.2667,127.2667,0, 1,0, 377.2667,250.0022 L 351.2667,250.0018 A 101.2667,101.2667,0, 1,1, 351.2667,250 Z",
        },
        {
          d: "M 409.9333,250 A 159.9333,159.9333,0, 0,0, 121.3383,155.0009 L 142.2545,170.4447 A 133.9333,133.9333,0, 0,1, 383.9333,250 Z",
        },
        {
          d: "M 442.6,250 A 192.6,192.6,0, 0,0, 57.7957,237.6601 L 83.7423,239.3259 A 166.6,166.6,0, 0,1, 416.6,250 Z",
        },
      ]);
    });
  });

  describe("RingsWithTypes", () => {
    const radialBarSettings: RadialBarSettings = {
      id: "my-radial-bar",
      dataKey: "rings",
      minPointSize: 0,
      stackId: undefined,
      maxBarSize: undefined,
      barSize: undefined,
      type: "radialBar",
      angleAxisId: "",
      radiusAxisId: "",
      data: [],
      hide: false,
    };

    const renderTestCase = createSelectorTestCase((props) => (
      <RadialBarChart width={500} height={500} data={ringsData}>
        <RadialBar isAnimationActive={false} dataKey="rings" />
        <PolarGrid gridType="circle" />
        <PolarAngleAxis type="number" />
        <PolarRadiusAxis type="category" stroke="black" />
        {props.children}
      </RadialBarChart>
    ));

    it("should select polar items", () => {
      const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
      expectLastCalledWith(spy, [
        {
          id: expect.stringMatching("recharts-radial-bar-"),
          angleAxisId: 0,
          barSize: undefined,
          data: undefined,
          dataKey: "rings",
          hide: false,
          radiusAxisId: 0,
          stackId: undefined,
          type: "radialBar",
          maxBarSize: undefined,
          minPointSize: 0,
        },
      ]);
    });

    it("should select angle axis settings", () => {
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
        type: "number",
        unit: undefined,
      });
    });

    it("should select angle axis realScaleType", () => {
      const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
      expectLastCalledWith(spy, "linear");
    });

    it("should select angle axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 9],
        range: [0, 360],
      });
    });

    it("should select radius axis settings", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
      expectLastCalledWith(spy, {
        allowDataOverflow: false,
        allowDecimals: false,
        allowDuplicatedCategory: true,
        dataKey: undefined,
        domain: undefined,
        id: 0,
        includeHidden: false,
        name: undefined,
        reversed: false,
        niceTicks: "auto",
        scale: "auto",
        tick: true,
        tickCount: 5,
        ticks: undefined,
        type: "category",
        unit: undefined,
      });
    });

    it("should select radius axis realScaleType", () => {
      const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
      expectLastCalledWith(spy, "band");
    });

    it("should select radius axis scale", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
      expectLastCalledWithScale(spy, {
        domain: [0, 1, 2, 3],
        range: [0, 196],
        bandwidth: 49,
      });
    });

    it("should select radius axis ticks for axis", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarAxisTicks(state, "radiusAxis", 0, false),
      );
      expectLastCalledWith(spy, [
        { coordinate: 24.5, index: 0, offset: 24.5, value: 0 },
        { coordinate: 73.5, index: 1, offset: 24.5, value: 1 },
        { coordinate: 122.5, index: 2, offset: 24.5, value: 2 },
        { coordinate: 171.5, index: 3, offset: 24.5, value: 3 },
      ]);
    });

    it("should select radius axis ticks for graphical item", () => {
      const { spy } = renderTestCase((state) =>
        selectPolarGraphicalItemAxisTicks(state, "radiusAxis", 0, false),
      );
      expectLastCalledWith(spy, [
        { coordinate: 0, value: 0, index: 0, offset: 0 },
        { coordinate: 49, value: 1, index: 1, offset: 0 },
        { coordinate: 98, value: 2, index: 2, offset: 0 },
        { coordinate: 147, value: 3, index: 3, offset: 0 },
      ]);
    });

    it("should select radial bar sectors", () => {
      const { spy } = renderTestCase((state) =>
        selectRadialBarSectors(state, 0, 0, radialBarSettings, undefined),
      );
      expectLastCalledWith(spy, [
        {
          name: "Elves",
          rings: 3,
          fill: "green",
          background: {
            cx: 250,
            cy: 250,
            innerRadius: 4.9,
            outerRadius: 43.9,
            startAngle: 0,
            endAngle: 360,
          },
          clockWise: false,
          payload: { name: "Elves", rings: 3, fill: "green" },
          value: 3,
          cx: 250,
          cy: 250,
          innerRadius: 4.9,
          outerRadius: 43.9,
          startAngle: 0,
          endAngle: 120,
        },
        {
          name: "Dwarves",
          rings: 7,
          fill: "blue",
          background: {
            cx: 250,
            cy: 250,
            innerRadius: 53.9,
            outerRadius: 92.9,
            startAngle: 0,
            endAngle: 360,
          },
          clockWise: false,
          payload: { name: "Dwarves", rings: 7, fill: "blue" },
          value: 7,
          cx: 250,
          cy: 250,
          innerRadius: 53.9,
          outerRadius: 92.9,
          startAngle: 0,
          endAngle: 280,
        },
        {
          name: "Humans",
          rings: 9,
          fill: "red",
          background: {
            cx: 250,
            cy: 250,
            innerRadius: 102.9,
            outerRadius: 141.9,
            startAngle: 0,
            endAngle: 360,
          },
          clockWise: false,
          payload: { name: "Humans", rings: 9, fill: "red" },
          value: 9,
          cx: 250,
          cy: 250,
          innerRadius: 102.9,
          outerRadius: 141.9,
          startAngle: 0,
          endAngle: 360,
        },
        {
          name: "Sauron",
          rings: 1,
          fill: "black",
          background: {
            cx: 250,
            cy: 250,
            innerRadius: 151.9,
            outerRadius: 190.9,
            startAngle: 0,
            endAngle: 360,
          },
          clockWise: false,
          payload: { name: "Sauron", rings: 1, fill: "black" },
          value: 1,
          cx: 250,
          cy: 250,
          innerRadius: 151.9,
          outerRadius: 190.9,
          startAngle: 0,
          endAngle: 40,
        },
      ]);
    });

    it("should render sectors", () => {
      const { container } = renderTestCase();
      expectRadialBars(container, [
        {
          d: "M 293.9,250 A 43.9,43.9,0, 0,0, 228.05,211.9815 L 247.55,245.7565 A 4.9,4.9,0, 0,1, 254.9,250 Z",
        },
        {
          d: "M 342.9,250 A 92.9,92.9,0, 1,0, 266.1319,341.4886 L 259.3596,303.0811 A 53.9,53.9,0, 1,1, 303.9,250 Z",
        },
        {
          d: "M 391.9,250 A 141.9,141.9,0, 1,0, 391.9,250.0025 L 352.9,250.0018 A 102.9,102.9,0, 1,1, 352.9,250 Z",
        },
        {
          d: "M 440.9,250 A 190.9,190.9,0, 0,0, 396.2379,127.2918 L 366.3622,152.3606 A 151.9,151.9,0, 0,1, 401.9,250 Z",
        },
      ]);
    });
  });

  it("Don't render any sector when data is empty", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={[]}>
        <RadialBar dataKey="uv" />
      </RadialBarChart>
    ));
    flush();

    expectRadialBars(container, []);
  });

  it("Should render RadialBar in a custom component", () => {
    const CustomRadialBar = (props: { dataKey: string }) => {
      return <RadialBar dataKey={props.dataKey} />;
    };

    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={[]}>
        <CustomRadialBar dataKey="uv" />
      </RadialBarChart>
    ));
    flush();

    expectRadialBars(container, []);
  });

  // Not in the recharts reference spec: covers the `strokeWidth` prop the
  // reference forwards to every sector via its svg-props spread
  // (RadialBarSectors baseProps).
  it("forwards the component-level strokeWidth to every sector path", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar isAnimationActive={false} dataKey="uv" stroke="#111" strokeWidth={4} />
      </RadialBarChart>
    ));
    flush();

    const sectors = container.querySelectorAll(
      ".recharts-radial-bar-sectors path.recharts-radial-bar-sector",
    );
    expect(sectors).toHaveLength(PageData.length);
    sectors.forEach((sector) => {
      expect(sector.getAttribute("stroke-width")).toBe("4");
      expect(sector.getAttribute("stroke")).toBe("#111");
    });
  });

  it("calls mouse handler events", () => {
    const onMouseEnter: Mock<(data: RadialBarDataItem, index: number, e: MouseEvent) => void> =
      vi.fn();
    const onMouseLeave: Mock<(data: RadialBarDataItem, index: number, e: MouseEvent) => void> =
      vi.fn();
    const onClick: Mock<(data: RadialBarDataItem, index: number, e: MouseEvent) => void> = vi.fn();

    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        />
      </RadialBarChart>
    ));
    flush();

    // Handlers sit on the sector path itself (matching recharts), so fire on
    // `.recharts-sector` — the same element the reference targets.
    const sector = container.querySelectorAll(".recharts-sector")[0];
    assertNotNull(sector);

    const expectedData = {
      name: "Page A",
      uv: 400,
      pv: 2400,
      amt: 2400,
      background: {
        cx: 250,
        cy: 250,
        innerRadius: 3.266666666666666,
        outerRadius: 29.266666666666666,
        startAngle: 0,
        endAngle: 360,
      },
      clockWise: false,
      payload: {
        name: "Page A",
        uv: 400,
        pv: 2400,
        amt: 2400,
      },
      value: 2400,
      cx: 250,
      cy: 250,
      innerRadius: 3.266666666666666,
      outerRadius: 29.266666666666666,
      startAngle: 0,
      endAngle: 360,
    };

    fireEvent.mouseEnter(sector);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectLastCalledWith(onMouseEnter, expectedData, 0, expect.any(Object));

    fireEvent.mouseLeave(sector);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expectLastCalledWith(onMouseLeave, expectedData, 0, expect.any(Object));

    fireEvent.click(sector);
    expect(onClick).toHaveBeenCalledTimes(1);
    expectLastCalledWith(onClick, expectedData, 0, expect.any(Object));
  });

  it("calls the remaining pointer handler events", () => {
    const onMouseDown = vi.fn();
    const onMouseUp = vi.fn();
    const onMouseMove = vi.fn();
    const onMouseOver = vi.fn();
    const onMouseOut = vi.fn();
    const onTouchStart = vi.fn();

    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onMouseOver={onMouseOver}
          onMouseOut={onMouseOut}
          onTouchStart={onTouchStart}
        />
      </RadialBarChart>
    ));
    flush();

    const sector = container.querySelectorAll(".recharts-sector")[0];
    assertNotNull(sector);

    fireEvent.mouseDown(sector);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expectLastCalledWith(onMouseDown, expect.any(Object), 0, expect.any(Object));

    fireEvent.mouseUp(sector);
    expect(onMouseUp).toHaveBeenCalledTimes(1);

    fireEvent.mouseMove(sector);
    expect(onMouseMove).toHaveBeenCalledTimes(1);

    fireEvent.mouseOver(sector);
    expect(onMouseOver).toHaveBeenCalledTimes(1);

    fireEvent.mouseOut(sector);
    expect(onMouseOut).toHaveBeenCalledTimes(1);

    fireEvent.touchStart(sector);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });

  it("calls touch handler events", () => {
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();

    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </RadialBarChart>
    ));
    flush();

    const sector = container.querySelectorAll(".recharts-sector")[0];
    assertNotNull(sector);

    fireEvent.touchMove(sector, { touches: [{ clientX: 200, clientY: 200 }] });
    expect(onTouchMove).toHaveBeenCalledTimes(1);
    expectLastCalledWith(
      onTouchMove,
      {
        name: "Page A",
        uv: 400,
        pv: 2400,
        amt: 2400,
        background: {
          cx: 250,
          cy: 250,
          innerRadius: 3.266666666666666,
          outerRadius: 29.266666666666666,
          startAngle: 0,
          endAngle: 360,
        },
        clockWise: false,
        payload: {
          name: "Page A",
          uv: 400,
          pv: 2400,
          amt: 2400,
        },
        value: 2400,
        cx: 250,
        cy: 250,
        innerRadius: 3.266666666666666,
        outerRadius: 29.266666666666666,
        startAngle: 0,
        endAngle: 360,
      },
      0,
      expect.any(Object),
    );
  });

  it("renders the activeShape for the active sector", () => {
    // RadialBarChart is an AXIS-tooltip chart (defaultTooltipEventType="axis", like
    // recharts), so activeShape activates from the active AXIS index — set here via
    // Tooltip defaultIndex (or, in a browser, the polar axis pointer). Per-sector
    // item mouseEnter correctly does NOT drive an axis-tooltip chart's activeShape.
    const withActive = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          activeShape={(p) => <path class="custom-active-radial" d={`M${p.cx},${p.cy}`} />}
        />
        <Tooltip defaultIndex={0} />
      </RadialBarChart>
    ));
    flush();
    expect(withActive.container.querySelector(".custom-active-radial")).not.toBeNull();

    // Without an active index, the regular shape is used (no activeShape).
    const noActive = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          activeShape={(p) => <path class="custom-active-radial" d={`M${p.cx},${p.cy}`} />}
        />
      </RadialBarChart>
    ));
    flush();
    expect(noActive.container.querySelector(".custom-active-radial")).toBeNull();
  });

  // Object-form activeShape (recharts RadialBarChart.spec "activeShape set to be an
  // object"). The reference drives the active sector by pointer hover + asserts the
  // `.recharts-active-shape` WRAPPER class; that wrapper mechanism is covered
  // elsewhere and pointer hover needs a real getBoundingClientRect (0 in jsdom), so
  // here we drive the active index via Tooltip `defaultIndex` (RadialBarChart is an
  // axis-tooltip chart) and assert the OBJECT props merged onto the active sector's
  // shape (fill:"red") — wrapper-independent.
  it("merges object-form activeShape props onto the active sector", () => {
    const withActive = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar isAnimationActive={false} dataKey="amt" activeShape={{ fill: "red" }} />
        <Tooltip defaultIndex={0} />
      </RadialBarChart>
    ));
    flush();
    // Exactly the active sector (index 0) picks up the merged fill.
    expect(
      withActive.container.querySelectorAll('.recharts-radial-bar-sector[fill="red"]'),
    ).toHaveLength(1);

    // Without an active index no sector uses the activeShape fill.
    const noActive = render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar isAnimationActive={false} dataKey="amt" activeShape={{ fill: "red" }} />
      </RadialBarChart>
    ));
    flush();
    expect(
      noActive.container.querySelectorAll('.recharts-radial-bar-sector[fill="red"]'),
    ).toHaveLength(0);
  });

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it when removed from DOM", () => {
      const [showBar, setShowBar] = createSignal(true);
      const polarItemsSpy = vi.fn();
      const Comp = (): null => {
        const selected = useAppSelector((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        createEffect(
          () => selected(),
          (value) => polarItemsSpy(value),
        );
        return null;
      };
      render(() => (
        <RadialBarChart width={100} height={100} data={PageData}>
          <Show when={showBar()}>
            <RadialBar dataKey="value" />
          </Show>
          <Comp />
        </RadialBarChart>
      ));
      flush();
      flush();
      flush();

      const expectedPolarItemsSettings: RadialBarSettings = {
        id: expect.stringMatching("recharts-radial-bar-"),
        barSize: undefined,
        stackId: undefined,
        type: "radialBar",
        angleAxisId: 0,
        data: undefined,
        dataKey: "value",
        hide: false,
        radiusAxisId: 0,
        minPointSize: 0,
        maxBarSize: undefined,
      };
      expect(polarItemsSpy).toHaveBeenLastCalledWith([expectedPolarItemsSettings]);

      setShowBar(false);
      flush();
      flush();
      flush();

      expect(polarItemsSpy).toHaveBeenLastCalledWith([]);
    });
  });
});

describe("RadialBar background zIndex", () => {
  const dataWithBackground = [
    { name: "A", uv: 400, pv: 2400, fill: "#8884d8" },
    { name: "B", uv: 300, pv: 4567, fill: "#83a6ed" },
  ];

  it("should render background with default zIndex when background prop is true", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar background isAnimationActive={false} dataKey="pv" />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ front: radialBarSectors[0], back: backgroundSectors[0] });
  });

  it("should render background with default zIndex when background prop is an object without zIndex", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar background={{ fill: "#eee" }} isAnimationActive={false} dataKey="pv" />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ front: radialBarSectors[0], back: backgroundSectors[0] });
  });

  it("should render background with custom zIndex when background prop includes zIndex", () => {
    const customZIndex = DefaultZIndexes.bar + 1;
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar
          background={{ fill: "#eee", zIndex: customZIndex }}
          isAnimationActive={false}
          dataKey="pv"
        />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ back: radialBarSectors[0], front: backgroundSectors[0] });
  });

  it("should handle background with zIndex as 0", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar
          background={{ fill: "#eee", zIndex: 0 }}
          isAnimationActive={false}
          dataKey="pv"
        />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ front: radialBarSectors[0], back: backgroundSectors[0] });
  });

  it("should handle negative zIndex values in background prop", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar
          background={{ fill: "#eee", zIndex: -150 }}
          isAnimationActive={false}
          dataKey="pv"
        />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ front: radialBarSectors[0], back: backgroundSectors[0] });
  });

  it("should ignore non-number zIndex values and use default", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar
          // @ts-expect-error testing runtime behavior with an invalid (string) zIndex
          background={{ fill: "#eee", zIndex: "1200" }}
          isAnimationActive={false}
          dataKey="pv"
        />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
    const radialBarSectors = container.querySelectorAll(".recharts-radial-bar-sector");
    assertNotNull(radialBarSectors[0]);
    assertNotNull(backgroundSectors[0]);
    assertZIndexLayerOrder({ front: radialBarSectors[0], back: backgroundSectors[0] });
  });

  it("should handle background prop when it is undefined", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar background={undefined} isAnimationActive={false} dataKey="pv" />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(0);
  });

  it("should handle background prop when it is false", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        <RadialBar background={false} isAnimationActive={false} dataKey="pv" />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(0);
  });

  it.each([null, false, undefined] as const)(
    "should not render any background when background=%s",
    (background) => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={dataWithBackground}>
          {/* @ts-expect-error testing runtime behavior */}
          <RadialBar background={background} isAnimationActive={false} dataKey="pv" />
        </RadialBarChart>
      ));
      flush();

      const backgroundSectors = container.querySelectorAll(
        ".recharts-radial-bar-background-sector",
      );
      expect(backgroundSectors).toHaveLength(0);
    },
  );

  it("should render backgrounds with non-object values - typescript says it will not but it does!", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={dataWithBackground}>
        {/* @ts-expect-error testing runtime behavior */}
        <RadialBar background="invalid" isAnimationActive={false} dataKey="pv" />
      </RadialBarChart>
    ));
    flush();

    const backgroundSectors = container.querySelectorAll(".recharts-radial-bar-background-sector");
    expect(backgroundSectors).toHaveLength(dataWithBackground.length);
  });
});
