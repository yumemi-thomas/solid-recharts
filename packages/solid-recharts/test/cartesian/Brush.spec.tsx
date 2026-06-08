// Ported from recharts 3.8.1 test/cartesian/Brush.spec.tsx.
//
// Tier-A cases ported byte-identically (React render -> Solid render(() => ...) +
// flush(); @testing-library/react -> the repo testing-library; userEvent ->
// fireEvent). The recharts `expectBrush` helper (asserts the .recharts-brush rect
// x/y/width/height) is inlined here as a local function since spec files may not
// add helpers.
//
// NOT ported (see the agent's `blocked` report): the `traveller` prop cases (custom
// traveller element/component — prop not implemented), the `dy` prop cases (prop not
// implemented), the aria-label/aria-valuenow + file-snapshot traveller markup case
// (those attributes are not emitted), and the `Customized`-based panorama/state
// integration cases (Customized is not exported). The controlled-input case uses
// React useState + number inputs (React-ism N/A).
import { describe, expect, test } from "vitest";
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render, fireEvent, screen, waitFor } from "../helper/render";
import { BarChart, Brush, ComposedChart, Line, LineChart } from "../../src";
import type { BrushProps } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";

type ExpectedBrush = {
  x: string;
  y: string;
  width: string;
  height: string;
};

function expectBrush(container: Element, expected: ExpectedBrush): void {
  assertNotNull(container);
  const brush = container.querySelector(".recharts-brush rect");
  assertNotNull(brush);
  const actual = {
    x: brush.getAttribute("x"),
    y: brush.getAttribute("y"),
    width: brush.getAttribute("width"),
    height: brush.getAttribute("height"),
  };
  expect(actual).toEqual(expected);
}

