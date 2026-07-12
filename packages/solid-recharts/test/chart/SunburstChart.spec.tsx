// Subset port of recharts 3.8.1 test/chart/SunburstChart.spec.tsx (commit 7a23854):
// the hierarchical radial chart draws one <Sector> per node (depth-first), each
// inheriting its parent's fill unless it sets its own. `flush()` because the chart
// size is reported via an effect (ReportChartSize) before the arcs compute.
import { describe, expect, it, vi } from "vitest";
import { createEffect, flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { SunburstChart } from "../../src";
import type { SunburstData } from "../../src";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";

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

  it("fires onMouseEnter, onMouseLeave and onClick with the hovered node", () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onClick = vi.fn();
    const { container } = render(() => (
      <SunburstChart
        width={500}
        height={500}
        data={data}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
    ));
    flush();

    const first = container.querySelector(".recharts-sector")!;
    fireEvent.mouseEnter(first);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    // The node passed back is the first child (Child1).
    expect(onMouseEnter.mock.calls[0]![0]).toMatchObject({ name: "Child1", tooltipIndex: "[0]" });

    fireEvent.mouseLeave(first);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(onMouseLeave.mock.calls[0]![0]).toMatchObject({ name: "Child1", tooltipIndex: "[0]" });

    fireEvent.click(first);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0]).toMatchObject({ name: "Child1", tooltipIndex: "[0]" });
  });

  it("does not call touch event callbacks", () => {
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();

    const { container } = render(() => (
      <SunburstChart
        width={500}
        height={500}
        // @ts-expect-error typescript is correct here - SunburstChart does not fire touch events
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data={data}
      />
    ));
    flush();

    const sector = container.querySelectorAll(".recharts-sector")[0]!;
    fireEvent.touchMove(sector, { touches: [{ clientX: 200, clientY: 200 }] });
    expect(onTouchMove).not.toHaveBeenCalled();
  });

  describe("SunburstChart layout context", () => {
    it("should provide viewBox but not clipPathId", () => {
      const clipPathSpy = vi.fn();
      const viewBoxSpy = vi.fn();
      const Comp = (): null => {
        clipPathSpy(useClipPathId());
        const viewBox = useViewBox();
        createEffect(
          () => viewBox(),
          (v) => viewBoxSpy(v),
        );
        return null;
      };
      render(() => (
        <SunburstChart width={100} height={50} data={data}>
          <Comp />
        </SunburstChart>
      ));
      flush();

      expect(clipPathSpy).toHaveBeenLastCalledWith(undefined);
      expect(viewBoxSpy).toHaveBeenLastCalledWith({ x: 0, y: 0, width: 100, height: 50 });
    });

    it("should set width and height in context", () => {
      const widthSpy = vi.fn();
      const heightSpy = vi.fn();
      const Comp = (): null => {
        const width = useChartWidth();
        const height = useChartHeight();
        createEffect(
          () => width(),
          (v) => widthSpy(v),
        );
        createEffect(
          () => height(),
          (v) => heightSpy(v),
        );
        return null;
      };
      render(() => (
        <SunburstChart width={100} height={50} data={data}>
          <Comp />
        </SunburstChart>
      ));
      flush();

      expect(widthSpy).toHaveBeenLastCalledWith(100);
      expect(heightSpy).toHaveBeenLastCalledWith(50);
    });
  });
});
