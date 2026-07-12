// Spec for the stacks domain vertical: when bars share a stackId, the numerical
// (Y) axis domain extends to the STACK TOTAL, not just the per-series max — this
// exercises the un-deferred selectDomainOfStackGroups → combineNumericalDomain path.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { BarChart, Bar, XAxis, YAxis } from "../../src";

const data = [
  { name: "A", uv: 100, pv: 30 },
  { name: "B", uv: 60, pv: 50 },
];

function yTickValues(container: Element): number[] {
  return Array.from(
    container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value"),
  )
    .map((t) => Number(t.textContent))
    .filter((n) => !Number.isNaN(n));
}

describe("Bar stacking — axis domain", () => {
  it("extends the Y domain to the stack total when bars share a stackId", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="uv" stackId="a" />
        <Bar dataKey="pv" stackId="a" />
      </BarChart>
    ));
    flush();

    const ticks = yTickValues(container);
    expect(ticks.length).toBeGreaterThan(0);
    // Stacked totals are 130 and 110; the niced domain max must exceed the
    // single-series max (100) — proof the stack-group domain was included.
    expect(Math.max(...ticks)).toBeGreaterThan(100);
  });

  it("keeps the Y domain at the single-series max when bars are NOT stacked", () => {
    const { container } = render(() => (
      <BarChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="uv" />
        <Bar dataKey="pv" />
      </BarChart>
    ));
    flush();

    const ticks = yTickValues(container);
    // No stackId → domain spans only the data max (100), so the top tick is 100.
    expect(Math.max(...ticks)).toBe(100);
  });
});
