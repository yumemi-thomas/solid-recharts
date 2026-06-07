// Subset port of recharts 3.8.1 test/chart/SunburstChart.spec.tsx (commit 7a23854):
// the hierarchical radial chart draws one <Sector> per node (depth-first), each
// inheriting its parent's fill unless it sets its own. `flush()` because the chart
// size is reported via an effect (ReportChartSize) before the arcs compute.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { SunburstChart } from "../../src";
import type { SunburstData } from "../../src";

const data: SunburstData = {
  name: "Root",
  value: 100,
  children: [
    { name: "Child1", fill: "#264653", value: 30, children: [{ name: "third child", value: 10 }] },
    {
      name: "Child2",
      fill: "#2a9d8f",
      value: 20,
      children: [{ name: "another child", value: 10 }],
    },
    { name: "Child3", fill: "#e9c46a", value: 20 },
  ],
};

describe("<SunburstChart />", () => {
  it("renders each sector depth-first, inheriting the parent fill", () => {
    const { container } = render(() => <SunburstChart width={500} height={500} data={data} />);
    flush();

    const sectors = container.querySelectorAll(".recharts-sector");
    // Child1, its child (inherits), Child2, its child (inherits), Child3.
    expect(sectors).toHaveLength(5);
    expect(sectors[0]).toHaveAttribute("fill", "#264653");
    expect(sectors[1]).toHaveAttribute("fill", "#264653");
    expect(sectors[2]).toHaveAttribute("fill", "#2a9d8f");
    expect(sectors[3]).toHaveAttribute("fill", "#2a9d8f");
    expect(sectors[4]).toHaveAttribute("fill", "#e9c46a");
  });

  it("fires onMouseEnter and onClick with the hovered node", () => {
    const onMouseEnter = vi.fn();
    const onClick = vi.fn();
    const { container } = render(() => (
      <SunburstChart
        width={500}
        height={500}
        data={data}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      />
    ));
    flush();

    const first = container.querySelector(".recharts-sector")!;
    fireEvent.mouseEnter(first);
    fireEvent.click(first);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    // The node passed back is the first child (Child1).
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "Child1", tooltipIndex: "[0]" });
  });
});