describe("<Brush />", () => {
  const data = [
    { date: "2023-01-01", value: 10, name: "A" },
    { date: "2023-01-02", value: 20, name: "B" },
    { date: "2023-01-03", value: 10, name: "C" },
    { date: "2023-01-04", value: 30, name: "D" },
    { date: "2023-01-05", value: 50, name: "E" },
    { date: "2023-01-06", value: 10, name: "F" },
    { date: "2023-01-07", value: 30, name: "G" },
    { date: "2023-01-08", value: 20, name: "H" },
    { date: "2023-01-09", value: 10, name: "I" },
    { date: "2023-01-10", value: 70, name: "J" },
    { date: "2023-01-11", value: 40, name: "K" },
    { date: "2023-01-12", value: 20, name: "L" },
    { date: "2023-01-13", value: 10, name: "M" },
    { date: "2023-01-14", value: 10, name: "N" },
  ];

  test("Don't render any travellers or slide when data is empty in simple Brush", () => {
    const { container } = render(() => (
      <BarChart width={400} height={100} data={[]}>
        <Brush x={100} y={50} width={400} height={40} />
      </BarChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-brush-traveller")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-brush-slide")).toHaveLength(0);
  });

  test("Renders Brush in a custom component", () => {
    const CustomBrush = (props: BrushProps): JSX.Element => {
      return <Brush {...props} />;
    };

    const { container } = render(() => (
      <BarChart width={400} height={100} data={[]}>
        <CustomBrush x={100} y={50} width={400} height={40} />
      </BarChart>
    ));
    flush();
    expect(container.querySelectorAll(".recharts-brush-traveller")).toHaveLength(0);
    expect(container.querySelectorAll(".recharts-brush-slide")).toHaveLength(0);
  });

  test("mouse down on traveller will trigger the brush text display, and mouse move out will hide the brush text", () => {
    // wrap brush with a bar chart to make brush traveler work
    const { container } = render(() => (
      <BarChart
        width={500}
        height={100}
        data={data}
        margin={{
          right: 100,
          left: 100,
        }}
      >
        <Brush dataKey="date" height={90} stroke="#8884d8" />
      </BarChart>
    ));
    flush();

    expectBrush(container, {
      height: "90",
      width: "300",
      x: "100",
      y: "10",
    });

    const brushSlide = container.querySelector(".recharts-brush-slide");
    assertNotNull(brushSlide);
    fireEvent.mouseDown(brushSlide);
    flush();

    expect(container.querySelectorAll(".recharts-brush-texts")).toHaveLength(1);
    expect(screen.getAllByText(data[0]!.date)).toHaveLength(1);
    expect(screen.getAllByText(data[data.length - 1]!.date)).toHaveLength(1);

    fireEvent.mouseUp(window);
    flush();

    expect(container.querySelectorAll(".recharts-brush-texts")).toHaveLength(0);
  });

  test("render text when alwaysShowText is true", () => {
    const { container } = render(() => (
      <BarChart width={500} height={100} data={data}>
        <Brush x={100} y={50} width={400} height={40} alwaysShowText />
      </BarChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-layer.recharts-brush-texts")).toHaveLength(1);
  });

  test("Should not filter out the value 0 in scaleValues and cause indices to be off by 1", async () => {
    const { container } = render(() => (
      <ComposedChart
        width={200}
        height={100}
        data={data.slice(0, 6)}
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <Brush>
          <LineChart>
            <Line dataKey="name" dot isAnimationActive={false} />
          </LineChart>
        </Brush>
      </ComposedChart>
    ));
    flush();
    const traveller = container.querySelectorAll(".recharts-brush-traveller")[1] as SVGGElement;
    expect(traveller).toBeDefined();
    fireEvent.focus(traveller);
    flush();

    // Solid replaces the <Text> DOM node when its content changes (the captured
    // reference goes stale / disconnected), so re-query the text element on each
    // assertion instead of holding a single reference like the React original.
    const textContent = (): string | null | undefined =>
      container.querySelector('.recharts-brush-texts text[text-anchor="start"]')?.textContent;
    expect(textContent()).toBe("5");

    fireEvent.keyDown(traveller, {
      key: "ArrowLeft",
    });
    flush();
    await waitFor(() => {
      expect(textContent()).toBe("4");
    });
    fireEvent.keyDown(traveller, {
      key: "ArrowRight",
    });
    flush();

    await waitFor(() => {
      // there are 6 data points, left and then right should have index 5
      expect(textContent()).toBe("5");
    });
  });

  describe("Brush a11y features", () => {
    test("Brush travellers should be marked up correctly", () => {
      const { container } = render(() => (
        <BarChart width={400} height={100} data={data}>
          <Brush dataKey="value" x={100} y={50} width={400} height={40} />
        </BarChart>
      ));
      flush();

      const travellers = container.querySelectorAll(".recharts-brush-traveller");
      expect(travellers).toHaveLength(2);
      travellers.forEach((travellerElement) => {
        // tabIndex=0 is necessary for a keyboard user to tab to an element.
        // If this fails, the component ceases to be accessible in any way.
        expect(travellerElement).toHaveProperty("tabIndex", 0);
      });
    });

    test("Brush text should appear while travellers are in focus", async () => {
      const { container } = render(() => (
        <BarChart width={400} height={100} data={data}>
          <Brush dataKey="value" x={100} y={50} width={400} height={40} />
        </BarChart>
      ));
      flush();

      // By default, no text should appear
      expect(container.querySelector(".recharts-brush-texts")).toBeNull();

      // After focusing on a traveller, the text should appear
      const traveller = container.querySelector(".recharts-brush-traveller") as SVGGElement;
      fireEvent.focus(traveller);
      flush();

      await waitFor(() => {
        expect(container.querySelector(".recharts-brush-texts")).not.toBeNull();
      });

      // After blurring that traveller, the text should disappear again
      fireEvent.blur(traveller);
      flush();

      await waitFor(() => {
        expect(container.querySelector(".recharts-brush-texts")).toBeNull();
      });
    });

    test("Travellers should move when valid keyboard events are fired", async () => {
      const { container } = render(() => (
        <BarChart width={400} height={100} data={data}>
          <Brush dataKey="value" x={100} y={50} width={400} height={40} />
        </BarChart>
      ));
      flush();

      const traveller = container.querySelector(".recharts-brush-traveller") as SVGGElement;
      fireEvent.focus(traveller);
      flush();

      await waitFor(() => {
        expect(container.querySelector(".recharts-brush-texts")).not.toBeNull();
      });

      // Re-query each time: Solid replaces the <Text> node when its content changes.
      const textContent = (): string | null | undefined =>
        container.querySelector('.recharts-brush-texts text[text-anchor="end"]')?.textContent;
      expect(textContent()).toBe("10");

      fireEvent.keyDown(traveller, {
        key: "ArrowRight",
      });
      flush();
      await waitFor(() => {
        expect(textContent()).toBe("20");
      });

      fireEvent.keyDown(traveller, {
        key: "ArrowLeft",
      });
      flush();
      await waitFor(() => {
        expect(textContent()).toBe("10");
      });
    });

    test("Travellers should move when valid keyboard events are fired AFTER mouse interaction", async () => {
      const { container } = render(() => (
        <BarChart width={400} height={100} data={data}>
          <Brush dataKey="value" x={100} y={50} width={400} height={40} />
        </BarChart>
      ));
      flush();

      const traveller = container.querySelector(".recharts-brush-traveller") as SVGGElement;

      fireEvent.mouseDown(traveller);
      fireEvent.mouseMove(traveller, { clientX: 30 });
      fireEvent.mouseUp(traveller);
      flush();

      fireEvent.focus(traveller);
      flush();

      await waitFor(() => {
        expect(container.querySelector(".recharts-brush-texts")).not.toBeNull();
      });

      // Re-query each time: Solid replaces the <Text> node when its content changes.
      const textContent = (): string | null | undefined =>
        container.querySelector('.recharts-brush-texts text[text-anchor="end"]')?.textContent;
      expect(textContent()).toBe("10");

      fireEvent.keyDown(traveller, {
        key: "ArrowRight",
      });
      flush();
      await waitFor(() => {
        expect(textContent()).toBe("20");
      });

      fireEvent.keyDown(traveller, {
        key: "ArrowLeft",
      });
      flush();
      await waitFor(() => {
        expect(textContent()).toBe("10");
      });
    });
  });
});
