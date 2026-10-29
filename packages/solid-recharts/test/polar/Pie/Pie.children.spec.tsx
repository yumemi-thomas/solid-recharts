// Not a recharts port: pins how <Pie> mounts its children. recharts renders them once,
// inside SectorsWithAnimation, under a PolarLabelContextProvider fed by the first sector
// (vendor/recharts-reference/src/polar/Pie.tsx:1016-1026), so a data update keeps them
// mounted; and renders none at all while the Pie is hidden or has no sectors
// (:1071-1074, `if (hide || sectors == null) return <Layer … />`).
import { createEffect, createSignal, flush, onCleanup } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { Pie, PieChart } from "../../../src";
import { usePolarLabelContext } from "../../../src/component/Label";

const rows = (values: ReadonlyArray<number>): ReadonlyArray<{ name: string; value: number }> =>
  values.map((value, i) => ({ name: `Group ${i}`, value }));

function setup() {
  const mounted = vi.fn();
  const unmounted = vi.fn();
  const viewBox = vi.fn();
  // A child that records its lifecycle and the polar label context it is rendered under.
  const Probe = () => {
    mounted();
    onCleanup(unmounted);
    const polarViewBox = usePolarLabelContext();
    createEffect(
      () => polarViewBox(),
      (value) => viewBox(value),
    );
    return <text class="pie-child-probe">child</text>;
  };
  return { mounted, unmounted, viewBox, Probe };
}

describe("Pie children", () => {
  it("are mounted once and stay mounted while the data and the geometry update", () => {
    const { mounted, unmounted, viewBox, Probe } = setup();
    const [data, setData] = createSignal(rows([10, 20, 30]));
    const [cx, setCx] = createSignal(100);
    const [outerRadius, setOuterRadius] = createSignal(60);
    const { container } = render(() => (
      <PieChart width={400} height={300}>
        <Pie
          data={data()}
          dataKey="value"
          cx={cx()}
          cy={120}
          innerRadius={20}
          outerRadius={outerRadius()}
          isAnimationActive={false}
        >
          <Probe />
        </Pie>
      </PieChart>
    ));
    flush();

    const probe = container.querySelector(".pie-child-probe");
    expect(probe).not.toBeNull();
    // Created exactly once: not while the Pie has no sectors yet, not when they appear.
    expect(mounted).toHaveBeenCalledTimes(1);
    // The default 5px chart margin offsets the pie centre.
    expect(viewBox).toHaveBeenLastCalledWith(
      expect.objectContaining({ cx: 105, cy: 125, innerRadius: 20, outerRadius: 60 }),
    );

    setData(rows([30, 20, 10, 5]));
    flush();
    setCx(150);
    setOuterRadius(80);
    flush();

    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(container.querySelector(".pie-child-probe")).toBe(probe);
    // The label context still follows the first sector.
    expect(viewBox).toHaveBeenLastCalledWith(
      expect.objectContaining({ cx: 155, cy: 125, innerRadius: 20, outerRadius: 80 }),
    );
  });

  it("are not rendered while the Pie is hidden", () => {
    const { mounted, unmounted, Probe } = setup();
    const [hide, setHide] = createSignal(true);
    const { container } = render(() => (
      <PieChart width={400} height={300}>
        <Pie
          hide={hide()}
          data={rows([10, 20, 30])}
          dataKey="value"
          cx={100}
          cy={120}
          outerRadius={60}
          isAnimationActive={false}
        >
          <Probe />
        </Pie>
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-pie")).toHaveLength(1);
    expect(container.querySelectorAll(".pie-child-probe")).toHaveLength(0);
    expect(mounted).not.toHaveBeenCalled();

    setHide(false);
    flush();
    expect(container.querySelectorAll(".pie-child-probe")).toHaveLength(1);
    expect(mounted).toHaveBeenCalledTimes(1);

    setHide(true);
    flush();
    expect(container.querySelectorAll(".pie-child-probe")).toHaveLength(0);
    expect(unmounted).toHaveBeenCalledTimes(1);
  });

  it("are not rendered while the Pie has no sectors, and mount once they appear", () => {
    const { mounted, Probe } = setup();
    // All values are zero, so there is nothing to draw (`computePieSectors` yields no sectors).
    const [data, setData] = createSignal(rows([0, 0, 0]));
    const { container } = render(() => (
      <PieChart width={400} height={300}>
        <Pie
          data={data()}
          dataKey="value"
          cx={100}
          cy={120}
          outerRadius={60}
          isAnimationActive={false}
        >
          <Probe />
        </Pie>
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-pie")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(0);
    expect(container.querySelectorAll(".pie-child-probe")).toHaveLength(0);
    expect(mounted).not.toHaveBeenCalled();

    setData(rows([10, 20, 30]));
    flush();
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(3);
    expect(container.querySelectorAll(".pie-child-probe")).toHaveLength(1);
    expect(mounted).toHaveBeenCalledTimes(1);
  });
});
