// Not a recharts port. recharts takes `data` as a new array; in Solid the natural input
// is a store that is edited in place. The chart reads such data at its boundary
// (`trackData`: `deep()` in the compute phase), so an edit or a push in the store
// reaches it like a new `data` prop — and the apply phase never reads the store
// untracked (the global diagnostics guard fails the test if it does).
import { createStore, flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from "../../src";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";

type Row = { name: string; uv: number };

const initialRows = (): Row[] => [
  { name: "a", uv: 10 },
  { name: "b", uv: 20 },
  { name: "c", uv: 30 },
];

describe("a Solid store as chart data", () => {
  it("re-renders a LineChart on a row edit and on a push", () => {
    mockGetBoundingClientRect({ width: 400, height: 400 });
    const [rows, setRows] = createStore<Row[]>(initialRows());
    const { container } = render(() => (
      <LineChart width={400} height={400} data={rows}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
      </LineChart>
    ));
    flush();
    const curve = (): string | null | undefined =>
      container.querySelector(".recharts-line-curve")?.getAttribute("d");
    const dots = (): number => container.querySelectorAll(".recharts-line-dot").length;
    const before = curve();
    expect(dots()).toBe(3);

    setRows((draft) => {
      const first = draft[0];
      if (first) {
        first.uv = 100;
      }
    });
    flush();
    const edited = curve();
    expect(edited).not.toBe(before);
    expect(dots()).toBe(3);

    setRows((draft) => {
      draft.push({ name: "d", uv: 5 });
    });
    flush();
    expect(curve()).not.toBe(edited);
    expect(dots()).toBe(4);
  });

  it("re-renders a Bar with its own store-backed data", () => {
    mockGetBoundingClientRect({ width: 400, height: 400 });
    const [rows, setRows] = createStore<Row[]>(initialRows());
    const { container } = render(() => (
      <BarChart width={400} height={400}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar data={rows} dataKey="uv" isAnimationActive={false} />
      </BarChart>
    ));
    flush();
    const bars = (): number => container.querySelectorAll(".recharts-bar-rectangle").length;
    expect(bars()).toBe(3);

    setRows((draft) => {
      draft.push({ name: "d", uv: 5 });
    });
    flush();
    expect(bars()).toBe(4);
  });
});
