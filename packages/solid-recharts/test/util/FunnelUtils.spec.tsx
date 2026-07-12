// Ported from recharts 3.8.1 test/util/FunnelUtils.spec.tsx (commit 7a23854).
//
// <FunnelTrapezoid> renders the funnel shape through the shared <Shape> helper:
// when `isActive` is true the wrapping <g> carries `recharts-active-shape`.
// `render(<svg>...)` from React → Solid's `render(() => <svg>...)`. The Solid
// <Shape>/<Layer> emits `<g class="recharts-layer recharts-active-shape">`, so
// `toHaveClass('recharts-active-shape')` (substring-class match) still holds.
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { FunnelTrapezoid, type FunnelTrapezoidProps } from "../../src/util/FunnelUtils";
import type { Coordinate, TrapezoidViewBox } from "../../src/util/types";

describe("funnelUtils", () => {
  const mockTooltipPosition: Coordinate = { x: 10, y: 10 };

  const viewBox: TrapezoidViewBox = {
    x: 0,
    y: 0,
    upperWidth: 0,
    lowerWidth: 0,
    width: 0,
    height: 0,
  };
  const mockProps: FunnelTrapezoidProps = {
    width: 100,
    upperWidth: 80,
    lowerWidth: 60,
    x: 11,
    y: 11,
    isActive: false,
    tooltipPosition: mockTooltipPosition,
    height: 0,
    name: "",
    option: undefined,
    labelViewBox: viewBox,
    parentViewBox: viewBox,
    val: 1,
    tooltipPayload: [],
  };

  it("<FunnelTrapezoid /> returns a trapezoid shape with no options", () => {
    const { container } = render(() => (
      <svg width={100} height={100}>
        <FunnelTrapezoid {...mockProps} isActive={Boolean(true)} />
      </svg>
    ));
    expect(container.querySelector("g")).toHaveClass("recharts-active-shape");
  });

  it("<FunnelTrapezoid /> returns a trapezoid shape with x & y from options", () => {
    const { container } = render(() => (
      <svg width={100} height={100}>
        <FunnelTrapezoid
          {...mockProps}
          width={100}
          tooltipPosition={mockTooltipPosition}
          option={{ x: 10, y: 10 }}
          isActive
          height={100}
          x={0}
          y={0}
          upperWidth={0}
          lowerWidth={0}
          name="my name"
        />
      </svg>
    ));
    expect(container.querySelector("g")).toHaveClass("recharts-active-shape");
  });
});
