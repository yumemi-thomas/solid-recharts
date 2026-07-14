// Ported from recharts 3.8.1 test/polar/PolarAngleAxis/PolarAngleAxis.spec.tsx
// "events" describe. Solid deviation: recharts' userEvent → fireEvent on the tick
// <g> (`.recharts-polar-angle-axis-tick`); handlers keep the props-first
// (tickItem, index, event) signature.
import { describe, expect, it, vi } from "vitest";

import { PolarAngleAxis, PolarRadiusAxis, RadarChart } from "../../../src";
import type { TickItem } from "../../../src/util/types";
import { fireEvent, render } from "@solidjs/testing-library";
import { assertNotNull } from "../../helper/assertNotNull";

describe("PolarAngleAxis events", () => {
  it("fires the props-first (tickItem, index, event) handlers", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onMouseOver = vi.fn();
    const onMouseOut = vi.fn();
    const onMouseMove = vi.fn();
    const onTouchStart = vi.fn();
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();

    const { container } = render(() => (
      <RadarChart width={100} height={100} data={[{ x: 1, y: 1 }]}>
        <PolarRadiusAxis dataKey="x" />
        <PolarAngleAxis
          dataKey="y"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          onMouseOut={onMouseOut}
          onMouseMove={onMouseMove}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </RadarChart>
    ));
    const tick = container.querySelector(".recharts-polar-angle-axis-tick");
    assertNotNull(tick);

    const tickItem: TickItem = { coordinate: 90, index: 0, offset: 360, value: 1 };

    fireEvent.click(tick);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.mouseEnter(tick);
    expect(onMouseEnter).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.mouseLeave(tick);
    expect(onMouseLeave).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.mouseOver(tick);
    expect(onMouseOver).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.mouseOut(tick);
    expect(onMouseOut).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.mouseMove(tick);
    expect(onMouseMove).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.touchStart(tick);
    expect(onTouchStart).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.touchMove(tick);
    expect(onTouchMove).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));

    fireEvent.touchEnd(tick);
    expect(onTouchEnd).toHaveBeenLastCalledWith(tickItem, 0, expect.any(Object));
  });
});
