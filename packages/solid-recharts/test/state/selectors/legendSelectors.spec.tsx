import { createEffect, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { BarChart, Legend, type LegendPayload } from "../../../src";
import type { LegendSettings } from "../../../src/state/legendSlice";
import {
  selectLegendPayload,
  selectLegendSettings,
  selectLegendSize,
} from "../../../src/state/selectors/legendSelectors";
import type { Size } from "../../../src/util/types";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
  useAppSelectorWithStableTest,
} from "../../helper/selectorTestHelpers";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { render } from "../../helper/render";

// Ported from recharts 3.8.1 test/state/selectors/legendSelectors.spec.tsx.

describe("selectLegendSettings", () => {
  shouldReturnUndefinedOutOfContext(selectLegendSettings);
  shouldReturnFromInitialState(selectLegendSettings, {
    layout: "horizontal",
    align: "center",
    verticalAlign: "bottom",
    itemSorter: "value",
  });

  it("should return Legend settings", () => {
    const legendSettingsSpy = vi.fn();
    const Comp = (): null => {
      const legend = useAppSelectorWithStableTest(selectLegendSettings);
      createEffect(
        () => legend(),
        (value) => legendSettingsSpy(value),
      );
      return null;
    };
    mockGetBoundingClientRect({ width: 17, height: 71 });
    render(() => (
      <BarChart width={100} height={100}>
        <Legend align="left" layout="vertical" verticalAlign="top" />
        <Comp />
      </BarChart>
    ));
    flush();
    const expected: LegendSettings = {
      align: "left",
      layout: "vertical",
      verticalAlign: "top",
      itemSorter: "value",
    };
    expect(legendSettingsSpy).toHaveBeenLastCalledWith(expected);
  });
});

describe("selectLegendSize", () => {
  shouldReturnUndefinedOutOfContext(selectLegendSize);
  shouldReturnFromInitialState(selectLegendSize, {
    width: 0,
    height: 0,
  });

  it("should return Legend size", () => {
    const legendSettingsSpy = vi.fn();
    const Comp = (): null => {
      const legend = useAppSelectorWithStableTest(selectLegendSize);
      createEffect(
        () => legend(),
        (value) => legendSettingsSpy(value),
      );
      return null;
    };
    mockGetBoundingClientRect({ width: 17, height: 71 });
    render(() => (
      <BarChart width={100} height={100}>
        <Legend align="left" layout="vertical" verticalAlign="top" />
        <Comp />
      </BarChart>
    ));
    flush();
    const expected: Size = { width: 17, height: 71 };
    expect(legendSettingsSpy).toHaveBeenLastCalledWith(expected);
  });
});

describe("selectLegendPayload", () => {
  shouldReturnUndefinedOutOfContext(selectLegendPayload);
  shouldReturnFromInitialState(selectLegendPayload, []);

  it("should return Legend payload", () => {
    const legendPayloadSpy = vi.fn();
    const Comp = (): null => {
      const legend = useAppSelectorWithStableTest(selectLegendPayload);
      createEffect(
        () => legend(),
        (value) => legendPayloadSpy(value),
      );
      return null;
    };
    mockGetBoundingClientRect({ width: 17, height: 71 });
    render(() => (
      <BarChart width={100} height={100}>
        <Legend align="left" layout="vertical" verticalAlign="top" />
        <Comp />
      </BarChart>
    ));
    flush();
    const expected: ReadonlyArray<LegendPayload> = [];
    expect(legendPayloadSpy).toHaveBeenLastCalledWith(expected);
  });
});
