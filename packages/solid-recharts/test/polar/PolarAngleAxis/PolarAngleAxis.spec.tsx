import { describe, expect, it, vi } from "vitest";
import {
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
} from "../../../src";
import { exampleRadarData, PageData, pageDataWithFillColor } from "../../_data";
import { assertNotNull } from "../../helper/assertNotNull";
import {
  selectAngleAxis,
  selectAngleAxisRangeWithReversed,
  selectPolarOptions,
} from "../../../src/state/selectors/polarAxisSelectors";
import { selectNiceTicks, selectRealScaleType } from "../../../src/state/selectors/axisSelectors";
import {
  selectPolarAxisScale,
  selectPolarAxisTicks,
} from "../../../src/state/selectors/polarScaleSelectors";
import {
  selectPolarAppliedValues,
  selectPolarAxisDomain,
  selectPolarItemsSettings,
  selectPolarNiceTicks,
} from "../../../src/state/selectors/polarSelectors";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

/*
 * Ported from recharts 3.8.1 test/polar/PolarAngleAxis/PolarAngleAxis.spec.tsx.
 * Wrappers read `props.children` (not destructured) so the Spy mounts inside the
 * chart store. Ported incrementally by describe block.
 */

type ExpectedAngleAxisTick = {
  x1: string | null;
  x2: string | null;
  y1: string | null;
  y2: string | null;
};

function expectAngleAxisTicks(
  container: Element,
  expectedTicks: ReadonlyArray<ExpectedAngleAxisTick>,
): void {
  assertNotNull(container);
  const allTicks = container.querySelectorAll(".recharts-polar-angle-axis-tick-line");
  const actualTicks = Array.from(allTicks).map((tick) => ({
    x1: tick.getAttribute("x1"),
    x2: tick.getAttribute("x2"),
    y1: tick.getAttribute("y1"),
    y2: tick.getAttribute("y2"),
  }));
  expect(actualTicks).toEqual(expectedTicks);
}

type ExpectedAxisTickLabel = {
  textContext: string | null;
  x: string | null;
  y: string | null;
};

function expectAngleAxisTickLabels(
  container: Element,
  expectedLabels: ReadonlyArray<ExpectedAxisTickLabel>,
): void {
  assertNotNull(container);
  const allTickLabels = container.querySelectorAll(
    ".recharts-text.recharts-polar-angle-axis-tick-value",
  );
  const actualLabels = Array.from(allTickLabels).map((label) => ({
    textContext: label.textContent,
    x: label.getAttribute("x"),
    y: label.getAttribute("y"),
  }));
  expect(actualLabels).toEqual(expectedLabels);
}

