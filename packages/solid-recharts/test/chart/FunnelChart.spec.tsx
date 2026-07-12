// Subset port of recharts 3.8.1 test/chart/FunnelChart.spec.tsx (commit 7a23854):
// a <Funnel> in a FunnelChart renders one trapezoid per data row, stacked widest →
// narrowest. `isAnimationActive={false}` so trapezoids are at final geometry;
// `flush()` because the funnel resolves trapezoids from the store via a selector.
//
// Also ported: the FunnelChart layout-context block (viewBox/clipPathId/width/height,
// via createSelectorTestCase + a value-spy) and the chart-level `onClick` event-fire
// case. The mouseEnter/mouseMove/mouseLeave chart-level cases are PERMANENT-N/A
// (non-bubbling wrapper-div handlers; see the note at that test).
//
// Per-trapezoid `name` attribute is deferred in the minimal port (see Funnel.tsx),
// so that reference assertion is intentionally omitted.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { FunnelChart, Funnel, Tooltip, Cell } from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { useChartHeight, useChartWidth, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";

const data = [
  { value: 100, name: "Show" },
  { value: 80, name: "Click" },
  { value: 50, name: "Visit" },
  { value: 40, name: "Inquiry" },
  { value: 26, name: "Order" },
];

// Upper-side width of each rendered trapezoid path (first horizontal segment:
// "M x,y L x+upper,y ..." → upper = second x minus first x).
function upperWidths(container: Element): number[] {
  return [...container.querySelectorAll(".recharts-trapezoid")].map((p) => {
    const d = p.getAttribute("d") ?? "";
    const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return (nums[2] ?? 0) - (nums[0] ?? 0); // x1 - x0
  });
}

describe("<FunnelChart />", () => {
  it("renders one trapezoid per data row", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} isAnimationActive={false} />
      </FunnelChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-trapezoids")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-funnel-trapezoid")).toHaveLength(data.length);
    expect(container.querySelectorAll(".recharts-trapezoid")).toHaveLength(data.length);
  });

  it("stacks trapezoids widest → narrowest (funnel shape)", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} isAnimationActive={false} />
      </FunnelChart>
    ));
    flush();

    const widths = upperWidths(container);
    expect(widths).toHaveLength(data.length);
    // Strictly decreasing: each row's value (100,80,50,40,26) is smaller than the last.
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeLessThan(widths[i - 1]!);
    }
  });

  it("renders two stacked funnels when nested", () => {
    const data02 = [
      { value: 60, name: "Show" },
      { value: 50, name: "Click" },
      { value: 30, name: "Visit" },
    ];
    const { container } = render(() => (
      <FunnelChart width={500} height={300} margin={{ top: 20, right: 50, left: 20, bottom: 0 }}>
        <Funnel dataKey="value" data={data} isAnimationActive={false} />
        <Funnel dataKey="value" data={data02} isAnimationActive={false} width="80%" />
      </FunnelChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-trapezoids")).toHaveLength(2);
    expect(container.querySelectorAll(".recharts-funnel-trapezoid")).toHaveLength(
      data.length + data02.length,
    );
  });

  it("colors each trapezoid from its matching <Cell>", () => {
    const colors = ["#a00", "#0a0", "#00a", "#aa0", "#0aa"];
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} fill="#888" isAnimationActive={false}>
          {data.map((_d, i) => (
            <Cell fill={colors[i]} />
          ))}
        </Funnel>
      </FunnelChart>
    ));
    flush();

    const fills = [...container.querySelectorAll(".recharts-trapezoid")].map((p) =>
      p.getAttribute("fill"),
    );
    expect(fills).toEqual(colors);
  });

  it("activates an item tooltip when a trapezoid is hovered", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" nameKey="name" data={data} isAnimationActive={false} />
        <Tooltip />
      </FunnelChart>
    ));
    flush();

    const trapezoids = container.querySelectorAll(".recharts-funnel-trapezoid");
    fireEvent.mouseEnter(trapezoids[1]!);
    flush();

    const values = [...container.querySelectorAll(".recharts-tooltip-item-value")].map(
      (n) => n.textContent,
    );
    expect(values).toEqual(["80"]); // second row's value
  });

  it("renders a custom trapezoid via the shape render prop", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel
          dataKey="value"
          data={data}
          isAnimationActive={false}
          shape={(item) => <circle class="custom-trap" data-name={item.name} />}
        />
      </FunnelChart>
    ));
    flush();

    // No default trapezoids; one custom circle per row, still wrapped per trapezoid.
    expect(container.querySelectorAll(".recharts-trapezoid")).toHaveLength(0);
    expect(container.querySelectorAll("circle.custom-trap")).toHaveLength(data.length);
    expect(container.querySelector("circle.custom-trap[data-name='Show']")).not.toBeNull();
  });

  // Ported from recharts' `forEach([onClick, onMouseEnter, onMouseMove, onMouseLeave])`
  // chart-level event test. Only the `click` case is portable: a trapezoid click
  // bubbles to the chart surface and fires the FunnelChart-level onClick (wired in
  // RechartsWrapper). The mouseEnter / mouseMove / mouseLeave cases are PERMANENT-N/A:
  // RechartsWrapper attaches those directly on the wrapper div (native, non-bubbling
  // for enter/leave; the wrapper isn't on the bubble path for a descendant move that
  // the React reference catches via synthetic-event delegation) — probe-verified 0
  // calls, same conclusion as chartEvents.spec. Funnel ALSO exposes per-trapezoid
  // onMouseEnter/Leave/Move handlers (fired on the trapezoid itself); those are
  // exercised by the typed spec + the item-tooltip hover case above.
  const data02 = [
    { value: 60, name: "Show" },
    { value: 50, name: "Click" },
    { value: 30, name: "Visit" },
    { value: 20, name: "Inquiry" },
    { value: 6, name: "Order" },
  ];

  it("should fire click event", () => {
    const onEventMock = vi.fn();
    const { container } = render(() => (
      <FunnelChart
        margin={{ top: 20, right: 50, left: 20, bottom: 0 }}
        width={500}
        height={300}
        onClick={onEventMock}
      >
        <Funnel dataKey="value" data={data} isAnimationActive={false} />
        <Funnel dataKey="value" data={data02} isAnimationActive={false} width="80%" />
      </FunnelChart>
    ));
    flush();

    const trapezoid = container.querySelectorAll(".recharts-funnel-trapezoid")[2];
    expect(trapezoid).toBeDefined();
    fireEvent.click(trapezoid!);
    flush();

    expect(onEventMock).toHaveBeenCalled();
  });

  describe("FunnelChart layout context", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <FunnelChart width={100} height={50} barSize={20}>
        {props.children}
      </FunnelChart>
    ));

    it("should provide viewBox", () => {
      const { spy } = renderTestCase(useViewBox);
      expectLastCalledWith(spy, { height: 40, width: 90, x: 5, y: 5 });
    });

    it("should provide clipPathId", () => {
      const { spy } = renderTestCase(useClipPathId);
      expectLastCalledWith(spy, expect.stringMatching(/recharts\d+-clip/));
    });

    it("should provide width", () => {
      const { spy } = renderTestCase(useChartWidth);
      expectLastCalledWith(spy, 100);
    });

    it("should provide height", () => {
      const { spy } = renderTestCase(useChartHeight);
      expectLastCalledWith(spy, 50);
    });
  });
});
