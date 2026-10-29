// Not a recharts port: pins how a parent item (Pie/Bar/…) collects its <Cell> children.
//
// recharts extracts cells by walking the element tree; here `collectCells` evaluates
// the children with a registrar active. Solid 2.0 creates a <For>'s rows lazily (on
// the first call of the accessor it returns), so the collector has to resolve its
// children, not just read them — otherwise <For>-rendered cells (the form the docs
// recommend) never register and every slice keeps the default fill.
import { describe, expect, it } from "vitest";
import { createSignal, flush, For } from "solid-js";
import { render } from "@solidjs/testing-library";
import { Cell, Pie, PieChart } from "../../src";

const colors = ["#e11111", "#11e111", "#1111e1", "#e1e111"];

const rows = (count: number): ReadonlyArray<{ name: string; value: number }> =>
  Array.from({ length: count }, (_unused, i) => ({ name: `Group ${i}`, value: 10 + i }));

const sectorFills = (container: HTMLElement): Array<string | null> =>
  [...container.querySelectorAll(".recharts-pie-sector .recharts-sector")].map((s) =>
    s.getAttribute("fill"),
  );

describe("collectCells", () => {
  it("collects <Cell>s rendered by a <For>", () => {
    const data = rows(3);
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie data={data} dataKey="value" isAnimationActive={false} fill="#808080">
          <For each={data}>{(_row, i) => <Cell fill={colors[i()]} />}</For>
        </Pie>
      </PieChart>
    ));
    flush();

    expect(sectorFills(container)).toEqual(colors.slice(0, 3));
  });

  it("collects <Cell>s from an array of elements", () => {
    const data = rows(3);
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie data={data} dataKey="value" isAnimationActive={false} fill="#808080">
          {/* eslint-disable-next-line solid/prefer-for -- the plain-array form is the one recharts uses and must keep working */}
          {data.map((_row, i) => (
            <Cell fill={colors[i]} />
          ))}
        </Pie>
      </PieChart>
    ));
    flush();

    expect(sectorFills(container)).toEqual(colors.slice(0, 3));
  });

  it("re-collects when the <For> list grows", () => {
    const [data, setData] = createSignal(rows(2));
    const { container } = render(() => (
      <PieChart width={400} height={400}>
        <Pie data={data()} dataKey="value" isAnimationActive={false} fill="#808080">
          <For each={data()}>{(_row, i) => <Cell fill={colors[i()]} />}</For>
        </Pie>
      </PieChart>
    ));
    flush();
    expect(sectorFills(container)).toEqual(colors.slice(0, 2));

    setData(rows(4));
    flush();

    expect(sectorFills(container)).toEqual(colors.slice(0, 4));
  });
});
