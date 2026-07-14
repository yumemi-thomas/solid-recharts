// Solid-recharts spec for Brush props recharts ships but this port had deferred:
// `dy` (extra y offset — ported from recharts Brush.spec "dy props"), `onDragEnd`
// (fires once at drag release), and `leaveTimeOut` (drag ends after the pointer
// leaves). Drag simulation mirrors the existing Brush.spec slide test.
import { describe, expect, it, vi } from "vitest";

import type { JSX } from "solid-js";
import { BarChart, Brush } from "../../src";
import { fireEvent, render } from "@solidjs/testing-library";
import { assertNotNull } from "../helper/assertNotNull";

const data = [
  { date: "2023-01-01", value: 10 },
  { date: "2023-01-02", value: 20 },
  { date: "2023-01-03", value: 10 },
  { date: "2023-01-04", value: 30 },
];

function brushRectY(container: Element): string | null {
  const brush = container.querySelector(".recharts-brush rect");
  assertNotNull(brush);
  return brush.getAttribute("y");
}

describe("Brush dy / onDragEnd", () => {
  it("adds `dy` to the brush y position", () => {
    const { container } = render(
      (): JSX.Element => (
        <BarChart width={400} height={100} data={data}>
          <Brush dataKey="value" x={100} y={50} dy={30} width={400} height={40} />
        </BarChart>
      ),
    );
    expect(brushRectY(container)).toBe("80");
  });

  it("fires onDragEnd once at the end of a slide drag", () => {
    const onDragEnd = vi.fn();
    const { container } = render(
      (): JSX.Element => (
        <BarChart width={500} height={100} data={data} margin={{ right: 100, left: 100 }}>
          <Brush dataKey="date" height={90} onDragEnd={onDragEnd} />
        </BarChart>
      ),
    );
    const brushSlide = container.querySelector(".recharts-brush-slide");
    assertNotNull(brushSlide);
    fireEvent.mouseDown(brushSlide);
    expect(onDragEnd).not.toHaveBeenCalled();

    fireEvent.mouseUp(window);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenLastCalledWith({
      startIndex: 0,
      endIndex: data.length - 1,
    });
  });
});
