// Ported from recharts 3.8.1 test/chart/ScatterChart.spec.tsx (commit
// 7a23854). Solid deviations: this first batch covers the base three-dimensional
// scatter render, clip path, empty data, and item mouse-enter callback.
import { describe, expect, it, test, vi } from "vitest";
import { createEffect } from "solid-js";
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "../../src";
import { expectScatterPoints } from "../helper/expectScatterPoints";
import { assertNotNull } from "../helper/assertNotNull";
import { fireEvent, render } from "../helper/render";
import { PageData } from "../_data";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { selectTooltipPayload } from "../../src/state/selectors/tooltipSelectors";
import {
  selectNumericalDomain,
  selectZAxisWithScale,
} from "../../src/state/selectors/axisSelectors";
import { expectScale } from "../helper/expectScale";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import {
  expectTooltipCoordinate,
  expectTooltipNotVisible,
  expectTooltipPayload,
  showTooltip,
} from "../component/Tooltip/tooltipTestHelpers";
import { scatterChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";

describe("ScatterChart of three dimension data", () => {
  const data01 = [
    { x: 100, y: 200, z: 200 },
    { x: 120, y: 100, z: 260 },
    { x: 170, y: 300, z: 400 },
    { x: 140, y: 250, z: 280 },
    { x: 150, y: 400, z: 500 },
    { x: 110, y: 280, z: 200 },
  ];

  const data02 = [
    { x: 200, y: 260, z: 240 },
    { x: 240, y: 290, z: 220 },
    { x: 190, y: 290, z: 250 },
    { x: 198, y: 250, z: 210 },
    { x: 180, y: 280, z: 260 },
    { x: 210, y: 220, z: 230 },
  ];

  test("Render 2 Scatter", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={data01} fillOpacity={0.3} fill="#ff7300" />
        <Scatter name="B school" data={data02} fill="#347300" />
        <Tooltip />
        <Legend />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".recharts-scatter")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-legend-item")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(
      data01.length + data02.length,
    );
    expect(container.querySelectorAll(".recharts-scatter-symbol path")).toHaveLength(
      data01.length + data02.length,
    );

    expectScatterPoints(container, [
      {
        cx: "73.33333333333333",
        cy: "185",
        d: "M0,0",
        height: "3.638913473173784",
        transform: "translate(73.33333333333333, 185)",
        width: "3.638913473173784",
      },
      {
        cx: "100",
        cy: "267.5",
        d: "M0,0",
        height: "3.960594802695323",
        transform: "translate(100, 267.5)",
        width: "3.960594802695323",
      },
      {
        cx: "126.66666666666667",
        cy: "102.5",
        d: "M0,0",
        height: "4.624978308224887",
        transform: "translate(126.66666666666667, 102.5)",
        width: "4.624978308224887",
      },
      {
        cx: "153.33333333333334",
        cy: "143.75",
        d: "M0,0",
        height: "4.062165001543845",
        transform: "translate(153.33333333333334, 143.75)",
        width: "4.062165001543845",
      },
      {
        cx: "180.00000000000003",
        cy: "20",
        d: "M0,0",
        height: "5.046265044040321",
        transform: "translate(180.00000000000003, 20)",
        width: "5.046265044040321",
      },
      {
        cx: "206.66666666666669",
        cy: "119.00000000000001",
        d: "M0,0",
        height: "3.638913473173784",
        transform: "translate(206.66666666666669, 119.00000000000001)",
        width: "3.638913473173784",
      },
      {
        cx: "73.33333333333333",
        cy: "135.5",
        d: "M0,0",
        height: "3.8563503319209342",
        transform: "translate(73.33333333333333, 135.5)",
        width: "3.8563503319209342",
      },
      {
        cx: "100",
        cy: "110.75000000000001",
        d: "M0,0",
        height: "3.749208526326083",
        transform: "translate(100, 110.75000000000001)",
        width: "3.749208526326083",
      },
      {
        cx: "126.66666666666667",
        cy: "110.75000000000001",
        d: "M0,0",
        height: "3.9088200952233594",
        transform: "translate(126.66666666666667, 110.75000000000001)",
        width: "3.9088200952233594",
      },
      {
        cx: "153.33333333333334",
        cy: "143.75",
        d: "M0,0",
        height: "3.694472617243352",
        transform: "translate(153.33333333333334, 143.75)",
        width: "3.694472617243352",
      },
      {
        cx: "180.00000000000003",
        cy: "119.00000000000001",
        d: "M0,0",
        height: "3.960594802695323",
        transform: "translate(180.00000000000003, 119.00000000000001)",
        width: "3.960594802695323",
      },
      {
        cx: "206.66666666666669",
        cy: "168.49999999999997",
        d: "M0,0",
        height: "3.803156745151513",
        transform: "translate(206.66666666666669, 168.49999999999997)",
        width: "3.803156745151513",
      },
    ]);
  });

  test("should render clipPath if one of axes has allowDataOverflow=true", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <XAxis dataKey="x" name="stature" unit="cm" allowDataOverflow />
        <YAxis dataKey="y" name="weight" unit="kg" allowDataOverflow />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={[]} fillOpacity={0.3} fill="#ff7300" />
        <Tooltip />
        <Legend layout="vertical" />
      </ScatterChart>
    ));

    const clipPath = container.querySelector("clipPath rect");
    assertNotNull(clipPath);
    expect(clipPath.getAttributeNames().sort()).toEqual(["height", "width", "x", "y"]);
    expect(clipPath).toHaveAttribute("width", "280");
    expect(clipPath).toHaveAttribute("height", "330");
    expect(clipPath).toHaveAttribute("x", "100");
    expect(clipPath).toHaveAttribute("y", "10");
  });

  test("Don't render any symbols when data is empty", () => {
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter name="A school" data={[]} fillOpacity={0.3} fill="#ff7300" />
        <Tooltip />
        <Legend layout="vertical" />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".recharts-symbol")).toHaveLength(0);
  });

  test("mouse enter on scatter symbol should call onMouseEnter from props", () => {
    const onMouseEnter = vi.fn();
    const { container } = render(() => (
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis dataKey="x" name="stature" unit="cm" />
        <YAxis dataKey="y" name="weight" unit="kg" />
        <ZAxis dataKey="z" range={[4, 20]} name="score" unit="km" />
        <CartesianGrid />
        <Scatter
          name="A school"
          data={data01}
          fillOpacity={0.3}
          fill="#ff7300"
          onMouseEnter={onMouseEnter}
        />
        <Scatter name="B school" data={data02} fill="#347300" />
        <Tooltip />
        <Legend />
      </ScatterChart>
    ));

    const symbol = container.querySelectorAll(".recharts-scatter-symbol")[0];
    assertNotNull(symbol);
    fireEvent.mouseEnter(symbol);

    expect(onMouseEnter).toHaveBeenCalled();
  });
});