describe("<PolarAngleAxis />", () => {
  describe("in RadarChart", () => {
    describe("when axis has a dataKey", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          <PolarAngleAxis dataKey="value" />
          {props.children}
        </RadarChart>
      ));

      it("should select angle axis settings", () => {
        const { spy } = renderTestCase((state) => selectAngleAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: false,
          dataKey: "value",
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

      it("should select polar items", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching("radar-"),
            type: "radar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "value",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select angle axis domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [420, 460, 999, 500, 864, 650, 765, 365]);
      });

      it("should select angle axis range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [90, -270]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, {
          domain: [420, 460, 999, 500, 864, 650, 765, 365],
          range: [-270, 90],
        });
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", 0, false),
        );
        expectLastCalledWith(spy, [
          { coordinate: 90, index: 0, offset: 45, value: 420 },
          { coordinate: 45, index: 1, offset: 45, value: 460 },
          { coordinate: 0, index: 2, offset: 45, value: 999 },
          { coordinate: -45, index: 3, offset: 45, value: 500 },
          { coordinate: -90, index: 4, offset: 45, value: 864 },
          { coordinate: -135, index: 5, offset: 45, value: 650 },
          { coordinate: -180, index: 6, offset: 45, value: 765 },
          { coordinate: -225, index: 7, offset: 45, value: 365 },
        ]);
      });

      it("should select nice ticks", () => {
        const { spy } = renderTestCase((state) => selectNiceTicks(state, "angleAxis", 0, false));
        expectLastCalledWith(spy, undefined);
      });

      it("should select applied data", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 420 },
          { value: 460 },
          { value: 999 },
          { value: 500 },
          { value: 864 },
          { value: 650 },
          { value: 765 },
          { value: 365 },
        ]);
      });

      it("should render axis ticks", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTicks(container, [
          { x1: "250", x2: "250", y1: "54", y2: "46" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "250", x2: "250", y1: "446", y2: "454" },
          {
            x1: "111.4070708874367",
            x2: "105.7502166379443",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "54", x2: "46", y1: "250.00000000000003", y2: "250.00000000000003" },
          {
            x1: "111.40707088743665",
            x2: "105.75021663794428",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
        ]);
      });

      it("should render angle labels", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTickLabels(container, [
          { textContext: "420", x: "250", y: "46" },
          { textContext: "460", x: "394.2497833620557", y: "105.7502166379443" },
          { textContext: "999", x: "454", y: "250" },
          { textContext: "500", x: "394.2497833620557", y: "394.2497833620557" },
          { textContext: "864", x: "250", y: "454" },
          { textContext: "650", x: "105.7502166379443", y: "394.2497833620557" },
          { textContext: "765", x: "46", y: "250.00000000000003" },
          { textContext: "365", x: "105.75021663794428", y: "105.7502166379443" },
        ]);
      });
    });

    describe("with default axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          <PolarAngleAxis />
          {props.children}
        </RadarChart>
      ));

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
          type: "category",
          unit: undefined,
        });
      });

      it("should select polar items", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching("radar-"),
            type: "radar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "value",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select angle axis domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5, 6, 7]);
      });

      it("should select angle axis range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [90, -270]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5, 6, 7], range: [-270, 90] });
      });

      it("should select applied data", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 420 },
          { value: 460 },
          { value: 999 },
          { value: 500 },
          { value: 864 },
          { value: 650 },
          { value: 765 },
          { value: 365 },
        ]);
      });

      it("should render ticks", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTicks(container, [
          { x1: "250", x2: "250", y1: "54", y2: "46" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "250", x2: "250", y1: "446", y2: "454" },
          {
            x1: "111.4070708874367",
            x2: "105.7502166379443",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "54", x2: "46", y1: "250.00000000000003", y2: "250.00000000000003" },
          {
            x1: "111.40707088743665",
            x2: "105.75021663794428",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
        ]);
      });

      it("should render labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "250", y: "46" },
          { textContext: "1", x: "394.2497833620557", y: "105.7502166379443" },
          { textContext: "2", x: "454", y: "250" },
          { textContext: "3", x: "394.2497833620557", y: "394.2497833620557" },
          { textContext: "4", x: "250", y: "454" },
          { textContext: "5", x: "105.7502166379443", y: "394.2497833620557" },
          { textContext: "6", x: "46", y: "250.00000000000003" },
          { textContext: "7", x: "105.75021663794428", y: "105.7502166379443" },
        ]);
      });
    });

    describe("with implicit axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          {props.children}
        </RadarChart>
      ));

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
          type: "category",
          unit: undefined,
        });
      });

      it("should select polar items", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching("radar-"),
            type: "radar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "value",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select applied values", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 420 },
          { value: 460 },
          { value: 999 },
          { value: 500 },
          { value: 864 },
          { value: 650 },
          { value: 765 },
          { value: 365 },
        ]);
      });

      it("should select angle axis domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5, 6, 7]);
      });

      it("should select angle axis range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [90, -270]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5, 6, 7], range: [-270, 90] });
      });

      it("should not render ticks", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTicks(container, []);
      });

      it("should not render labels", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTickLabels(container, []);
      });
    });

    describe("with type=number", () => {
      const data = [
        { angle: 0, r: 11 },
        { angle: 90, r: 22 },
        { angle: 180, r: 33 },
        { angle: 270, r: 44 },
      ];

      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={360} height={360} data={data}>
          <PolarAngleAxis dataKey="angle" axisLineType="circle" type="number" domain={[0, 360]} />
          {/* recharts also passes a no-op `type="number"` to this Radar; omitted (not a Radar prop). */}
          <Radar name="r" dataKey="r" fillOpacity={0} stroke="#000" />
          {props.children}
        </RadarChart>
      ));

      it("should select axis settings", () => {
        const { spy } = renderTestCase((state) => selectAngleAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: false,
          dataKey: "angle",
          domain: [0, 360],
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

      it("should select polar items", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching("radar-"),
            type: "radar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "r",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select angle axis domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 360]);
      });

      it("should select angle axis range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [90, -270]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 360], range: [-270, 90] });
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", 0, false),
        );
        expectLastCalledWith(spy, [
          { coordinate: 90, index: 0, offset: 0, value: 0 },
          { coordinate: 0, index: 1, offset: 0, value: 90 },
          { coordinate: -90, index: 2, offset: 0, value: 180 },
          { coordinate: -180, index: 3, offset: 0, value: 270 },
        ]);
      });

      it("should select nice ticks", () => {
        const { spy } = renderTestCase((state) => selectNiceTicks(state, "angleAxis", 0, false));
        expectLastCalledWith(spy, undefined);
      });

      it("should select applied data", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [{ value: 0 }, { value: 90 }, { value: 180 }, { value: 270 }]);
      });

      it("should render axis ticks", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTicks(container, [
          { x1: "180", x2: "180", y1: "40", y2: "32" },
          { x1: "320", x2: "328", y1: "180", y2: "180" },
          { x1: "180", x2: "180", y1: "320", y2: "328" },
          { x1: "40", x2: "32", y1: "180.00000000000003", y2: "180.00000000000003" },
        ]);
      });

      it("should render angle labels", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "180", y: "32" },
          { textContext: "90", x: "328", y: "180" },
          { textContext: "180", x: "180", y: "328" },
          { textContext: "270", x: "32", y: "180.00000000000003" },
        ]);
      });
    });

    describe("renders regularly spaced ticks, even if the data is different", () => {
      const data = [
        { angle: 0, value: 5 },
        { angle: 45, value: 5 },
        { angle: 90, value: 5 },
        { angle: 125, value: 5 },
        { angle: 180, value: 5 },
        { angle: 225, value: 5 },
        { angle: 270, value: 5 },
        { angle: 315, value: 5 },
        { angle: 360, value: 5 },
      ];

      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={data}>
          <PolarAngleAxis dataKey="angle" type="number" domain={[0, 360]} tickCount={9} />
          <Radar dataKey="value" />
          {props.children}
        </RadarChart>
      ));

      it("should select axis settings with tickCount=9", () => {
        const { spy } = renderTestCase((state) => selectAngleAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: false,
          dataKey: "angle",
          domain: [0, 360],
          id: 0,
          includeHidden: false,
          name: undefined,
          reversed: false,
          niceTicks: "auto",
          scale: "auto",
          tick: true,
          tickCount: 9,
          ticks: undefined,
          type: "number",
          unit: undefined,
        });
      });

      it("should select nice ticks", () => {
        const { spy } = renderTestCase((state) => selectPolarNiceTicks(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 45, 90, 135, 180, 225, 270, 315, 360]);
      });

      it("should render regularly spaced ticks and labels", () => {
        const { container } = renderTestCase((): null => null);
        expectAngleAxisTicks(container, [
          { x1: "250", x2: "250", y1: "54", y2: "46" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "250", x2: "250", y1: "446", y2: "454" },
          {
            x1: "111.4070708874367",
            x2: "105.7502166379443",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "54", x2: "46", y1: "250.00000000000003", y2: "250.00000000000003" },
          {
            x1: "111.40707088743665",
            x2: "105.75021663794428",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
        ]);
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "250", y: "46" },
          { textContext: "45", x: "394.2497833620557", y: "105.7502166379443" },
          { textContext: "90", x: "454", y: "250" },
          { textContext: "135", x: "394.2497833620557", y: "394.2497833620557" },
          { textContext: "180", x: "250", y: "454" },
          { textContext: "225", x: "105.7502166379443", y: "394.2497833620557" },
          { textContext: "270", x: "46", y: "250.00000000000003" },
          { textContext: "315", x: "105.75021663794428", y: "105.7502166379443" },
        ]);
      });
    });

    describe("orientation, axisLine, reversed, and linear-scale niceTicks", () => {
      it("renders labels and ticks on the inside with orientation=inner", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadarChart width={500} height={500} data={exampleRadarData}>
            <Radar dataKey="value" />
            <PolarAngleAxis dataKey="value" orientation="inner" />
            {props.children}
          </RadarChart>
        ));
        const { container } = renderTestCase((): null => null);

        expectAngleAxisTicks(container, [
          { x1: "250", x2: "250", y1: "54", y2: "62" },
          {
            x1: "388.5929291125633",
            x2: "382.936074863071",
            y1: "111.4070708874367",
            y2: "117.06392513692907",
          },
          { x1: "446", x2: "438", y1: "250", y2: "250" },
          {
            x1: "388.5929291125633",
            x2: "382.936074863071",
            y1: "388.5929291125633",
            y2: "382.9360748630709",
          },
          { x1: "250", x2: "250", y1: "446", y2: "438" },
          {
            x1: "111.4070708874367",
            x2: "117.06392513692907",
            y1: "388.5929291125633",
            y2: "382.936074863071",
          },
          { x1: "54", x2: "62", y1: "250.00000000000003", y2: "250.00000000000003" },
          {
            x1: "111.40707088743665",
            x2: "117.06392513692904",
            y1: "111.4070708874367",
            y2: "117.06392513692907",
          },
        ]);
        expectAngleAxisTickLabels(container, [
          { textContext: "420", x: "250", y: "62" },
          { textContext: "460", x: "382.936074863071", y: "117.06392513692907" },
          { textContext: "999", x: "438", y: "250" },
          { textContext: "500", x: "382.936074863071", y: "382.9360748630709" },
          { textContext: "864", x: "250", y: "438" },
          { textContext: "650", x: "117.06392513692907", y: "382.936074863071" },
          { textContext: "765", x: "62", y: "250.00000000000003" },
          { textContext: "365", x: "117.06392513692904", y: "117.06392513692907" },
        ]);
      });

      it("does not render any line when axisLine=false", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadarChart width={500} height={500} data={exampleRadarData}>
            <Radar dataKey="value" />
            <PolarAngleAxis dataKey="value" axisLine={false} />
            {props.children}
          </RadarChart>
        ));
        const { container } = renderTestCase((): null => null);

        const axisLineElement = container.querySelector(".recharts-polar-angle-axis-line");
        expect(axisLineElement).toBeNull();
      });

      it.each([undefined, "polygon"] as const)(
        "renders polygon axisLine when axisLineType=%s",
        (axisLineType) => {
          const renderTestCase = createSelectorTestCase((props) => (
            <RadarChart width={500} height={500} data={exampleRadarData}>
              <Radar dataKey="value" />
              <PolarAngleAxis dataKey="value" axisLineType={axisLineType} />
              {props.children}
            </RadarChart>
          ));
          const { container } = renderTestCase((): null => null);

          const axisLineElement = container.querySelector(".recharts-polar-angle-axis-line");
          assertNotNull(axisLineElement);
          expect(axisLineElement.tagName).toBe("path");
          expect(axisLineElement.getAttribute("fill")).toBe("none");
          expect(axisLineElement.getAttribute("d")).toBe(
            "M250,54L388.5929,111.4071L446,250L388.5929,388.5929L250,446L111.4071,388.5929L54,250L111.4071,111.4071L250,54Z",
          );
        },
      );

      it("renders circle axisLine", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadarChart width={500} height={300} data={exampleRadarData}>
            <Radar dataKey="value" />
            <PolarAngleAxis dataKey="value" axisLineType="circle" />
            {props.children}
          </RadarChart>
        ));
        const { container } = renderTestCase((): null => null);

        const axisLineElement = container.querySelector(".recharts-polar-angle-axis-line");
        assertNotNull(axisLineElement);
        expect(axisLineElement.tagName).toBe("circle");
        expect(axisLineElement.getAttribute("fill")).toBe("none");
        expect(axisLineElement.getAttribute("cx")).toBe("250");
        expect(axisLineElement.getAttribute("cy")).toBe("150");
        expect(axisLineElement.getAttribute("r")).toBe("116");
      });

      it("renders labels in reverse if reversed=true", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadarChart width={500} height={500} data={exampleRadarData}>
            <Radar dataKey="value" />
            <PolarAngleAxis dataKey="value" reversed />
            {props.children}
          </RadarChart>
        ));
        const { container } = renderTestCase((): null => null);

        expectAngleAxisTickLabels(container, [
          { textContext: "420", x: "394.24978336205567", y: "105.75021663794428" },
          { textContext: "460", x: "249.99999999999997", y: "46" },
          { textContext: "999", x: "105.75021663794428", y: "105.7502166379443" },
          { textContext: "500", x: "46", y: "250.00000000000003" },
          { textContext: "864", x: "105.7502166379443", y: "394.2497833620557" },
          { textContext: "650", x: "250", y: "454" },
          { textContext: "765", x: "394.2497833620557", y: "394.2497833620557" },
          { textContext: "365", x: "454", y: "250" },
        ]);
      });

      it("linear scale should produce niceTicks=undefined too because that is what the generator does", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadarChart width={500} height={500} data={exampleRadarData}>
            <Radar dataKey="value" />
            <PolarAngleAxis dataKey="value" type="number" />
            {props.children}
          </RadarChart>
        ));
        const { container, spy } = renderTestCase((state) =>
          selectPolarNiceTicks(state, "angleAxis", 0),
        );

        expectAngleAxisTicks(container, [
          {
            x1: "343.9696838086067",
            x2: "347.8051811069172",
            y1: "422.0049375015452",
            y2: "429.02554719548584",
          },
          {
            x1: "298.1937708077547",
            x2: "300.1608634937854",
            y1: "439.9825267105625",
            y2: "447.73691555589164",
          },
          {
            x1: "249.99999999999997",
            x2: "249.99999999999997",
            y1: "54",
            y2: "46",
          },
          {
            x1: "249.3836324872836",
            x2: "249.3584746296217",
            y1: "445.9990308422194",
            y2: "453.998991284759",
          },
          {
            x1: "102.86822817046604",
            x2: "96.86284972844425",
            y1: "120.507754215544",
            y2: "115.22235642842335",
          },
          {
            x1: "90.9630154532783",
            x2: "84.47170996157536",
            y1: "364.5567001370317",
            y2: "369.2324838160942",
          },
          {
            x1: "54.96086149174786",
            x2: "47.00008032814574",
            y1: "230.6161291286071",
            y2: "229.8249507256931",
          },
          {
            x1: "396.72382587365814",
            x2: "402.7125534603381",
            y1: "379.95429550806097",
            y2: "385.2585524675737",
          },
        ]);
        expectAngleAxisTickLabels(container, [
          { textContext: "420", x: "347.8051811069172", y: "429.02554719548584" },
          { textContext: "460", x: "300.1608634937854", y: "447.73691555589164" },
          { textContext: "999", x: "249.99999999999997", y: "46" },
          { textContext: "500", x: "249.3584746296217", y: "453.998991284759" },
          { textContext: "864", x: "96.86284972844425", y: "115.22235642842335" },
          { textContext: "650", x: "84.47170996157536", y: "369.2324838160942" },
          { textContext: "765", x: "47.00008032814574", y: "229.8249507256931" },
          { textContext: "365", x: "402.7125534603381", y: "385.2585524675737" },
        ]);

        expectLastCalledWith(spy, undefined);
      });
    });
  });

  describe("in RadialBarChart", () => {
    describe("with default axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis />
          <PolarRadiusAxis />
          {props.children}
        </RadialBarChart>
      ));

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, [
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
          { x1: "250", x2: "250", y1: "54", y2: "46" },
          {
            x1: "111.4070708874367",
            x2: "105.7502166379443",
            y1: "111.40707088743667",
            y2: "105.7502166379443",
          },
          { x1: "54", x2: "46", y1: "249.99999999999997", y2: "249.99999999999997" },
          {
            x1: "111.40707088743665",
            x2: "105.75021663794428",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "249.99999999999997", x2: "249.99999999999997", y1: "446", y2: "454" },
          {
            x1: "388.5929291125633",
            x2: "394.24978336205567",
            y1: "388.59292911256335",
            y2: "394.2497833620557",
          },
        ]);
      });

      it("should render labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "454", y: "250" },
          { textContext: "50", x: "394.2497833620557", y: "105.7502166379443" },
          { textContext: "100", x: "250", y: "46" },
          { textContext: "150", x: "105.7502166379443", y: "105.7502166379443" },
          { textContext: "200", x: "46", y: "249.99999999999997" },
          { textContext: "250", x: "105.75021663794428", y: "394.2497833620557" },
          { textContext: "300", x: "249.99999999999997", y: "454" },
          { textContext: "350", x: "394.24978336205567", y: "394.2497833620557" },
        ]);
      });

      it("should select axis settings", () => {
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

      it("should select applied values", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 400 },
          { value: 300 },
          { value: 300 },
          { value: 200 },
          { value: 278 },
          { value: 189 },
        ]);
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 400]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 360]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 400], range: [0, 360] });
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select polarItemsSettings", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            // Deviation: recharts auto-ids RadialBar as `radialBar-N`; this port uses
            // the kebab `recharts-radial-bar-…` prefix (an internal id detail).
            id: expect.stringMatching(/recharts-radial-bar-/),
            maxBarSize: undefined,
            minPointSize: 0,
            barSize: undefined,
            stackId: undefined,
            type: "radialBar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "uv",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", 0, false),
        );
        expectLastCalledWith(spy, [
          { coordinate: 0, index: 0, offset: -0, value: 0 },
          { coordinate: 45, index: 1, offset: -0, value: 50 },
          { coordinate: 90, index: 2, offset: -0, value: 100 },
          { coordinate: 135, index: 3, offset: -0, value: 150 },
          { coordinate: 180, index: 4, offset: -0, value: 200 },
          { coordinate: 225, index: 5, offset: -0, value: 250 },
          { coordinate: 270, index: 6, offset: -0, value: 300 },
          { coordinate: 315, index: 7, offset: -0, value: 350 },
          { coordinate: 360, index: 8, offset: -0, value: 400 },
        ]);
      });
    });

    describe("with category axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis type="category" />
          <PolarRadiusAxis />
          {props.children}
        </RadialBarChart>
      ));

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, [
          {
            x1: "310.5673308974897",
            x2: "313.0394668524893",
            y1: "436.4070771938501",
            y2: "444.01552932421134",
          },
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "310.5673308974897",
            x2: "313.0394668524893",
            y1: "63.592922806149915",
            y2: "55.984470675788685",
          },
          {
            x1: "91.43266910251032",
            x2: "84.96053314751074",
            y1: "134.79409055067526",
            y2: "130.09180853233545",
          },
          {
            x1: "91.43266910251029",
            x2: "84.96053314751072",
            y1: "365.20590944932474",
            y2: "369.9081914676645",
          },
        ]);
      });

      it("should render labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, [
          { textContext: "400", x: "313.0394668524893", y: "444.01552932421134" },
          { textContext: "300", x: "454", y: "250" },
          { textContext: "200", x: "313.0394668524893", y: "55.984470675788685" },
          { textContext: "278", x: "84.96053314751074", y: "130.09180853233545" },
          { textContext: "189", x: "84.96053314751072", y: "369.9081914676645" },
        ]);
      });

      it("should select axis settings", () => {
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

      it("should select applied values", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 400 },
          { value: 300 },
          { value: 300 },
          { value: 200 },
          { value: 278 },
          { value: 189 },
        ]);
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [400, 300, 200, 278, 189]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 360]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [400, 300, 200, 278, 189], range: [0, 360] });
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select polarItemsSettings", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching(/recharts-radial-bar-/),
            maxBarSize: undefined,
            minPointSize: 0,
            barSize: undefined,
            stackId: undefined,
            type: "radialBar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "uv",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", 0, false),
        );
        expectLastCalledWith(spy, [
          { coordinate: -72, index: 0, offset: -72, value: 400 },
          { coordinate: 0, index: 1, offset: -72, value: 300 },
          { coordinate: 72, index: 2, offset: -72, value: 200 },
          { coordinate: 144, index: 3, offset: -72, value: 278 },
          { coordinate: 216, index: 4, offset: -72, value: 189 },
        ]);
      });
    });

    describe("with implicit axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          {props.children}
        </RadialBarChart>
      ));

      it("should not render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, []);
      });

      it("should not render axis labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, []);
      });

      it("should select axis settings", () => {
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

      it("should select applied values", () => {
        const { spy } = renderTestCase((state) => selectPolarAppliedValues(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          { value: 400 },
          { value: 300 },
          { value: 300 },
          { value: 200 },
          { value: 278 },
          { value: 189 },
        ]);
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 400]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 360]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 400], range: [0, 360] });
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select polarItemsSettings", () => {
        const { spy } = renderTestCase((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        expectLastCalledWith(spy, [
          {
            id: expect.stringMatching(/recharts-radial-bar-/),
            maxBarSize: undefined,
            minPointSize: 0,
            barSize: undefined,
            stackId: undefined,
            type: "radialBar",
            angleAxisId: 0,
            data: undefined,
            dataKey: "uv",
            hide: false,
            radiusAxisId: 0,
          },
        ]);
      });

      it("should select ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisTicks(state, "angleAxis", 0, false),
        );
        expectLastCalledWith(spy, [
          { index: 0, coordinate: 0, offset: -0, value: 0 },
          { index: 1, coordinate: 45, offset: -0, value: 50 },
          { index: 2, coordinate: 90, offset: -0, value: 100 },
          { index: 3, coordinate: 135, offset: -0, value: 150 },
          { index: 4, coordinate: 180, offset: -0, value: 200 },
          { index: 5, coordinate: 225, offset: -0, value: 250 },
          { index: 6, coordinate: 270, offset: -0, value: 300 },
          { index: 7, coordinate: 315, offset: -0, value: 350 },
          { index: 8, coordinate: 360, offset: -0, value: 400 },
        ]);
      });
    });

    describe("with reversed axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis reversed />
          <PolarRadiusAxis />
          {props.children}
        </RadialBarChart>
      ));

      it("should select axis settings", () => {
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
          reversed: true,
          niceTicks: "auto",
          scale: "auto",
          tick: true,
          tickCount: undefined,
          ticks: undefined,
          type: "number",
          unit: undefined,
        });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 400]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [360, 0]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 400], range: [0, 360] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, [
          { x1: "446", x2: "454", y1: "250.00000000000006", y2: "250.00000000000006" },
          {
            x1: "388.5929291125633",
            x2: "394.24978336205567",
            y1: "388.59292911256335",
            y2: "394.2497833620557",
          },
          { x1: "249.99999999999997", x2: "249.99999999999997", y1: "446", y2: "454" },
          {
            x1: "111.40707088743665",
            x2: "105.75021663794428",
            y1: "388.5929291125633",
            y2: "394.2497833620557",
          },
          { x1: "54", x2: "46", y1: "249.99999999999997", y2: "249.99999999999997" },
          {
            x1: "111.4070708874367",
            x2: "105.7502166379443",
            y1: "111.40707088743667",
            y2: "105.7502166379443",
          },
          { x1: "250", x2: "250", y1: "54", y2: "46" },
          {
            x1: "388.5929291125633",
            x2: "394.2497833620557",
            y1: "111.4070708874367",
            y2: "105.7502166379443",
          },
        ]);
      });

      it("should render labels reversed", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "454", y: "250.00000000000006" },
          { textContext: "50", x: "394.24978336205567", y: "394.2497833620557" },
          { textContext: "100", x: "249.99999999999997", y: "454" },
          { textContext: "150", x: "105.75021663794428", y: "394.2497833620557" },
          { textContext: "200", x: "46", y: "249.99999999999997" },
          { textContext: "250", x: "105.7502166379443", y: "105.7502166379443" },
          { textContext: "300", x: "250", y: "46" },
          { textContext: "350", x: "394.2497833620557", y: "105.7502166379443" },
        ]);
      });
    });

    describe("with custom angles", () => {
      const ringsData = [
        { name: "Elves", rings: 3, fill: "green" },
        { name: "Dwarves", rings: 7, fill: "blue" },
        { name: "Humans", rings: 9, fill: "red" },
        { name: "Sauron", rings: 1, fill: "black" },
      ];

      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={ringsData} startAngle={20} endAngle={220}>
          <RadialBar dataKey="rings" />
          <PolarAngleAxis type="number" />
          <PolarRadiusAxis />
          {props.children}
        </RadialBarChart>
      ));

      it("should select axis settings", () => {
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

      it("should select polar chart options", () => {
        const { spy } = renderTestCase(selectPolarOptions);
        expectLastCalledWith(spy, {
          startAngle: 20,
          endAngle: 220,
          cx: "50%",
          cy: "50%",
          innerRadius: 0,
          outerRadius: "80%",
        });
      });

      it("should select axis domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 9]);
      });

      it("should select axis range", () => {
        const { spy } = renderTestCase((state) => selectAngleAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [20, 220]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 9], range: [20, 220] });
      });

      it("should render ticks in the angled part only", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, [
          {
            x1: "434.179753674038",
            x2: "441.6972946403253",
            y1: "182.96405190816893",
            y2: "180.22789076156357",
          },
          {
            x1: "395.1466265693649",
            x2: "401.0709786742369",
            y1: "118.28645933111761",
            y2: "112.91039644667342",
          },
          {
            x1: "334.5516688735257",
            x2: "338.00275739897575",
            y1: "73.17518474291663",
            y2: "65.95784534466833",
          },
          {
            x1: "261.3963864664533",
            x2: "261.8615450977371",
            y1: "54.33160097883143",
            y2: "46.34513571266129",
          },
          {
            x1: "186.54814735656907",
            x2: "183.95827582010253",
            y1: "64.55496125235291",
            y2: "56.985775997346906",
          },
          {
            x1: "121.12581176046348",
            x2: "115.86564081191096",
            y1: "102.32656431977853",
            y2: "96.29907714915723",
          },
          {
            x1: "74.84800249661123",
            x2: "67.69894137402392",
            y1: "162.0353606807094",
            y2: "158.44496723910567",
          },
          {
            x1: "54.58938353111273",
            x2: "46.613440001770414",
            y1: "234.8114855483016",
            y2: "234.19154618292615",
          },
          {
            x1: "63.3594144736706",
            x2: "55.74143139096327",
            y1: "309.84389554824213",
            y2: "312.28650352980304",
          },
          {
            x1: "99.8552891486803",
            x2: "93.72693360372847",
            y1: "375.9863714985617",
            y2: "381.128672376054",
          },
        ]);
      });
    });

    describe("RadialBarWithColors with default axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={pageDataWithFillColor}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis />
          {props.children}
        </RadialBarChart>
      ));

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, [
          { x1: "446", x2: "454", y1: "250", y2: "250" },
          {
            x1: "430.5803711701581",
            x2: "437.9509985648584",
            y1: "173.79810010211077",
            y2: "170.6878184736255",
          },
          {
            x1: "386.74765767298027",
            x2: "392.32919472085706",
            y1: "109.58604727110134",
            y2: "103.85486552706465",
          },
          {
            x1: "321.39863678123476",
            x2: "324.3128668539382",
            y1: "67.46716825244476",
            y2: "60.01684858927925",
          },
          {
            x1: "244.8155293780266",
            x2: "244.60391833223176",
            y1: "54.06858020120944",
            y2: "46.071379393095526",
          },
          {
            x1: "169.04816292043114",
            x2: "165.74400630493852",
            y1: "71.49845918468117",
            y2: "64.2126820085457",
          },
          {
            x1: "106.01801361447642",
            x2: "100.14119784363871",
            y1: "117.01433311638843",
            y2: "111.58634671297571",
          },
          {
            x1: "65.64244378044125",
            x2: "58.11764556739806",
            y1: "183.4545909566089",
            y2: "180.73845181198072",
          },
          {
            x1: "54.274272812552084",
            x2: "46.285467621227696",
            y1: "260.36531316192213",
            y2: "260.7883871685312",
          },
          {
            x1: "73.70220455569708",
            x2: "66.50637617021533",
            y1: "335.645124329869",
            y2: "339.1408436902718",
          },
          {
            x1: "120.86938700568427",
            x2: "115.59874974061017",
            y1: "397.44926174013983",
            y2: "403.46759895402306",
          },
          {
            x1: "188.35438703671548",
            x2: "185.83823956882634",
            y1: "436.0532676476845",
            y2: "443.6472785720798",
          },
          {
            x1: "265.5389020767459",
            x2: "266.1731429778376",
            y1: "445.3830661092442",
            y2: "453.35788513411137",
          },
          {
            x1: "340.278477295892",
            x2: "343.9633131038876",
            y1: "423.97067723365086",
            y2: "431.0715212023713",
          },
          {
            x1: "400.81335240048736",
            x2: "406.96899943724196",
            y1: "375.1851937639847",
            y2: "380.2947935094535",
          },
          {
            x1: "437.6187793765148",
            x2: "445.2766887388216",
            y1: "306.7026774082729",
            y2: "309.0170724045289",
          },
        ]);
      });

      it("should render labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, [
          { textContext: "0", x: "454", y: "250" },
          { textContext: "2", x: "437.9509985648584", y: "170.6878184736255" },
          { textContext: "4", x: "392.32919472085706", y: "103.85486552706465" },
          { textContext: "6", x: "324.3128668539382", y: "60.01684858927925" },
          { textContext: "8", x: "244.60391833223176", y: "46.071379393095526" },
          { textContext: "10", x: "165.74400630493852", y: "64.2126820085457" },
          { textContext: "12", x: "100.14119784363871", y: "111.58634671297571" },
          { textContext: "14", x: "58.11764556739806", y: "180.73845181198072" },
          { textContext: "16", x: "46.285467621227696", y: "260.7883871685312" },
          { textContext: "18", x: "66.50637617021533", y: "339.1408436902718" },
          { textContext: "20", x: "115.59874974061017", y: "403.46759895402306" },
          { textContext: "22", x: "185.83823956882634", y: "443.6472785720798" },
          { textContext: "24", x: "266.1731429778376", y: "453.35788513411137" },
          { textContext: "26", x: "343.9633131038876", y: "431.0715212023713" },
          { textContext: "28", x: "406.96899943724196", y: "380.2947935094535" },
          { textContext: "30", x: "445.2766887388216", y: "309.0170724045289" },
        ]);
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 31.47]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 31.47], range: [0, 360] });
      });
    });

    describe("RadialBarWithColors with implicit axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={pageDataWithFillColor}>
          <RadialBar dataKey="pv" />
          {props.children}
        </RadialBarChart>
      ));

      it("should not render ticks", () => {
        const { container } = renderTestCase();
        expectAngleAxisTicks(container, []);
      });

      it("should not render labels", () => {
        const { container } = renderTestCase();
        expectAngleAxisTickLabels(container, []);
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "angleAxis", 0));
        expectLastCalledWith(spy, [0, 9800]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "angleAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 9800], range: [0, 360] });
      });
    });

    describe.each([
      { axisType: "number", expectedScale: "linear" },
      { axisType: "category", expectedScale: "band" },
      { axisType: undefined, expectedScale: "linear" },
    ] as const)("uses $expectedScale scale when type=$axisType", ({ axisType, expectedScale }) => {
      it("selects the expected real scale type", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <RadialBarChart width={500} height={500} data={PageData}>
            <RadialBar dataKey="uv" />
            <PolarAngleAxis dataKey="uv" type={axisType} />
            {props.children}
          </RadialBarChart>
        ));
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "angleAxis", 0));
        expectLastCalledWith(spy, expectedScale);
      });
    });
  });

  // state-integration "report settings + remove on unmount" omitted (needs React
  // rerender to unmount; Solid equivalent is a signal toggle).
  describe("state integration", () => {
    it("should select angle axis settings", () => {
      const exampleTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart
          cx={100}
          cy={150}
          outerRadius={150}
          width={600}
          height={500}
          data={exampleRadarData}
        >
          <Radar dataKey="value" angleAxisId="angle-id" />
          <PolarAngleAxis
            dataKey="value"
            allowDuplicatedCategory={false}
            angleAxisId="angle-id"
            id="html-id"
            name="angle-name"
            reversed
            scale="log"
            domain={[100, 200]}
            ticks={exampleTicks}
            tick={false}
            allowDecimals
            tickCount={19}
          />
          {props.children}
        </RadarChart>
      ));

      const settingsCase = renderTestCase((state) => selectAngleAxis(state, "angle-id"));
      expectLastCalledWith(settingsCase.spy, {
        allowDataOverflow: false,
        allowDecimals: true,
        allowDuplicatedCategory: false,
        dataKey: "value",
        domain: [100, 200],
        id: "angle-id",
        includeHidden: false,
        name: "angle-name",
        reversed: true,
        niceTicks: "auto",
        scale: "log",
        tick: false,
        tickCount: 19,
        ticks: exampleTicks,
        type: "category",
        unit: undefined,
      });

      const rangeCase = renderTestCase((state) =>
        selectAngleAxisRangeWithReversed(state, "angle-id"),
      );
      expectLastCalledWith(rangeCase.spy, [-270, 90]);

      const domainCase = renderTestCase((state) =>
        selectPolarAxisDomain(state, "angleAxis", "angle-id"),
      );
      expectLastCalledWith(domainCase.spy, [420, 460, 999, 500, 864, 650, 765, 365]);

      const scaleCase = renderTestCase((state) =>
        selectPolarAxisScale(state, "angleAxis", "angle-id"),
      );
      expectLastCalledWithScale(scaleCase.spy, {
        domain: [420, 460, 999, 500, 864, 650, 765, 365],
        range: [-270, 90],
      });

      const ticksCase = renderTestCase((state) =>
        selectPolarAxisTicks(state, "angleAxis", "angle-id", false),
      );
      expectLastCalledWith(ticksCase.spy, [
        { coordinate: -24172.926148617094, index: 0, offset: -0, value: 1 },
        { coordinate: -21429.954757673444, index: 1, offset: -0, value: 2 },
        { coordinate: -19825.41935342046, index: 2, offset: -0, value: 3 },
        { coordinate: -18686.983366729797, index: 3, offset: -0, value: 4 },
        { coordinate: -17803.943812512767, index: 4, offset: -0, value: 5 },
        { coordinate: -17082.44796247681, index: 5, offset: -0, value: 6 },
        { coordinate: -16472.431913188248, index: 6, offset: -0, value: 7 },
        { coordinate: -15944.011975786148, index: 7, offset: -0, value: 8 },
        { coordinate: -15477.912558223828, index: 8, offset: -0, value: 9 },
        { coordinate: -15060.972421569122, index: 9, offset: -0, value: 10 },
      ]);

      const niceTicksCase = renderTestCase((state) =>
        selectNiceTicks(state, "angleAxis", "angle-id", false),
      );
      expectLastCalledWith(niceTicksCase.spy, undefined);
    });
  });

  describe("with custom tick formatter and numerical values", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar dataKey="uv" />
        <PolarAngleAxis tickFormatter={(value) => `${String(value)}°`} />
        {props.children}
      </RadialBarChart>
    ));

    it("should render labels with custom formatter", () => {
      const { container } = renderTestCase();
      expectAngleAxisTickLabels(container, [
        { textContext: "0°", x: "454", y: "250" },
        { textContext: "50°", x: "394.2497833620557", y: "105.7502166379443" },
        { textContext: "100°", x: "250", y: "46" },
        { textContext: "150°", x: "105.7502166379443", y: "105.7502166379443" },
        { textContext: "200°", x: "46", y: "249.99999999999997" },
        { textContext: "250°", x: "105.75021663794428", y: "394.2497833620557" },
        { textContext: "300°", x: "249.99999999999997", y: "454" },
        { textContext: "350°", x: "394.24978336205567", y: "394.2497833620557" },
      ]);
    });

    it("should call the custom tick formatter with the tick value and index", () => {
      const formatter = vi.fn((value: unknown) => `${String(value)}°`);
      const renderFormatterCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarAngleAxis tickFormatter={formatter} />
          {props.children}
        </RadialBarChart>
      ));
      renderFormatterCase();
      expect(formatter).toHaveBeenCalledWith(0, 0);
      expect(formatter).toHaveBeenCalledWith(50, 1);
      expect(formatter).toHaveBeenCalledWith(100, 2);
      expect(formatter).toHaveBeenLastCalledWith(350, 7);
    });
  });

  describe("with custom tick formatter and category values", () => {
    // https://github.com/recharts/recharts/issues/6010
    const renderTestCase = createSelectorTestCase((props) => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" />
        <PolarAngleAxis dataKey="name" tickFormatter={(value) => `Formatted: ${String(value)}`} />
        {props.children}
      </RadarChart>
    ));

    it("should select ticks", () => {
      const { spy } = renderTestCase((state) => selectPolarAxisTicks(state, "angleAxis", 0, false));
      expectLastCalledWith(spy, [
        { coordinate: 90, index: 0, offset: 45, value: "iPhone 3GS" },
        { coordinate: 45, index: 1, offset: 45, value: "iPhone 4" },
        { coordinate: 0, index: 2, offset: 45, value: "iPhone 4s" },
        { coordinate: -45, index: 3, offset: 45, value: "iPhone 5" },
        { coordinate: -90, index: 4, offset: 45, value: "iPhone 5s" },
        { coordinate: -135, index: 5, offset: 45, value: "iPhone 6" },
        { coordinate: -180, index: 6, offset: 45, value: "iPhone 6s" },
        { coordinate: -225, index: 7, offset: 45, value: "iPhone 5se" },
      ]);
    });

    it("should render labels with custom formatter", () => {
      const { container } = renderTestCase();
      expectAngleAxisTickLabels(container, [
        { textContext: "Formatted: iPhone 3GS", x: "250", y: "46" },
        { textContext: "Formatted: iPhone 4", x: "394.2497833620557", y: "105.7502166379443" },
        { textContext: "Formatted: iPhone 4s", x: "454", y: "250" },
        { textContext: "Formatted: iPhone 5", x: "394.2497833620557", y: "394.2497833620557" },
        { textContext: "Formatted: iPhone 5s", x: "250", y: "454" },
        { textContext: "Formatted: iPhone 6", x: "105.7502166379443", y: "394.2497833620557" },
        { textContext: "Formatted: iPhone 6s", x: "46", y: "250.00000000000003" },
        { textContext: "Formatted: iPhone 5se", x: "105.75021663794428", y: "105.7502166379443" },
      ]);
    });
  });
});
