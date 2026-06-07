// Brush accessibility/mobile: ArrowLeft/Right on a focused traveller moves it one
// data index; touch drag mirrors mouse drag. `flush()` because the index change
// dispatches through the store before the chart re-filters (separate tasks in a
// real browser; here we flush manually).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { LineChart, Line, XAxis, YAxis, Brush } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
  { name: "D", uv: 70 },
  { name: "E", uv: 40 },
  { name: "F", uv: 20 },
];

function dotCount(container: Element): number {
  return container.querySelectorAll(".recharts-line .recharts-line-dot").length;
}

function touchEvent(type: string, pageX: number): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "changedTouches", { value: [{ pageX }], configurable: true });
  return e;
}

const renderBrushChart = () =>
  render(() => (
    <LineChart
      width={400}
      height={300}
      data={data}
      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
    >
      <XAxis dataKey="name" />
      <YAxis />
      <Line dataKey="uv" isAnimationActive={false} dot />
      <Brush dataKey="name" height={40} />
    </LineChart>
  ));

describe("<Brush /> keyboard", () => {
  it("ArrowRight on the start traveller advances the window start by one index", () => {
    const { container } = renderBrushChart();
    flush();
    expect(dotCount(container)).toBe(data.length);

    const startTraveller = container.querySelectorAll(".recharts-brush-traveller")[0]!;
    fireEvent.focus(startTraveller);
    fireEvent.keyDown(startTraveller, { key: "ArrowRight" });
    flush();

    // Window narrowed from the left by one row.
    expect(dotCount(container)).toBe(data.length - 1);
  });

  it("ArrowLeft at the start edge is a no-op (cannot go below index 0)", () => {
    const { container } = renderBrushChart();
    flush();

    const startTraveller = container.querySelectorAll(".recharts-brush-traveller")[0]!;
    fireEvent.keyDown(startTraveller, { key: "ArrowLeft" });
    flush();

    expect(dotCount(container)).toBe(data.length);
  });
});

describe("<Brush /> touch", () => {
  it("narrows the window when the start traveller is touch-dragged right", () => {
    const { container } = renderBrushChart();
    flush();
    expect(dotCount(container)).toBe(data.length);

    const startTraveller = container.querySelectorAll(".recharts-brush-traveller")[0]!;
    // touchStart begins the drag (pageX 5); window touchmove/touchend carry pageX.
    fireEvent.touchStart(startTraveller, { changedTouches: [{ pageX: 5 }] });
    flush();
    window.dispatchEvent(touchEvent("touchmove", 300));
    window.dispatchEvent(touchEvent("touchend", 300));
    flush();

    expect(dotCount(container)).toBeLessThan(data.length);
    expect(dotCount(container)).toBeGreaterThan(0);
  });
});
