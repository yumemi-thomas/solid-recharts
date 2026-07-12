// Solid-recharts spec: PolarRadiusAxis forwards its per-tick mouse handlers
// (props-first `(tickItem, index, event)`). recharts declares these but does not
// unit-test them; behaviour mirrors the PolarAngleAxis events.
import { describe, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { PolarAngleAxis, PolarRadiusAxis, RadarChart } from "../../src";
import { fireEvent, render } from "../helper/render";
import { assertNotNull } from "../helper/assertNotNull";

describe("PolarRadiusAxis events", () => {
  it("fires the props-first (tickItem, index, event) mouse handlers", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const onMouseOver = vi.fn();
    const onMouseOut = vi.fn();
    const onMouseMove = vi.fn();
    const onMouseDown = vi.fn();
    const onMouseUp = vi.fn();

    const { container } = render(() => (
      <RadarChart width={300} height={300} data={[{ x: 1, y: 1 }]}>
        <PolarAngleAxis dataKey="y" />
        <PolarRadiusAxis
          dataKey="x"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          onMouseOut={onMouseOut}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        />
      </RadarChart>
    ));
    flush();

    const tick = container.querySelector(".recharts-polar-radius-axis-tick");
    assertNotNull(tick);

    fireEvent.click(tick);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenLastCalledWith(
      expect.objectContaining({ index: 0 }),
      0,
      expect.any(Object),
    );

    fireEvent.mouseEnter(tick);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(tick);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    fireEvent.mouseOver(tick);
    expect(onMouseOver).toHaveBeenCalledTimes(1);
    fireEvent.mouseOut(tick);
    expect(onMouseOut).toHaveBeenCalledTimes(1);
    fireEvent.mouseMove(tick);
    expect(onMouseMove).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(tick);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    fireEvent.mouseUp(tick);
    expect(onMouseUp).toHaveBeenCalledTimes(1);
  });
});