describe("ScatterChart with joint line", () => {
  const data01 = [
    { x: 10, y: 30, z: 120 },
    { x: 30, y: 200, z: 190 },
    { x: 45, y: 100, z: 32 },
    { x: 50, y: 400, z: 67 },
    { x: 70, y: 150, z: 109 },
    { x: 100, y: 250, z: 120 },
  ];
  const data02 = [
    { x: 30, y: 20, z: 190 },
    { x: 50, y: 180, z: 32 },
    { x: 75, y: 240, z: 67 },
    { x: 100, y: 100, z: 109 },
    { x: 120, y: 190, z: 120 },
  ];

  const renderTestCase = createSelectorTestCase((props) => (
    <ScatterChart width={600} height={400}>
      <CartesianGrid />
      <XAxis type="number" dataKey="x" name="stature" unit="cm" />
      <YAxis type="number" dataKey="y" name="weight" unit="kg" />
      <ZAxis type="number" dataKey="z" range={[100, 200]} />
      <Legend />
      <Scatter name="A school" data={data01} fill="#8884d8" line shape="cross" />
      <Scatter name="B school" data={data02} fill="#82ca9d" line shape="diamond" />
      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
      {props.children}
    </ScatterChart>
  ));

  it("should select ZAxis domain", () => {
    const { spy } = renderTestCase((state) => selectNumericalDomain(state, "zAxis", 0, false));
    expectLastCalledWith(spy, [0, 190]);
  });

  it("should select zAxis axis settings", () => {
    const { spy } = renderTestCase((state) => selectZAxisWithScale(state, "zAxis", 0, false));
    const settings = spy.mock.lastCall?.[0];
    assertNotNull(settings);
    // The port has no `toBeRechartsScale` matcher; assert the scale separately.
    expect(settings).toMatchObject({
      domain: undefined,
      allowDataOverflow: false,
      allowDuplicatedCategory: false,
      dataKey: "z",
      id: 0,
      includeHidden: false,
      name: undefined,
      range: [100, 200],
      reversed: false,
      type: "number",
      unit: undefined,
    });
    expectScale(settings.scale, { domain: [0, 190], range: [100, 200] });
  });

  it("should render scatter points", () => {
    const { container } = renderTestCase();
    expectScatterPoints(container, [
      {
        cx: "109.16666666666666",
        cy: "338",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "14.413156615213909",
        transform: "translate(109.16666666666666, 338)",
        width: "14.413156615213909",
      },
      {
        cx: "197.5",
        cy: "185",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "15.957691216057308",
        transform: "translate(197.5, 185)",
        width: "15.957691216057308",
      },
      {
        cx: "263.75",
        cy: "275",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "12.197048368812888",
        transform: "translate(263.75, 275)",
        width: "12.197048368812888",
      },
      {
        cx: "285.83333333333337",
        cy: "5",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "13.12335329012121",
        transform: "translate(285.83333333333337, 5)",
        width: "13.12335329012121",
      },
      {
        cx: "374.1666666666667",
        cy: "230",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "14.155129698337069",
        transform: "translate(374.1666666666667, 230)",
        width: "14.155129698337069",
      },
      {
        cx: "506.6666666666667",
        cy: "140",
        d: "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z",
        height: "14.413156615213909",
        transform: "translate(506.6666666666667, 140)",
        width: "14.413156615213909",
      },
      {
        cx: "197.5",
        cy: "347",
        d: "M0,0L0,0L0,0L0,0Z",
        height: "15.957691216057308",
        transform: "translate(197.5, 347)",
        width: "15.957691216057308",
      },
      {
        cx: "285.83333333333337",
        cy: "203.00000000000003",
        d: "M0,0L0,0L0,0L0,0Z",
        height: "12.197048368812888",
        transform: "translate(285.83333333333337, 203.00000000000003)",
        width: "12.197048368812888",
      },
      {
        cx: "396.25",
        cy: "149",
        d: "M0,0L0,0L0,0L0,0Z",
        height: "13.12335329012121",
        transform: "translate(396.25, 149)",
        width: "13.12335329012121",
      },
      {
        cx: "506.6666666666667",
        cy: "275",
        d: "M0,0L0,0L0,0L0,0Z",
        height: "14.155129698337069",
        transform: "translate(506.6666666666667, 275)",
        width: "14.155129698337069",
      },
      {
        cx: "595",
        cy: "194",
        d: "M0,0L0,0L0,0L0,0Z",
        height: "14.413156615213909",
        transform: "translate(595, 194)",
        width: "14.413156615213909",
      },
    ]);
  });
});

