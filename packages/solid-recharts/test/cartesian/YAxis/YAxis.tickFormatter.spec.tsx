// Ported from recharts 3.8.1 test/cartesian/YAxis/YAxis.tickFormatter.spec.tsx (commit 7a23854).
import { flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Line, LineChart, YAxis } from "../../../src";
import { PageData } from "../../_data";
import { expectYAxisTicks } from "../../helper/expectAxisTicks";
import { render } from "../../helper/render";

describe("YAxis with custom tickFormatter", () => {
  it("should render ticks formatted with tickFormatter", () => {
    const tickFormatterSpy = vi.fn((value, index) => `formatted: ${value}: ${index}`);
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <YAxis type="category" dataKey="name" tickFormatter={tickFormatterSpy} />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();

    expectYAxisTicks(container, [
      { textContent: "formatted: Page A: 0", x: "72", y: "380" },
      { textContent: "formatted: Page B: 1", x: "72", y: "308" },
      { textContent: "formatted: Page C: 2", x: "72", y: "236" },
      { textContent: "formatted: Page D: 3", x: "72", y: "164" },
      { textContent: "formatted: Page E: 4", x: "72", y: "92" },
      { textContent: "formatted: Page F: 5", x: "72", y: "20" },
    ]);
  });

  it("should call the tickFormatter with the correct parameters", () => {
    const tickFormatterSpy = vi.fn((value, index) => `formatted: ${value}: ${index}`);
    render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <YAxis type="category" dataKey="name" tickFormatter={tickFormatterSpy} />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
      </LineChart>
    ));
    flush();

    expect(tickFormatterSpy).toHaveBeenCalled();
    expect(tickFormatterSpy).toHaveBeenCalledWith("Page A", 0);
    expect(tickFormatterSpy).toHaveBeenCalledWith("Page F", 5);
  });
});
