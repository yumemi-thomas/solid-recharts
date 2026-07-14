// Ported from recharts 3.8.1 test/polar/Radar.spec.tsx (commit 7a23854).
//
// Only the triage-approved impl-ready cases are ported here. The polygon
// geometry tests inline the golden `d` (recharts' `expectRadarPolygons` value)
// because the port has no `expectRadarPolygons` helper. `flush()` because Radar
// registers via an effect and points compute from the store.
import { createEffect, createSignal } from "solid-js";
import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Radar, RadarChart } from "../../src";
import type { RadarProps } from "../../src";
import type { RadarShapeProps } from "../../src/polar/Radar";
import { fireEvent, render, screen } from "@solidjs/testing-library";
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

    it("should render a polygon", () => {
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" isAnimationActive={false} />
        </RadarChart>
      ));
      const polygon = container.querySelector(".recharts-radar-polygon path");
      expect(polygon?.getAttribute("d")).toBe(GOLDEN_RADAR_PATH);
      expect(polygon?.getAttribute("fill")).toBeNull();
      expect(polygon?.getAttribute("fill-opacity")).toBeNull();
    });
  });

  // Element/object-form shape/label/dot need React.cloneElement and are
  // PERMANENT-N/A; the FUNCTION form is portable and ported below.
  it("Render customized shape when shape is set to be a function", () => {
    const CustomizedShape = (props: RadarShapeProps): JSX.Element => {
      const d = props.points.reduce(
        (result, entry, index) =>
          result + (index ? `L${entry.x},${entry.y}` : `M${entry.x},${entry.y}`),
        "",
      );
      return <path d={d} data-testid="customized-shape" />;
    };

    render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} shape={CustomizedShape} />
      </RadarChart>
    ));
    expect(screen.getAllByTestId("customized-shape")).toHaveLength(1);
  });

  it("Render customized label when label is set to be a function", () => {
    const CustomizedLabel = (): JSX.Element => <text data-testid="customized-label">test</text>;

    render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} label={CustomizedLabel} />
      </RadarChart>
    ));
    expect(screen.getAllByTestId("customized-label")).toHaveLength(exampleRadarData.length);
  });

  it("Render customized dot when dot is set to be a function", () => {
    const CustomizedDot = (props: { cx?: number; cy?: number }): JSX.Element => (
      <circle cx={props.cx} cy={props.cy} r={10} data-testid="customized-dot" />
    );

    render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar dataKey="value" isAnimationActive={false} dot={CustomizedDot} />
      </RadarChart>
    ));
    expect(screen.getAllByTestId("customized-dot")).toHaveLength(exampleRadarData.length);
  });

  // The reference titles this "react element" but the value is the FUNCTION form
  // (`dot={props => <.../>}`), which is portable; the true react-element form
  // (`dot={<Comp />}`) needs React.cloneElement and stays PERMANENT-N/A.
  it("Render customized dot when dot is set via an inline render function", () => {
    const CustomizedDot = (props: { cx?: number; cy?: number }): JSX.Element => (
      <circle cx={props.cx} cy={props.cy} r={10} data-testid="customized-dot" />
    );

    render(() => (
      <RadarChart width={500} height={500} data={exampleRadarData}>
        <Radar
          dataKey="value"
          isAnimationActive={false}
          dot={(props) => <CustomizedDot {...props} />}
        />
      </RadarChart>
    ));
    expect(screen.getAllByTestId("customized-dot")).toHaveLength(exampleRadarData.length);
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
    expect(container.querySelectorAll(".recharts-radar-polygon")).toHaveLength(0);
  });

  describe("events", () => {
    // PERMANENT-N/A: the onMouseEnter/onMouseLeave cases assert the full
    // InternalRadarProps payload via recharts' 2-arg props-first handler signature
    // (the port forwards single-arg event-only handlers onto the polygon path), and
    // every reference case is render-count coupled. The single-arg event-only
    // assertions below ARE portable.
    it("should fire onClick event when clicking on the radar polygon", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar dataKey="value" isAnimationActive={false} onClick={handleClick} />
        </RadarChart>
      ));
      const polygon = container.querySelector(".recharts-polygon");
      expect(polygon).not.toBeNull();
      fireEvent.click(polygon!);
      expect(handleClick).toHaveBeenCalled();
      expectLastCalledWith(handleClick, expect.objectContaining({ type: "click" }));
    });

    it("should fire onTouchMove and onTouchEnd events when touching the radar polygon", () => {
      const handleTouchMove = vi.fn();
      const handleTouchEnd = vi.fn();
      const { container } = render(() => (
        <RadarChart width={500} height={500} data={exampleRadarData}>
          <Radar
            dataKey="value"
            isAnimationActive={false}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </RadarChart>
      ));
      const polygon = container.querySelector(".recharts-polygon");
      expect(polygon).not.toBeNull();
      fireEvent.touchMove(polygon!, { touches: [{ clientX: 200, clientY: 200 }] });
      expect(handleTouchMove).toHaveBeenCalled();
      expectLastCalledWith(handleTouchMove, expect.objectContaining({ type: "touchmove" }));

      fireEvent.touchEnd(polygon!);
      expect(handleTouchEnd).toHaveBeenCalled();
      expectLastCalledWith(handleTouchEnd, expect.objectContaining({ type: "touchend" }));
    });
  });

  describe("state integration", () => {
    it("should report its settings to Redux state, and remove it when removed from DOM", () => {
      const polarItemsSpy = vi.fn();
      const [showRadar, setShowRadar] = createSignal(true);
      const Comp = (): null => {
        const items = useAppSelector((state) => selectPolarItemsSettings(state, "angleAxis", 0));
        createEffect(() => {
          const value = (() => items())();
          ((v) => polarItemsSpy(v))(value);
        });
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
      expect(polarItemsSpy).toHaveBeenLastCalledWith([]);
    });
  });
});
