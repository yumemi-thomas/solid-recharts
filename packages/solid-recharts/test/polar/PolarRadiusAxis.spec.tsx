import { describe, expect, it, test } from "vitest";
import { exampleRadarData, PageData } from "../_data";
import { PolarRadiusAxis, Radar, RadarChart, RadialBar, RadialBarChart } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { render } from "../helper/render";
import {
  implicitRadiusAxis,
  selectRadiusAxis,
  selectRadiusAxisRangeWithReversed,
} from "../../src/state/selectors/polarAxisSelectors";
import { selectAxisDomain, selectRealScaleType } from "../../src/state/selectors/axisSelectors";
import {
  selectPolarAxisDomain,
  selectPolarAxisDomainIncludingNiceTicks,
} from "../../src/state/selectors/polarSelectors";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { selectPolarAxisScale } from "../../src/state/selectors/polarScaleSelectors";
import { expectLastCalledWithScale } from "../helper/expectScale";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

/*
 * Ported from recharts 3.8.1 test/polar/PolarRadiusAxis.spec.tsx.
 * Wrappers read `props.children` (not destructured) so the Spy mounts inside the
 * chart store. Ported incrementally by describe block.
 */

type ExpectedRadiusAxisTick = {
  x: string | null;
  y: string | null;
  transform: string | null;
  textContent: string | null;
};

function expectRadiusAxisTicks(
  container: Element,
  expectedTicks: ReadonlyArray<ExpectedRadiusAxisTick>,
): void {
  assertNotNull(container);
  const allTicks = container.querySelectorAll(".recharts-polar-radius-axis-tick-value");
  const actualTicks = Array.from(allTicks).map((tick) => ({
    x: tick.getAttribute("x"),
    y: tick.getAttribute("y"),
    transform: tick.getAttribute("transform"),
    textContent: tick.textContent,
  }));
  expect(actualTicks).toEqual(expectedTicks);
}

type ExpectedLabel = {
  x: string | null;
  y: string | null;
  textContent: string | null;
};

function expectRadiusAxisLabel(container: Element, expectedLabel: ExpectedLabel | null): void {
  assertNotNull(container);
  const allLabels = container.querySelectorAll(".recharts-label");
  const actualLabels = Array.from(allLabels).map((label) => ({
    x: label.getAttribute("x"),
    y: label.getAttribute("y"),
    textContent: label.textContent,
  }));
  if (expectedLabel == null) {
    expect(actualLabels).toEqual([]);
  } else {
    expect(actualLabels).toEqual([expectedLabel]);
  }
}

