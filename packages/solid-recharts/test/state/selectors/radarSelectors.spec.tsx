// Port of recharts 3.8.1 test/state/selectors/radarSelectors.spec.tsx (commit 7a23854).
// Tier-B selector values, golden-anchored to recharts. Harness deltas: render+Comp+spy
// → createSelectorTestCase; the `scale` field is asserted via the Solid `expectScale`
// helper (the Solid port has no `toBeRechartsScale` asymmetric matcher) with the rest of
// the axis object via objectContaining. Deferred: the "should return new data after
// interaction" case (React useState + reselect reference-stability — N/A in the Solid
// store; store proxies break ref equality).
import { describe, expect, it } from "vitest";
import { RechartsRootState } from "../../../src/state/store";
import {
  selectAngleAxisForBandSize,
  selectAngleAxisWithScaleAndViewport,
  selectRadarPoints,
  selectRadiusAxisForBandSize,
} from "../../../src/state/selectors/radarSelectors";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectScale } from "../../helper/expectScale";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart } from "../../../src";
import { exampleRadarData } from "../../_data";

/** Reads the `.scale` off a spied axis object without a type assertion. */
function scaleOf(value: unknown): unknown {
  return value != null && typeof value === "object" && "scale" in value ? value.scale : undefined;
}

describe("selectRadarPoints", () => {
  const selector = (state: RechartsRootState) =>
    selectRadarPoints(state, 0, 0, false, "radar-value");

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  const renderTestCase = createSelectorTestCase((props) => (
    <RadarChart width={500} height={500} data={exampleRadarData}>
      <Radar dataKey="value" id="radar-value" />
      <PolarRadiusAxis dataKey="value" />
      {props.children}
    </RadarChart>
  ));

  it("should return radar points in a chart", () => {
    const { spy } = renderTestCase(selector);
    expectLastCalledWith(spy, {
      baseLinePoints: [],
      isRange: false,
      points: [
        {
          angle: 90,
          cx: 250,
          cy: 250,
          name: 0,
          payload: { half: 210, name: "iPhone 3GS", value: 420 },
          radius: 82.32,
          value: 420,
          x: 250,
          y: 167.68,
        },
        {
          angle: 45,
          cx: 250,
          cy: 250,
          name: 1,
          payload: { half: 230, name: "iPhone 4", value: 460 },
          radius: 90.16000000000001,
          value: 460,
          x: 313.75274739177917,
          y: 186.2472526082209,
        },
        {
          angle: 0,
          cx: 250,
          cy: 250,
          name: 2,
          payload: { half: 500, name: "iPhone 4s", value: 999 },
          radius: 195.804,
          value: 999,
          x: 445.804,
          y: 250,
        },
        {
          angle: -45,
          cx: 250,
          cy: 250,
          name: 3,
          payload: { half: 250, name: "iPhone 5", value: 500 },
          radius: 98,
          value: 500,
          x: 319.29646455628165,
          y: 319.29646455628165,
        },
        {
          angle: -90,
          cx: 250,
          cy: 250,
          name: 4,
          payload: { half: 432, name: "iPhone 5s", value: 864 },
          radius: 169.344,
          value: 864,
          x: 250,
          y: 419.344,
        },
        {
          angle: -135,
          cx: 250,
          cy: 250,
          name: 5,
          payload: { half: 325, name: "iPhone 6", value: 650 },
          radius: 127.4,
          value: 650,
          x: 159.91459607683385,
          y: 340.08540392316615,
        },
        {
          angle: -180,
          cx: 250,
          cy: 250,
          name: 6,
          payload: { half: 383, name: "iPhone 6s", value: 765 },
          radius: 149.94,
          value: 765,
          x: 100.06,
          y: 250.00000000000003,
        },
        {
          angle: -225,
          cx: 250,
          cy: 250,
          name: 7,
          payload: { half: 183, name: "iPhone 5se", value: 365 },
          radius: 71.53999999999999,
          value: 365,
          x: 199.41358087391438,
          y: 199.41358087391438,
        },
      ],
    });
  });
});

describe("selectRadiusAxisForBandSize", () => {
  const selector = (state: RechartsRootState) => selectRadiusAxisForBandSize(state, 0);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  const renderTestCase = createSelectorTestCase((props) => (
    <RadarChart width={500} height={500} data={exampleRadarData}>
      <Radar dataKey="value" />
      <PolarRadiusAxis dataKey="value" />
      {props.children}
    </RadarChart>
  ));

  it("should return axis object in radar chart", () => {
    const { spy } = renderTestCase(selector);
    const last: unknown = spy.mock.calls.at(-1)?.[0];
    expect(last).toEqual(
      expect.objectContaining({
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
        tick: true,
        tickCount: 5,
        ticks: undefined,
        type: "number",
        unit: undefined,
      }),
    );
    expectScale(scaleOf(last), { domain: [0, 1000], range: [0, 196] });
  });
});

describe("selectAngleAxisForBandSize", () => {
  const selector = (state: RechartsRootState) => selectAngleAxisForBandSize(state, 0);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  const renderTestCase = createSelectorTestCase((props) => (
    <RadarChart width={500} height={500} data={exampleRadarData}>
      <Radar dataKey="value" />
      <PolarAngleAxis dataKey="value" />
      {props.children}
    </RadarChart>
  ));

  it("should return axis object in radar chart", () => {
    const { spy } = renderTestCase(selector);
    const last: unknown = spy.mock.calls.at(-1)?.[0];
    expect(last).toEqual(
      expect.objectContaining({
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
        tick: true,
        tickCount: undefined,
        ticks: undefined,
        type: "category",
        unit: undefined,
      }),
    );
    expectScale(scaleOf(last), {
      domain: [420, 460, 999, 500, 864, 650, 765, 365],
      range: [-270, 90],
    });
  });
});

describe("selectAngleAxisWithScaleAndViewport", () => {
  const selector = (state: RechartsRootState) => selectAngleAxisWithScaleAndViewport(state, 0);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);

  const renderTestCase = createSelectorTestCase((props) => (
    <RadarChart width={500} height={500} data={exampleRadarData}>
      <Radar dataKey="value" />
      <PolarAngleAxis dataKey="value" />
      {props.children}
    </RadarChart>
  ));

  it("should return angle axis object", () => {
    const { spy } = renderTestCase(selector);
    const last: unknown = spy.mock.calls.at(-1)?.[0];
    expect(last).toEqual(
      expect.objectContaining({
        cx: 250,
        cy: 250,
        dataKey: "value",
        type: "category",
      }),
    );
    expectScale(scaleOf(last), {
      domain: [420, 460, 999, 500, 864, 650, 765, 365],
      range: [-270, 90],
    });
  });
});
