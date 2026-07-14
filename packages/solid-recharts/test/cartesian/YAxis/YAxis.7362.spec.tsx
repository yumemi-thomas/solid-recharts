// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.7362.spec.tsx (commit 7a23854).

import { describe, it } from "vitest";
import { Line, LineChart, XAxis, YAxis } from "../../../src";
import { selectAxisScale } from "../../../src/state/selectors/axisSelectors";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectYAxisTicks } from "../../helper/expectAxisTicks";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

type Datum = {
  name: string;
  value: number | null;
};

const explicitDomain = [0, 100] as const;
const explicitTicks = [0, 25, 50, 75, 100] as const;

const allNullData: ReadonlyArray<Datum> = [
  { name: "Page A", value: null },
  { name: "Page B", value: null },
  { name: "Page C", value: null },
  { name: "Page D", value: null },
];

const partlyNumericData: ReadonlyArray<Datum> = [
  { name: "Page A", value: null },
  { name: "Page B", value: 25 },
  { name: "Page C", value: null },
  { name: "Page D", value: 75 },
];

function renderIssue7362Chart(props: {
  data: ReadonlyArray<Datum>;
  ticks?: ReadonlyArray<number>;
  tickCount?: number;
}) {
  const renderTestCase = createSelectorTestCase((chartProps) => (
    <LineChart width={500} height={300} data={props.data}>
      <XAxis dataKey="name" />
      <YAxis
        type="number"
        domain={explicitDomain}
        allowDataOverflow
        ticks={props.ticks}
        tickCount={props.tickCount}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke="#8884d8"
        isAnimationActive={false}
        connectNulls
      />
      {chartProps.children}
    </LineChart>
  ));

  return renderTestCase((state) => selectAxisScale(state, "yAxis", 0, false)?.domain());
}

const expectedTicks = [
  { textContent: "0", x: "57", y: "265" },
  { textContent: "25", x: "57", y: "200" },
  { textContent: "50", x: "57", y: "135" },
  { textContent: "75", x: "57", y: "70" },
  { textContent: "100", x: "57", y: "5" },
];

describe("YAxis issue 7362 current behavior", () => {
  it("renders the explicit tick ladder for all-null series data when ticks are supplied", () => {
    const { container, spy } = renderIssue7362Chart({ data: allNullData, ticks: explicitTicks });
    expectLastCalledWith(spy, [0, 100]);
    expectYAxisTicks(container, expectedTicks);
  });

  it("renders the computed tick ladder for all-null series data when tickCount is supplied", () => {
    const { container, spy } = renderIssue7362Chart({ data: allNullData, tickCount: 5 });
    expectLastCalledWith(spy, [0, 100]);
    expectYAxisTicks(container, expectedTicks);
  });

  it("renders the explicit tick ladder for empty data when the Y axis is fully specified", () => {
    const { container, spy } = renderIssue7362Chart({ data: [], ticks: explicitTicks });
    expectLastCalledWith(spy, [0, 100]);
    expectYAxisTicks(container, expectedTicks);
  });

  it("renders the explicit tick ladder again as soon as the series contains numeric values", () => {
    const { container, spy } = renderIssue7362Chart({
      data: partlyNumericData,
      ticks: explicitTicks,
    });
    expectLastCalledWith(spy, [0, 100]);
    expectYAxisTicks(container, expectedTicks);
  });
});
