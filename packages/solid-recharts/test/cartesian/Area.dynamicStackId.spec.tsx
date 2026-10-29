// Not a recharts port: like <Bar>, an <Area>'s `stackId` must follow its prop at
// runtime (recharts re-reads it on every render).
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Area, AreaChart, XAxis, YAxis } from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

const data = [
  { name: "A", uv: 400, pv: 240 },
  { name: "B", uv: 300, pv: 139 },
  { name: "C", uv: 200, pv: 980 },
];

function areaPaths(container: Element): ReadonlyArray<string | null> {
  return Array.from(container.querySelectorAll(".recharts-area-area")).map((path) =>
    path.getAttribute("d"),
  );
}

describe("<Area /> stackId", () => {
  it("re-stacks the areas when stackId changes at runtime", () => {
    mockGetBoundingClientRect({ width: 300, height: 300 });
    const [stackId, setStackId] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <AreaChart width={300} height={300} data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Area dataKey="uv" stackId={stackId()} isAnimationActive={false} />
        <Area dataKey="pv" stackId={stackId()} isAnimationActive={false} />
      </AreaChart>
    ));
    flush();
    const unstacked = areaPaths(container);
    expect(unstacked).toHaveLength(2);

    setStackId("a");
    flush();
    const stacked = areaPaths(container);
    expect(stacked[1]).not.toBe(unstacked[1]);

    setStackId(undefined);
    flush();
    expect(areaPaths(container)).toEqual(unstacked);
  });
});
