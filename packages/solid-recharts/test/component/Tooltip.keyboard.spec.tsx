// Keyboard-navigation spec for the Tooltip vertical (accessibility layer): focus
// seeds the active index, ArrowRight/ArrowLeft move it, Enter toggles. Exercises
// the Solid keyboardEventsMiddleware rewrite (handleFocus/handleKeyboardEvent →
// setKeyboardInteraction → combineTooltipInteractionState picks up the keyboard
// interaction → the same payload pipeline).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render, fireEvent } from "../helper/render";
import { LineChart, Line, XAxis, Tooltip } from "../../src";
import { PageData } from "../_data";

const label = (container: Element): string | null | undefined =>
  container.querySelector(".recharts-tooltip-label")?.textContent;

describe("<Tooltip /> keyboard navigation", () => {
  it("focus seeds index 0 and arrow keys move the active tooltip", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={PageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis dataKey="name" />
        <Line dataKey="uv" stroke="#ff7300" />
        <Tooltip />
      </LineChart>
    ));
    flush();

    const wrapper = container.querySelector(".recharts-wrapper") as Element;

    // Focus → keyboard interaction seeds index 0 ("Page A").
    fireEvent.focus(wrapper);
    flush();
    expect(label(container)).toBe("Page A");

    // ArrowRight → index 1 ("Page B"); again → index 2 ("Page C").
    fireEvent.keyDown(wrapper, { key: "ArrowRight" });
    flush();
    expect(label(container)).toBe("Page B");
    fireEvent.keyDown(wrapper, { key: "ArrowRight" });
    flush();
    expect(label(container)).toBe("Page C");

    // ArrowLeft → back to index 1 ("Page B").
    fireEvent.keyDown(wrapper, { key: "ArrowLeft" });
    flush();
    expect(label(container)).toBe("Page B");
  });
});
