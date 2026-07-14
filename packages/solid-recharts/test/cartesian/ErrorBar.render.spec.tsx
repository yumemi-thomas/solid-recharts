// Spec for the ErrorBar vertical: whiskers render from a graphical item's data,
// and the error values extend the numerical axis domain (the un-deferred
// selectAllErrorBarSettings → getErrorDomainByDataKey path).
import { describe, expect, it } from "vitest";

import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, YAxis, ErrorBar } from "../../src";

const data = [
  { name: "A", uv: 50, err: 10 },
  { name: "B", uv: 100, err: 20 },
];

function yTickValues(container: Element): number[] {
  return Array.from(
    container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value"),
  )
    .map((t) => Number(t.textContent))
    .filter((n) => !Number.isNaN(n));
}

describe("<ErrorBar />", () => {
  it("renders one whisker group (3 lines) per data point", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={300}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 200]} />
        <Line dataKey="uv">
          <ErrorBar dataKey="err" />
        </Line>
      </LineChart>
    ));
    const groups = container.querySelectorAll(".recharts-errorBar");
    expect(groups).toHaveLength(data.length);
    // Each whisker is 3 lines (|--|): top serif, middle, bottom serif.
    expect(container.querySelectorAll(".recharts-errorBar line")).toHaveLength(data.length * 3);
  });

  it("extends the Y domain to include value ± error", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={300}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv">
          <ErrorBar dataKey="err" />
        </Line>
      </LineChart>
    ));
    // uv max is 100; with err=20 the error bar reaches 120, so the niced Y domain
    // must exceed 100 (proof the error values entered the domain computation).
    const ticks = yTickValues(container);
    expect(ticks.length).toBeGreaterThan(0);
    expect(Math.max(...ticks)).toBeGreaterThan(100);
  });
});
