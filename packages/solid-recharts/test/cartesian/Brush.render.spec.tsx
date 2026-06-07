// Spec for the Brush vertical: a <Brush> inside a cartesian chart renders the
// background + slide + two travellers + (interaction) text, reserves its height
// from the plot area, and — when a traveller/slide is dragged — narrows the data
// window via setDataStartEndIndexes (the main chart then re-filters its data).
// `flush()` because the brush registers settings + reads indices via effects.
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

// `pageX` isn't a MouseEventInit field (and testing-library doesn't assign it), so
// define it explicitly on a bubbling event — the Brush reads e.pageX (like recharts).
function mouseEventWithPageX(type: string, pageX: number): MouseEvent {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "pageX", { value: pageX, configurable: true });
  return ev;
}

describe("<Brush />", () => {
  it("renders the brush chrome (background, slide, two travellers)", () => {
    const { container } = render(() => (
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
    flush();

    const brush = container.querySelector(".recharts-brush");
    expect(brush).not.toBeNull();
    // background rect + slide + 2 travellers (each traveller draws a rect).
    expect(container.querySelectorAll(".recharts-brush-slide")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-brush-traveller")).toHaveLength(2);
  });

  it("reserves its height from the plot area (brush sits below the plot)", () => {
    const renderWith = (brush: boolean) =>
      render(() => (
        <LineChart
          width={400}
          height={300}
          data={data}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <XAxis dataKey="name" />
          <YAxis />
          <Line dataKey="uv" isAnimationActive={false} />
          {brush ? <Brush dataKey="name" height={40} /> : null}
        </LineChart>
      ));

    const without = renderWith(false);
    flush();
    const withBrush = renderWith(true);
    flush();

    // The plot-area clip rect height shrinks by ~the brush height (40).
    const clipHeight = (c: Element): number =>
      Number(c.querySelector("clipPath rect")?.getAttribute("height") ?? 0);
    expect(clipHeight(without.container) - clipHeight(withBrush.container)).toBeCloseTo(40, 0);
  });

  it("narrows the data window when the start traveller is dragged right", () => {
    const { container } = render(() => (
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
    flush();

    // Initially the full window → one dot per row.
    expect(dotCount(container)).toBe(data.length);

    const startTraveller = container.querySelectorAll(".recharts-brush-traveller")[0]!;
    // fireEvent.mouseDown triggers Solid's delegated onMouseDown (pageX 0), starting
    // the drag + attaching window capture listeners. A flush() is needed before the
    // window move so the "isTravellerMoving" signal is visible (in a browser these
    // are separate tasks). The window move/up carry an explicit pageX.
    fireEvent.mouseDown(startTraveller);
    flush();
    window.dispatchEvent(mouseEventWithPageX("mousemove", 300));
    window.dispatchEvent(mouseEventWithPageX("mouseup", 300));
    flush();

    // The window shrank → fewer dots than the full dataset.
    expect(dotCount(container)).toBeLessThan(data.length);
    expect(dotCount(container)).toBeGreaterThan(0);
  });
});