describe("ScatterChart layout context", () => {
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
      <ScatterChart width={100} height={50} barSize={20}>
        <Comp />
      </ScatterChart>
    ));

    expectLastCalledWith(spy, { x: 5, y: 5, width: 90, height: 40 });
  });

  it("should provide clipPathId", () => {
    const spy = vi.fn();
    const Comp = (): null => {
      createEffect(
        () => useClipPathId(),
        (v) => spy(v),
      );
      return null;
    };
    render(() => (
      <ScatterChart width={100} height={50} barSize={20}>
        <Comp />
      </ScatterChart>
    ));

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/recharts\d+-clip/));
  });

  it("should provide width", () => {
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
      <ScatterChart width={100} height={50} barSize={20}>
        <Comp />
      </ScatterChart>
    ));

    expect(spy).toHaveBeenCalledWith(100);
  });

  it("should provide height", () => {
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
      <ScatterChart width={100} height={50} barSize={20}>
        <Comp />
      </ScatterChart>
    ));

    expect(spy).toHaveBeenCalledWith(50);
  });
});

describe("Tooltip integration", () => {
  describe("with default Tooltip", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ScatterChart width={100} height={100} data={PageData}>
        <Scatter isAnimationActive={false} id="my-scatter" />
        <XAxis dataKey="uv" />
        <YAxis dataKey="pv" />
        <Tooltip isAnimationActive={false} />
        {props.children}
      </ScatterChart>
    ));

    it("should return tooltip payload", () => {
      // ScatterChart only allows item interaction
      const { spy } = renderTestCase((state) => selectTooltipPayload(state, "item", "hover", "0"));
      expectLastCalledWith(spy, [
        {
          color: undefined,
          dataKey: "uv",
          fill: undefined,
          graphicalItemId: "my-scatter",
          hide: false,
          name: "uv",
          nameKey: undefined,
          payload: {
            amt: 2400,
            name: "Page A",
            pv: 2400,
            uv: 400,
          },
          stroke: undefined,
          strokeWidth: undefined,
          type: undefined,
          unit: "",
          value: 400,
        },
        {
          color: undefined,
          dataKey: "pv",
          fill: undefined,
          graphicalItemId: "my-scatter",
          hide: false,
          name: "pv",
          nameKey: undefined,
          payload: {
            amt: 2400,
            name: "Page A",
            pv: 2400,
            uv: 400,
          },
          stroke: undefined,
          strokeWidth: undefined,
          type: undefined,
          unit: "",
          value: 2400,
        },
      ]);
    });

    it("should not render tooltip before user interaction", () => {
      const { container } = renderTestCase();
      expectTooltipNotVisible(container);
    });

    it("should render tooltip after mouse hover", () => {
      mockGetBoundingClientRect({ width: 10, height: 10 });
      const { container } = renderTestCase();
      showTooltip(container, scatterChartMouseHoverTooltipSelector);

      expectTooltipPayload(container, "", ["pv : 2400", "uv : 400"]);
      expectTooltipCoordinate(container, { x: 77.5, y: 30.6 });
    });
  });
});