describe("<PolarRadiusAxis />", () => {
  describe("in RadarChart", () => {
    describe("with numerical dataKey", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <PolarRadiusAxis orientation="middle" cx={250} cy={250} label="test" dataKey="value" />
          {props.children}
        </RadarChart>
      ));

      it("should select angle settings", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: true,
          dataKey: "value",
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
          type: "number",
          unit: undefined,
        });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 999]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1000]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1000], range: [0, 196] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
          { textContent: "250", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
          { textContent: "500", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
          { textContent: "750", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
          { textContent: "1000", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
        ]);
        expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
      });

      it("should render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
      });
    });

    describe("with categorical dataKey", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <PolarRadiusAxis label="test" dataKey="name" type="category" />
          {props.children}
        </RadarChart>
      ));

      it("should select angle settings", () => {
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

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [
          "iPhone 3GS",
          "iPhone 4",
          "iPhone 4s",
          "iPhone 5",
          "iPhone 5s",
          "iPhone 6",
          "iPhone 6s",
          "iPhone 5se",
        ]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [
          "iPhone 3GS",
          "iPhone 4",
          "iPhone 4s",
          "iPhone 5",
          "iPhone 5s",
          "iPhone 6",
          "iPhone 6s",
          "iPhone 5se",
        ]);
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          {
            textContent: "iPhone 3GS",
            transform: "rotate(90, 262.25, 250)",
            x: "262.25",
            y: "250",
          },
          { textContent: "iPhone 4", transform: "rotate(90, 286.75, 250)", x: "286.75", y: "250" },
          { textContent: "iPhone 4s", transform: "rotate(90, 311.25, 250)", x: "311.25", y: "250" },
          { textContent: "iPhone 5", transform: "rotate(90, 335.75, 250)", x: "335.75", y: "250" },
          { textContent: "iPhone 5s", transform: "rotate(90, 360.25, 250)", x: "360.25", y: "250" },
          { textContent: "iPhone 6", transform: "rotate(90, 384.75, 250)", x: "384.75", y: "250" },
          { textContent: "iPhone 6s", transform: "rotate(90, 409.25, 250)", x: "409.25", y: "250" },
          {
            textContent: "iPhone 5se",
            transform: "rotate(90, 433.75, 250)",
            x: "433.75",
            y: "250",
          },
        ]);
      });

      it("should render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
      });
    });

    describe("with default axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <PolarRadiusAxis />
          <Radar dataKey="value" />
          {props.children}
        </RadarChart>
      ));

      it("should select axis settings", () => {
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
          type: "number",
          unit: undefined,
        });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 999]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1000]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1000], range: [0, 196] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
          { textContent: "250", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
          { textContent: "500", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
          { textContent: "750", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
          { textContent: "1000", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
        ]);
      });

      it("should not render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, null);
      });
    });

    describe("with implicit axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          {props.children}
        </RadarChart>
      ));

      it("should select angle settings", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
        expectLastCalledWith(spy, { ...implicitRadiusAxis, type: "number" });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 999]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1000]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1000], range: [0, 196] });
      });

      it("should not render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, []);
      });

      it("should not render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, null);
      });
    });

    // Omitted (documented deferrals in PolarRadiusAxis.tsx / Label.tsx): the custom
    // `tick` as function/element and `label` as function/element tests — this port
    // renders the default tick only and drops element/function Label content.

    test("Renders ticks when orientation=left", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          <PolarRadiusAxis orientation="left" cx={250} cy={250} label="test" />
        </RadarChart>
      ));
      expectRadiusAxisTicks(container, [
        { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
        { textContent: "250", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
        { textContent: "500", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
        { textContent: "750", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
        { textContent: "1000", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
      ]);
      expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
    });

    test("Don't Renders any ticks or label in when data is empty", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={[]}>
          <PolarRadiusAxis orientation="left" cx={250} cy={250} label="test" dataKey="value" />
        </RadarChart>
      ));
      expectRadiusAxisTicks(container, []);
      expectRadiusAxisLabel(container, null);
    });

    test("don't render any ticks or label when dataKey is empty", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <PolarRadiusAxis orientation="left" cx={250} cy={250} label="test" dataKey="" />
        </RadarChart>
      ));
      expectRadiusAxisTicks(container, []);
      expectRadiusAxisLabel(container, null);
    });

    test("Renders polar radius axis", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          <PolarRadiusAxis dataKey="value" label="test" />
        </RadarChart>
      ));
      expectRadiusAxisTicks(container, [
        { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
        { textContent: "250", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
        { textContent: "500", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
        { textContent: "750", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
        { textContent: "1000", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
      ]);
      expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
    });

    test("tickCount", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" />
          <PolarRadiusAxis dataKey="value" tickCount={3} />
        </RadarChart>
      ));
      expectRadiusAxisTicks(container, [
        { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
        { textContent: "500", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
        { textContent: "1000", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
      ]);
    });
  });

  describe("in RadialBarChart", () => {
    describe("with implicit axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="ov" />
          {props.children}
        </RadialBarChart>
      ));

      it("should select angle settings", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
        expectLastCalledWith(spy, { ...implicitRadiusAxis, type: "category" });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5], range: [0, 196] });
      });

      it("should not render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, []);
      });

      it("should not render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, null);
      });
    });

    describe("with default axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <PolarRadiusAxis />
          <RadialBar dataKey="ov" />
          {props.children}
        </RadialBarChart>
      ));

      it("should select angle settings", () => {
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

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5], range: [0, 196] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          {
            textContent: "0",
            transform: "rotate(90, 266.3333333333333, 250)",
            x: "266.3333333333333",
            y: "250",
          },
          { textContent: "1", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
          {
            textContent: "2",
            transform: "rotate(90, 331.66666666666663, 250)",
            x: "331.66666666666663",
            y: "250",
          },
          {
            textContent: "3",
            transform: "rotate(90, 364.3333333333333, 250)",
            x: "364.3333333333333",
            y: "250",
          },
          { textContent: "4", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
          {
            textContent: "5",
            transform: "rotate(90, 429.66666666666663, 250)",
            x: "429.66666666666663",
            y: "250",
          },
        ]);
      });

      it("should not render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, null);
      });
    });

    describe("with numerical axis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarRadiusAxis dataKey="uv" type="number" label="test" />
          {props.children}
        </RadialBarChart>
      ));

      it("should select angle settings", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: true,
          dataKey: "uv",
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
          type: "number",
          unit: undefined,
        });
      });

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 400]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "linear");
      });

      it("should select domain with nice ticks", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 400]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 400], range: [0, 196] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
          { textContent: "100", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
          { textContent: "200", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
          { textContent: "300", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
          { textContent: "400", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
        ]);
      });

      it("should render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
      });
    });

    describe("axis alone without RadialBar sibling", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <PolarRadiusAxis dataKey="uv" />
          {props.children}
        </RadialBarChart>
      ));

      it("should select angle settings", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxis(state, 0));
        expectLastCalledWith(spy, {
          allowDataOverflow: false,
          allowDecimals: false,
          allowDuplicatedCategory: true,
          dataKey: "uv",
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

      it("should select domain", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisDomain(state, "radiusAxis", 0));
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select real scale type", () => {
        const { spy } = renderTestCase((state) => selectRealScaleType(state, "radiusAxis", 0));
        expectLastCalledWith(spy, "band");
      });

      it("should select categorical domain", () => {
        const { spy } = renderTestCase((state) =>
          selectPolarAxisDomainIncludingNiceTicks(state, "radiusAxis", 0),
        );
        expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5]);
      });

      it("should select range", () => {
        const { spy } = renderTestCase((state) => selectRadiusAxisRangeWithReversed(state, 0));
        expectLastCalledWith(spy, [0, 196]);
      });

      it("should select scale", () => {
        const { spy } = renderTestCase((state) => selectPolarAxisScale(state, "radiusAxis", 0));
        expectLastCalledWithScale(spy, { domain: [0, 1, 2, 3, 4, 5], range: [0, 196] });
      });

      it("should render ticks", () => {
        const { container } = renderTestCase();
        expectRadiusAxisTicks(container, [
          {
            textContent: "400",
            transform: "rotate(90, 266.3333333333333, 250)",
            x: "266.3333333333333",
            y: "250",
          },
          { textContent: "300", transform: "rotate(90, 299, 250)", x: "299", y: "250" },
          {
            textContent: "300",
            transform: "rotate(90, 331.66666666666663, 250)",
            x: "331.66666666666663",
            y: "250",
          },
          {
            textContent: "200",
            transform: "rotate(90, 364.3333333333333, 250)",
            x: "364.3333333333333",
            y: "250",
          },
          { textContent: "278", transform: "rotate(90, 397, 250)", x: "397", y: "250" },
          {
            textContent: "189",
            transform: "rotate(90, 429.66666666666663, 250)",
            x: "429.66666666666663",
            y: "250",
          },
        ]);
      });

      it("should not render label", () => {
        const { container } = renderTestCase();
        expectRadiusAxisLabel(container, null);
      });
    });

    test("follows tickCount", () => {
      const { container } = render(() => (
        <RadialBarChart width={500} height={500} data={PageData}>
          <RadialBar dataKey="uv" />
          <PolarRadiusAxis dataKey="uv" type="number" label="test" tickCount={3} />
        </RadialBarChart>
      ));
      expectRadiusAxisTicks(container, [
        { textContent: "0", transform: "rotate(90, 250, 250)", x: "250", y: "250" },
        { textContent: "200", transform: "rotate(90, 348, 250)", x: "348", y: "250" },
        { textContent: "400", transform: "rotate(90, 446, 250)", x: "446", y: "250" },
      ]);
      expectRadiusAxisLabel(container, { textContent: "test", x: "348", y: "250" });
    });
  });

  // Omitted: state-integration "report settings + remove when component removed"
  // (needs React rerender to unmount the axis; the Solid equivalent is a signal
  // toggle — deferred). The two non-rerender state selectors are ported below.
  describe("state integration", () => {
    it("should select radius axis settings", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={300} height={200} data={exampleRadarData}>
          <Radar dataKey="value" radiusAxisId="radius-id" />
          <PolarRadiusAxis
            allowDuplicatedCategory={false}
            type="category"
            radiusAxisId="radius-id"
            allowDataOverflow
            scale="log"
            reversed
            name="radius-name"
            dataKey="value"
            tick={false}
            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tickCount={9}
            allowDecimals
            domain={[100, 500]}
          />
          {props.children}
        </RadarChart>
      ));

      const settingsCase = renderTestCase((state) => selectRadiusAxis(state, "radius-id"));
      expectLastCalledWith(settingsCase.spy, {
        domain: [100, 500],
        allowDataOverflow: true,
        allowDecimals: true,
        allowDuplicatedCategory: false,
        dataKey: "value",
        id: "radius-id",
        includeHidden: false,
        name: "radius-name",
        reversed: true,
        niceTicks: "auto",
        scale: "log",
        tick: false,
        tickCount: 9,
        ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        type: "category",
        unit: undefined,
      });

      const rangeCase = renderTestCase((state) =>
        selectRadiusAxisRangeWithReversed(state, "radius-id"),
      );
      expectLastCalledWith(rangeCase.spy, [76, 0]);

      const domainCase = renderTestCase((state) =>
        selectAxisDomain(state, "radiusAxis", "radius-id", false),
      );
      expectLastCalledWith(domainCase.spy, [420, 460, 999, 500, 864, 650, 765, 365]);
    });

    it("should select numerical radius axis domain", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <RadarChart width={300} height={200} data={exampleRadarData}>
          <Radar dataKey="value" radiusAxisId="radius-id" />
          <PolarRadiusAxis dataKey="value" radiusAxisId="radius-id" />
          {props.children}
        </RadarChart>
      ));

      const domainCase = renderTestCase((state) =>
        selectAxisDomain(state, "radiusAxis", "radius-id", false),
      );
      expectLastCalledWith(domainCase.spy, [0, 999]);

      const scaleTypeCase = renderTestCase((state) =>
        selectRealScaleType(state, "radiusAxis", "radius-id"),
      );
      expectLastCalledWith(scaleTypeCase.spy, "linear");
    });
  });

  describe("with custom tick formatter and category values", () => {
    // https://github.com/recharts/recharts/issues/6010
    const formatter = (value: unknown): string => `Formatted: ${String(value)}`;

    const renderTestCase = createSelectorTestCase((props) => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <PolarRadiusAxis dataKey="name" type="category" tickFormatter={formatter} />
        <Radar dataKey="value" />
        {props.children}
      </RadarChart>
    ));

    it("should render labels with custom formatter", () => {
      const { container } = renderTestCase();
      expectRadiusAxisTicks(container, [
        {
          textContent: "Formatted: iPhone 3GS",
          transform: "rotate(90, 262.25, 250)",
          x: "262.25",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 4",
          transform: "rotate(90, 286.75, 250)",
          x: "286.75",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 4s",
          transform: "rotate(90, 311.25, 250)",
          x: "311.25",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 5",
          transform: "rotate(90, 335.75, 250)",
          x: "335.75",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 5s",
          transform: "rotate(90, 360.25, 250)",
          x: "360.25",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 6",
          transform: "rotate(90, 384.75, 250)",
          x: "384.75",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 6s",
          transform: "rotate(90, 409.25, 250)",
          x: "409.25",
          y: "250",
        },
        {
          textContent: "Formatted: iPhone 5se",
          transform: "rotate(90, 433.75, 250)",
          x: "433.75",
          y: "250",
        },
      ]);
    });
  });
});
