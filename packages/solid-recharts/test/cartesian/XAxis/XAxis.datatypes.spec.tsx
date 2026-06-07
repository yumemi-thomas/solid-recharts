// Ported from recharts 3.8.1 test/cartesian/XAxis/XAxis.datatypes.spec.tsx (commit 7a23854).
import { flush } from "solid-js";
import { describe, it } from "vitest";
import { ComposedChart, XAxis } from "../../../src";
import { coordinateWithValueData, dateWithValueData, pageData, timeData } from "../../_data";
import { expectXAxisTicks } from "../../helper/expectAxisTicks";
import { render } from "../../helper/render";

const normalizedDateString = (date: Date): string =>
  date.toString().replace(/\(.*?\)/, "(Coordinated Universal Time)");
const dateTickText = (index: number): string => {
  const entry = timeData[index];
  if (entry == null) {
    throw new Error(`Missing timeData entry ${index}`);
  }
  return normalizedDateString(entry.x);
};

describe("XAxis with different data types", () => {
  it("should render string data correctly", () => {
    const { container } = render(() => (
      <ComposedChart width={600} height={50} data={pageData}>
        <XAxis dataKey="name" />
      </ComposedChart>
    ));
    flush();

    expectXAxisTicks(container, [
      { textContent: "Page A", x: "5", y: "23" },
      { textContent: "Page B", x: "103.33333333333333", y: "23" },
      { textContent: "Page C", x: "201.66666666666666", y: "23" },
      { textContent: "Page D", x: "300", y: "23" },
      { textContent: "Page E", x: "398.3333333333333", y: "23" },
      { textContent: "Page F", x: "496.66666666666663", y: "23" },
      { textContent: "Page G", x: "595", y: "23" },
    ]);
  });

  it("should render number data correctly", () => {
    const { container } = render(() => (
      <ComposedChart width={600} height={50} data={coordinateWithValueData}>
        <XAxis dataKey="x" domain={["auto", "auto"]} type="number" />
      </ComposedChart>
    ));
    flush();

    expectXAxisTicks(container, [
      { textContent: "0", x: "5", y: "23" },
      { textContent: "150", x: "152.5", y: "23" },
      { textContent: "300", x: "300", y: "23" },
      { textContent: "450", x: "447.5", y: "23" },
      { textContent: "600", x: "595", y: "23" },
    ]);
  });

  it("should render number data with time scale correctly", () => {
    const { container } = render(() => (
      <ComposedChart width={600} height={50} data={dateWithValueData}>
        <XAxis dataKey="time" domain={["auto", "auto"]} type="number" scale="time" />
      </ComposedChart>
    ));
    flush();

    expectXAxisTicks(container, [
      { textContent: "1483142400000", x: "5", y: "23" },
      { textContent: "1483146000000", x: "64", y: "23" },
      { textContent: "1483147800000", x: "93.5", y: "23" },
      { textContent: "1483149600000", x: "123", y: "23" },
      { textContent: "1483153200000", x: "182", y: "23" },
      { textContent: "1483155000000", x: "211.5", y: "23" },
      { textContent: "1483156800000", x: "241", y: "23" },
      { textContent: "1483160400000", x: "300", y: "23" },
      { textContent: "1483164000000", x: "359", y: "23" },
      { textContent: "1483167600000", x: "418", y: "23" },
      { textContent: "1483171200000", x: "477", y: "23" },
      { textContent: "1483173000000", x: "506.5", y: "23" },
      { textContent: "1483178400000", x: "595", y: "23" },
    ]);
  });

  it("should render Date data correctly", () => {
    const { container } = render(() => (
      <ComposedChart width={600} height={50} data={timeData}>
        <XAxis dataKey="x" />
      </ComposedChart>
    ));
    flush();

    expectXAxisTicks(container, [
      {
        textContent: dateTickText(0),
        x: "5",
        y: "23",
      },
      {
        textContent: dateTickText(1),
        x: "103.33333333333333",
        y: "23",
      },
      {
        textContent: dateTickText(2),
        x: "201.66666666666666",
        y: "23",
      },
      {
        textContent: dateTickText(3),
        x: "300",
        y: "23",
      },
      {
        textContent: dateTickText(4),
        x: "398.3333333333333",
        y: "23",
      },
      {
        textContent: dateTickText(5),
        x: "496.66666666666663",
        y: "23",
      },
      {
        textContent: dateTickText(6),
        x: "595",
        y: "23",
      },
    ]);
  });
});
