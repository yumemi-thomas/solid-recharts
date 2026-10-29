// Not a recharts port. recharts measures the axis `label` element (`labelRef`) next to
// the tick labels when an axis is sized with `height="auto"` / `width="auto"`
// (CartesianAxis `getCalculatedHeight` / `getCalculatedWidth`); the upstream specs
// only cover axes without a label, so the label case is pinned here.
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Bar, BarChart, XAxis, YAxis } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

const data = [
  { name: "Page A", amt: 2400 },
  { name: "Page B", amt: 1398 },
  { name: "Page C", amt: 9800 },
];

describe("auto-sized axes with a label", () => {
  it('adds the label height and the gap to a height="auto" XAxis', () => {
    // Every measured element is 30x80: tick 80 + tickSize 6 + tickMargin 2 + label 80 + gap 5.
    mockGetBoundingClientRect({ width: 30, height: 80 });
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data}>
        <XAxis dataKey="name" height="auto" label="Pages" />
        <Bar dataKey="amt" />
      </BarChart>
    ));
    flush();

    const line = container.querySelector(".xAxis line");
    assertNotNull(line);
    expect(line).toHaveAttribute("height", "173");
  });

  it('follows the label of a height="auto" XAxis as it is added and removed', () => {
    mockGetBoundingClientRect({ width: 30, height: 80 });
    const [label, setLabel] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data}>
        <XAxis dataKey="name" height="auto" label={label()} />
        <Bar dataKey="amt" />
      </BarChart>
    ));
    flush();
    const height = (): string | null | undefined =>
      container.querySelector(".xAxis line")?.getAttribute("height");

    // No label: tick 80 + tickSize 6 + tickMargin 2.
    expect(height()).toBe("88");

    setLabel("Pages");
    flush();
    expect(height()).toBe("173");

    setLabel(undefined);
    flush();
    expect(height()).toBe("88");
  });

  it('adds the label width and the gap to a width="auto" YAxis', () => {
    // tick 30 + tickSize 6 + tickMargin 2 + label 30 + gap 5.
    mockGetBoundingClientRect({ width: 30, height: 80 });
    const { container } = render(() => (
      <BarChart width={400} height={300} data={data}>
        <YAxis width="auto" label={{ value: "Amount", angle: -90 }} />
        <Bar dataKey="amt" />
      </BarChart>
    ));
    flush();

    const line = container.querySelector(".yAxis line");
    assertNotNull(line);
    expect(line).toHaveAttribute("width", "73");
  });
});
