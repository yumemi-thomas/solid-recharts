// Ported from recharts 3.8.1 test/polar/Radar.spec.tsx (commit 7a23854).
//
// Only the triage-approved impl-ready cases are ported here. The polygon
// geometry tests inline the golden `d` (recharts' `expectRadarPolygons` value)
// because the port has no `expectRadarPolygons` helper. `flush()` because Radar
// registers via an effect and points compute from the store.
import { createEffect, createSignal, flush } from "solid-js";
import { Show } from "@solidjs/web";
import { describe, expect, it, vi } from "vitest";
import { Radar, RadarChart } from "../../src";
import type { RadarProps } from "../../src";
import { render } from "../helper/render";
import { useAppSelector } from "../../src/state/hooks";
import { selectPolarItemsSettings } from "../../src/state/selectors/polarSelectors";
import { exampleRadarData } from "../_data";
import type { RadarSettings } from "../../src/state/types/RadarSettings";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { selectRadiusAxis } from "../../src/state/selectors/polarAxisSelectors";
import { defaultAxisId } from "../../src/state/cartesianAxisSlice";

const GOLDEN_RADAR_PATH =
  "M250,167.68L313.7527,186.2473L445.804,250L319.2965,319.2965L250,419.344L159.9146,340.0854L100.06,250L199.4136,199.4136L250,167.68Z";

describe("<Radar />", () => {
  describe("in simple chart with implicit axes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} />
        {props.children}
      </RadarChart>
    ));

    it("should select radial axis settings", () => {
      const { spy } = renderTestCase((state) => selectRadiusAxis(state, defaultAxisId));
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
  });

  it("should render Radar in a custom component", () => {
    const CustomRadar = (props: RadarProps) => {
      return <Radar {...props} />;
    };

    const { container } = render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <CustomRadar dataKey="value" isAnimationActive={false} />
      </RadarChart>
    ));
    flush();

    const polygon = container.querySelector(".recharts-radar-polygon path");
    expect(polygon).not.toBeNull();
    expect(polygon?.getAttribute("d")).toBe(GOLDEN_RADAR_PATH);
    expect(polygon?.getAttribute("fill")).toBeNull();
  });

  it("Don't render polygon when data is empty", () => {
    const { container } = render(() => (
      <RadarChart width={500} height={500} data={[]}>
        <Radar dataKey="value" isAnimationActive={false} />
      </RadarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-radar-polygon")).toHaveLength(0);
  });

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it when removed from DOM", () => {
      const polarItemsSpy = vi.fn();
      const [showRadar, setShowRadar] = createSignal(true);
      const Comp = (): null => {
        const items = useAppSelector((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        createEffect(
          () => items(),
          (v) => polarItemsSpy(v),
        );
        return null;
      };
      render(() => (
        <RadarChart width={100} height={100} data={exampleRadarData}>
          <Show when={showRadar()}>
            <Radar dataKey="value" />
          </Show>
          <Comp />
        </RadarChart>
      ));
      flush();

      const expectedPolarItemsSettings: RadarSettings = {
        // `id` is a documented Solid deviation: recharts matches reference
        // elements by object identity, but the port mints a stable id for
        // proxy-safe removal. recharts' expected `radar-` substring still matches.
        id: expect.stringMatching("radar-") as unknown as string,
        type: "radar",
        angleAxisId: 0,
        data: undefined,
        dataKey: "value",
        hide: false,
        radiusAxisId: 0,
      };
      expect(polarItemsSpy).toHaveBeenLastCalledWith([expectedPolarItemsSettings]);

      setShowRadar(false);
      flush();

      expect(polarItemsSpy).toHaveBeenLastCalledWith([]);
    });
  });
});
