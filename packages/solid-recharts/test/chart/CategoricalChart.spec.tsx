// Ported from recharts 3.8.1 test/chart/CategoricalChart.spec.tsx.
//
// Harness adaptations: React render -> Solid `render(() => <…/>)`; @testing-library/react
// fireEvent/act -> the repo's `fireEvent` + `flush()` from solid-js (the external
// mouse handlers are NOT throttled by default, so they dispatch synchronously —
// recharts' `act(() => vi.runOnlyPendingTimers())` drains throttled events; here a
// `flush()` settles the Solid graph). `rechartsTestRender` -> the repo's `render`.
import type { JSX } from "@solidjs/web";
import { flush } from "solid-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  Area,
  AreaChart,
  ComposedChart,
  Funnel,
  FunnelChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { assertNotNull } from "../helper/assertNotNull";
import { fireEvent, render } from "../helper/render";

type WrapperProps = {
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: () => void;
};

const data = [
  { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
  { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
  { name: "Page D", uv: 200, pv: 9800, amt: 2400 },
  { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
  { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
];

const funnelData1 = [
  { value: 100, name: "展现" },
  { value: 80, name: "点击" },
  { value: 50, name: "访问" },
  { value: 40, name: "咨询" },
  { value: 26, name: "订单" },
];

const funnelData2 = [
  { value: 60, name: "展现" },
  { value: 50, name: "点击" },
  { value: 30, name: "访问" },
  { value: 20, name: "咨询" },
  { value: 6, name: "订单" },
];

const commonChartProps = {
  data,
  width: 300,
  height: 300,
};

type CategoricalChartTestCase = {
  name: string;
  Wrapper: (props: WrapperProps) => JSX.Element;
};

const AreaChartTestCase: CategoricalChartTestCase = {
  name: "AreaChart",
  Wrapper: (props) => (
    <AreaChart
      {...commonChartProps}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
    </AreaChart>
  ),
};

const ComposedChartTestCase: CategoricalChartTestCase = {
  name: "ComposedChart",
  Wrapper: (props) => (
    <ComposedChart
      {...commonChartProps}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Area type="monotone" dataKey="uv" stroke="#ff7300" fill="#ff7300" />
      <Line type="monotone" dataKey="uv" stroke="#00EE00" />
    </ComposedChart>
  ),
};

const FunnelChartTestCase: CategoricalChartTestCase = {
  name: "FunnelChart",
  Wrapper: (props) => (
    <FunnelChart
      {...commonChartProps}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Funnel dataKey="uv" data={funnelData1} />
      <Funnel dataKey="uv" data={funnelData2} />
    </FunnelChart>
  ),
};

const LineChartTestCase: CategoricalChartTestCase = {
  name: "LineChart",
  Wrapper: (props) => (
    <LineChart
      {...commonChartProps}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Line type="monotone" dataKey="uv" stroke="#ff7300" />
    </LineChart>
  ),
};

const PieChartTestCase: CategoricalChartTestCase = {
  name: "PieChart",
  Wrapper: (props) => (
    <PieChart
      width={300}
      height={300}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Pie
        dataKey="uv"
        isAnimationActive
        data={data}
        cx={200}
        cy={200}
        outerRadius={80}
        fill="#ff7300"
      />
    </PieChart>
  ),
};

const RadarChartTestCase: CategoricalChartTestCase = {
  name: "RadarChart",
  Wrapper: (props) => (
    <RadarChart
      {...commonChartProps}
      cx={300}
      cy={250}
      outerRadius={150}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <Radar isAnimationActive={false} dataKey="uv" />
    </RadarChart>
  ),
};

const RadialBarChartTestCase: CategoricalChartTestCase = {
  name: "RadialBarChart",
  Wrapper: (props) => (
    <RadialBarChart
      {...commonChartProps}
      cx={150}
      cy={150}
      innerRadius={20}
      outerRadius={140}
      barSize={10}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
    >
      <RadialBar dataKey="uv" isAnimationActive={false} />
    </RadialBarChart>
  ),
};

const ScatterChartTestCase: CategoricalChartTestCase = {
  name: "ScatterChart",
  Wrapper: (props) => (
    <ScatterChart
      width={400}
      height={400}
      onContextMenu={props.onContextMenu}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
    >
      <XAxis dataKey="uv" name="stature" unit="cm" />
      <YAxis dataKey="pv" name="weight" unit="kg" />
      <Scatter line name="A school" data={data} fill="#ff7300" />
    </ScatterChart>
  ),
};

const testCases = [
  AreaChartTestCase,
  ComposedChartTestCase,
  FunnelChartTestCase,
  LineChartTestCase,
  PieChartTestCase,
  RadarChartTestCase,
  RadialBarChartTestCase,
  ScatterChartTestCase,
];

describe("CategoricalChart", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ height: 50, width: 50 });
  });

  describe.each(testCases)("$name", ({ Wrapper }) => {
    test("should call corresponding callback on mouse events", () => {
      const handleClickMock = vi.fn();
      handleClickMock.mockName("handleClickMock");
      const handleDoubleClickMock = vi.fn();
      const handleContextMenuMock = vi.fn();

      const { container } = render(() => (
        <Wrapper
          onClick={handleClickMock}
          onDoubleClick={handleDoubleClickMock}
          onContextMenu={handleContextMenuMock}
        />
      ));

      const surface = container.querySelector(".recharts-wrapper");
      assertNotNull(surface);
      fireEvent.click(surface);
      fireEvent.doubleClick(surface);
      fireEvent.contextMenu(surface);

      flush();

      expect(handleClickMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
      expect(handleDoubleClickMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
      expect(handleContextMenuMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });
  });
});
