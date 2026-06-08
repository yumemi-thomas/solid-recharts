// Port of recharts 3.8.1 test/zIndex/DynamicZIndex.spec.tsx (commit 7a23854).
// Tier A (DOM assertion: the two `.recharts-line` groups stay mounted across
// dynamic zIndex updates). Harness adaptations:
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
});
