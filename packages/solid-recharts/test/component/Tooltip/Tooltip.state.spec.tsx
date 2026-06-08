import { describe, test } from "vitest";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { LineChart, Tooltip } from "../../../src";
import { TooltipSettingsState } from "../../../src/state/tooltipSlice";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

/*
 * Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.state.spec.tsx.
 * Asserts the Tooltip's settings published to the store (explicit/default/implicit).
 */

describe("Tooltip state integration", () => {
  describe("with explicit settings", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={1} height={1}>
        <Tooltip shared trigger="click" axisId="my-axis-id" active defaultIndex={4} />
        {props.children}
      </LineChart>
    ));

    test("should publish its settings to Redux store", () => {
      const { spy } = renderTestCase((state) => state.tooltip.settings);
      const expected: TooltipSettingsState = {
        axisId: "my-axis-id",
        shared: true,
        trigger: "click",
        active: true,
        defaultIndex: "4",
      };
      expectLastCalledWith(spy, expected);
    });
  });

  describe("with default settings", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={1} height={1}>
        <Tooltip />
        {props.children}
      </LineChart>
    ));

    test("should publish its settings to Redux store", () => {
      const { spy } = renderTestCase((state) => state.tooltip.settings);
      const expected: TooltipSettingsState = {
        active: undefined,
        axisId: 0,
        defaultIndex: undefined,
        shared: undefined,
        trigger: "hover",
      };
      expectLastCalledWith(spy, expected);
    });
  });

  describe("with implicit settings", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={1} height={1}>
        {props.children}
      </LineChart>
    ));

    test("should read initial settings from Redux store", () => {
      const { spy } = renderTestCase((state) => state.tooltip.settings);
      const expected: TooltipSettingsState = {
        active: false,
        axisId: 0,
        defaultIndex: undefined,
        shared: undefined,
        trigger: "hover",
      };
      expectLastCalledWith(spy, expected);
    });
  });
});
