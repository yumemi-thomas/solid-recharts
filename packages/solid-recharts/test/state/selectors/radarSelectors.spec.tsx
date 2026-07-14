// Port of recharts 3.8.1 test/state/selectors/radarSelectors.spec.tsx (commit 7a23854).
// Tier-B selector values, golden-anchored to recharts. Harness deltas: render+Comp+spy
// → createSelectorTestCase; the `scale` field is asserted via the Solid `expectScale`
// helper (the Solid port has no `toBeRechartsScale` asymmetric matcher) with the rest of
// the axis object via objectContaining. The "should return new data after interaction"
// case uses a Solid signal (in place of React useState) to flip the Radar dataKey and
// asserts the selector VALUE before/after the click (render-count assertions dropped).
import { createEffect, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { useAppSelectorWithStableTest } from "../../helper/selectorTestHelpers";
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

  it("should return new data after interaction", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      const points = useAppSelectorWithStableTest((state) =>
        selectRadarPoints(state, 0, 0, false, "radar-value"),
      );
      createEffect(() => {
        const value = (() => points())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    const TestCase = () => {
      const [dataKey, setDataKey] = createSignal<"value" | "half">("value");
      return (
        <>
          {dataKey() === "value" ? (
            <button type="button" onClick={() => setDataKey("half")}>
              Change DataKey to half
            </button>
          ) : (
            <button type="button" onClick={() => setDataKey("value")}>
              Change DataKey to value
            </button>
          )}
          <RadarChart data={exampleRadarData} width={400} height={400}>
            <Radar dataKey={dataKey()} id="radar-value" />
            <Comp />
          </RadarChart>
        </>
      );
    };
    const { container } = render(() => <TestCase />);
    const expectedResultBefore: ReturnType<typeof selectRadarPoints> = {
      baseLinePoints: [],
      isRange: false,
      points: [
        {
          angle: 90,
          cx: 200,
          cy: 200,
          name: 0,
          payload: { half: 210, name: "iPhone 3GS", value: 420 },
          radius: 65.52,
          value: 420,
          x: 200,
          y: 134.48000000000002,
        },
        {
          angle: 45,
          cx: 200,
          cy: 200,
          name: 1,
          payload: { half: 230, name: "iPhone 4", value: 460 },
          radius: 71.76,
          value: 460,
          x: 250.74198261794666,
          y: 149.25801738205337,
        },
        {
          angle: 0,
          cx: 200,
          cy: 200,
          name: 2,
          payload: { half: 500, name: "iPhone 4s", value: 999 },
          radius: 155.844,
          value: 999,
          x: 355.844,
          y: 200,
        },
        {
          angle: -45,
          cx: 200,
          cy: 200,
          name: 3,
          payload: { half: 250, name: "iPhone 5", value: 500 },
          radius: 78,
          value: 500,
          x: 255.1543289325507,
          y: 255.1543289325507,
        },
        {
          angle: -90,
          cx: 200,
          cy: 200,
          name: 4,
          payload: { half: 432, name: "iPhone 5s", value: 864 },
          radius: 134.784,
          value: 864,
          x: 200,
          y: 334.784,
        },
        {
          angle: -135,
          cx: 200,
          cy: 200,
          name: 5,
          payload: { half: 325, name: "iPhone 6", value: 650 },
          radius: 101.4,
          value: 650,
          x: 128.2993723876841,
          y: 271.70062761231594,
        },
        {
          angle: -180,
          cx: 200,
          cy: 200,
          name: 6,
          payload: { half: 383, name: "iPhone 6s", value: 765 },
          radius: 119.34,
          value: 765,
          x: 80.66,
          y: 200.00000000000003,
        },
        {
          angle: -225,
          cx: 200,
          cy: 200,
          name: 7,
          payload: { half: 183, name: "iPhone 5se", value: 365 },
          radius: 56.94,
          value: 365,
          x: 159.737339879238,
          y: 159.737339879238,
        },
      ],
    };

    expectLastCalledWith(spy, expectedResultBefore);

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    const expectedResultAfter: ReturnType<typeof selectRadarPoints> = {
      baseLinePoints: [],
      isRange: false,
      points: [
        {
          angle: 90,
          cx: 200,
          cy: 200,
          name: 0,
          payload: { half: 210, name: "iPhone 3GS", value: 420 },
          radius: 54.599999999999994,
          value: 210,
          x: 200,
          y: 145.4,
        },
        {
          angle: 45,
          cx: 200,
          cy: 200,
          name: 1,
          payload: { half: 230, name: "iPhone 4", value: 460 },
          radius: 59.800000000000004,
          value: 230,
          x: 242.28498551495557,
          y: 157.71501448504446,
        },
        {
          angle: 0,
          cx: 200,
          cy: 200,
          name: 2,
          payload: { half: 500, name: "iPhone 4s", value: 999 },
          radius: 130,
          value: 500,
          x: 330,
          y: 200,
        },
        {
          angle: -45,
          cx: 200,
          cy: 200,
          name: 3,
          payload: { half: 250, name: "iPhone 5", value: 500 },
          radius: 65,
          value: 250,
          x: 245.9619407771256,
          y: 245.9619407771256,
        },
        {
          angle: -90,
          cx: 200,
          cy: 200,
          name: 4,
          payload: { half: 432, name: "iPhone 5s", value: 864 },
          radius: 112.32,
          value: 432,
          x: 200,
          y: 312.32,
        },
        {
          angle: -135,
          cx: 200,
          cy: 200,
          name: 5,
          payload: { half: 325, name: "iPhone 6", value: 650 },
          radius: 84.5,
          value: 325,
          x: 140.24947698973673,
          y: 259.7505230102633,
        },
        {
          angle: -180,
          cx: 200,
          cy: 200,
          name: 6,
          payload: { half: 383, name: "iPhone 6s", value: 765 },
          radius: 99.58,
          value: 383,
          x: 100.42,
          y: 200,
        },
        {
          angle: -225,
          cx: 200,
          cy: 200,
          name: 7,
          payload: { half: 183, name: "iPhone 5se", value: 365 },
          radius: 47.58,
          value: 183,
          x: 166.35585935114406,
          y: 166.3558593511441,
        },
      ],
    };

    expectLastCalledWith(spy, expectedResultAfter);
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
