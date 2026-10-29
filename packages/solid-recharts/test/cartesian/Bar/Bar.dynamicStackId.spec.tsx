// Not a recharts port. recharts re-renders a <Bar> and re-reads `stackId` every
// time, so toggling it re-stacks the bars. Solid components run once, so the prop
// has to be read reactively; this pins that (it used to be resolved at creation).
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Bar, BarChart, BarStack, XAxis, YAxis } from "../../../src";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";

const data = [
  { name: "A", uv: 400, pv: 240 },
  { name: "B", uv: 300, pv: 139 },
];

/** The x of the first rectangle of each `.recharts-bar` (stacked bars share it). */
function firstBarXs(container: Element): ReadonlyArray<number> {
  return Array.from(container.querySelectorAll(".recharts-bar")).map((bar) => {
    const d = bar.querySelector(".recharts-bar-rectangle path")?.getAttribute("d") ?? "";
    return Number(d.replace(/^M\s*/, "").split(/[ ,]/)[0]);
  });
}

describe("<Bar /> stackId", () => {
  it("re-stacks the bars when stackId changes at runtime", () => {
    mockGetBoundingClientRect({ width: 300, height: 300 });
    const [stackId, setStackId] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <BarChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="uv" stackId={stackId()} isAnimationActive={false} />
        <Bar dataKey="pv" stackId={stackId()} isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const grouped = firstBarXs(container);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).not.toBe(grouped[1]);

    setStackId("a");
    flush();
    const stacked = firstBarXs(container);
    expect(stacked[0]).toBe(stacked[1]);

    setStackId(undefined);
    flush();
    expect(firstBarXs(container)).toEqual(grouped);
  });

  it("keeps the stack of a <BarStack /> parent", () => {
    mockGetBoundingClientRect({ width: 300, height: 300 });
    const { container } = render(() => (
      <BarChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <BarStack>
          <Bar dataKey="uv" isAnimationActive={false} />
          <Bar dataKey="pv" isAnimationActive={false} />
        </BarStack>
      </BarChart>
    ));
    flush();
    const xs = firstBarXs(container);
    expect(xs[0]).toBe(xs[1]);
  });
});
