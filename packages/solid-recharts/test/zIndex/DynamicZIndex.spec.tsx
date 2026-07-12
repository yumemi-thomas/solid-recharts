// Port of recharts 3.8.1 test/zIndex/DynamicZIndex.spec.tsx (commit 7a23854).
// Tier A (DOM assertion: the two `.recharts-line` groups stay mounted across
// dynamic zIndex updates). The upstream spec only asserts survival (both lines
// stay in the DOM); a second `describe` below ADDS a port-authored relayering
// assertion — the zIndexed line RELOCATES into `.recharts-zIndex-layer_<n>` as the
// prop changes, and the un-zIndexed line stays in its default (400) portal — which
// is the observable behaviour the wiring enables. Harness adaptations:
//   - React `useState` → Solid `createSignal`; `setZIndex(z => z + 1)` → updater.
//   - `act(() => vi.runAllTimers())` dropped: both Lines use
//     `isAnimationActive={false}`, so there is no timer to flush; reactive
//     propagation is driven by `flush()` instead.
//   - `button.click()` → `fireEvent.click(button)`; `getByText` → `screen.getByText`.
import { describe, it, expect } from "vitest";
import { createSignal, flush } from "solid-js";
import { LineChart, Line, XAxis, YAxis } from "../../src";
import { fireEvent, render, screen } from "../helper/render";

describe("Dynamic zIndex updates", () => {
  it("should keep the line in the DOM when zIndex changes dynamically", () => {
    const data = [
      { name: "A", uv: 400, pv: 2400 },
      { name: "B", uv: 300, pv: 4567 },
    ];

    const [zIndex, setZIndex] = createSignal(10);

    const { container } = render(() => (
      <div>
        <button type="button" onClick={() => setZIndex((z) => z + 1)}>
          Increment zIndex
        </button>
        <LineChart width={400} height={400} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Line dataKey="uv" stroke="#8884d8" zIndex={zIndex()} isAnimationActive={false} />
          <Line dataKey="pv" stroke="#82ca9d" isAnimationActive={false} />
        </LineChart>
      </div>
    ));
    flush();

    const initialLines = container.querySelectorAll(".recharts-line");
    expect(initialLines.length).toBe(2);

    const button = screen.getByText("Increment zIndex");

    // Rapid zIndex updates should not cause lines to disappear
    fireEvent.click(button);
    flush();

    let lines = container.querySelectorAll(".recharts-line");
    expect(lines.length).toBe(2);

    fireEvent.click(button);
    flush();

    lines = container.querySelectorAll(".recharts-line");
    expect(lines.length).toBe(2);
  });

  it("relocates the zIndexed line into its portal as zIndex changes, leaving the other in the default (400) portal", () => {
    const data = [
      { name: "A", uv: 400, pv: 2400 },
      { name: "B", uv: 300, pv: 4567 },
    ];

    const [zIndex, setZIndex] = createSignal(10);

    const { container } = render(() => (
      <div>
        <button type="button" onClick={() => setZIndex((z) => z + 1)}>
          Increment zIndex
        </button>
        <LineChart width={400} height={400} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Line dataKey="uv" stroke="#8884d8" zIndex={zIndex()} isAnimationActive={false} />
          <Line dataKey="pv" stroke="#82ca9d" isAnimationActive={false} />
        </LineChart>
      </div>
    ));
    flush();

    const portalHasLine = (z: number): boolean => {
      const portal = container.querySelector(`.recharts-zIndex-layer_${z}`);
      return portal != null && portal.querySelector(".recharts-line") != null;
    };

    // Initially the uv line lives in the zIndex=10 portal; the un-zIndexed pv line
    // lives in the default line portal (DefaultZIndexes.line = 400).
    expect(portalHasLine(10)).toBe(true);
    expect(portalHasLine(400)).toBe(true);

    fireEvent.click(screen.getByText("Increment zIndex"));
    flush();
    // The uv line has moved to the zIndex=11 portal; the old 10 portal no longer
    // holds a line; the pv line stays at 400.
    expect(portalHasLine(11)).toBe(true);
    expect(portalHasLine(10)).toBe(false);
    expect(portalHasLine(400)).toBe(true);
  });
});
