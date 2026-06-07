// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.7362.derivedDomain.spec.tsx (commit 7a23854).
import { describe, it } from "vitest";
import { Line, LineChart, XAxis, YAxis } from "../../../src";
import type { AxisDomain } from "../../../src/util/types";
import { expectYAxisTicks } from "../../helper/expectAxisTicks";
import { render } from "../../helper/render";

type Datum = {
  name: string;
  value: number | null;
};

const explicitTicks = [0, 25, 50, 75, 100];
const ladder = [
  { textContent: "0", x: "57", y: "265" },
  { textContent: "25", x: "57", y: "200" },
  { textContent: "50", x: "57", y: "135" },
  { textContent: "75", x: "57", y: "70" },
  { textContent: "100", x: "57", y: "5" },
];

const allNullData: ReadonlyArray<Datum> = [
  { name: "Page A", value: null },
  { name: "Page B", value: null },
  { name: "Page C", value: null },
  { name: "Page D", value: null },
];

function renderChart(props: { data: ReadonlyArray<Datum>; domain: AxisDomain }) {
  return render(() => (
    <LineChart width={500} height={300} data={props.data}>
      <XAxis dataKey="name" />
      <YAxis type="number" domain={props.domain} allowDataOverflow ticks={explicitTicks} />
      <Line
        type="monotone"
        dataKey="value"
        stroke="#8884d8"
        isAnimationActive={false}
        connectNulls
      />
    </LineChart>
  ));
}

const functionUpperBound: AxisDomain = [
  0,
  (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? dataMax : 100),
];
const wholeDomainFunction: AxisDomain = () => [0, 100];

describe("YAxis issue 7362 — function domain should render ticks when data is empty/all-null", () => {
  it.fails("renders the ladder for all-null data with a function upper-bound domain", () => {
    const { container } = renderChart({ data: allNullData, domain: functionUpperBound });
    expectYAxisTicks(container, ladder);
  });

  it.fails("renders the ladder for empty data with a function upper-bound domain", () => {
    const { container } = renderChart({ data: [], domain: functionUpperBound });
    expectYAxisTicks(container, ladder);
  });

  it.fails("renders the ladder for all-null data with a whole-domain function", () => {
    const { container } = renderChart({ data: allNullData, domain: wholeDomainFunction });
    expectYAxisTicks(container, ladder);
  });
});
