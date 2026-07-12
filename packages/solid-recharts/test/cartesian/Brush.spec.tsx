// Ported from recharts 3.8.1 test/cartesian/Brush.spec.tsx.
//
// Tier-A cases ported byte-identically (React render -> Solid render(() => ...) +
// flush(); @testing-library/react -> the repo testing-library; userEvent ->
// fireEvent). The recharts `expectBrush` helper (asserts the .recharts-brush rect
// x/y/width/height) is inlined here as a local function since spec files may not
// add helpers.
//
// The traveller a11y markup (role="slider" + aria-label/aria-valuenow, attribute
// order asserted) IS now ported (see Brush.tsx). The `.toMatchFileSnapshot` of the
// traveller inner SVG is SELF-RECORDED (no vendored snapshot; Solid's serialized
// SVG markup is recorded once and locked — the vendored React snapshot would be
// byte-coupled to React's attribute serialization anyway).
//
// NOT ported (see the agent's `blocked` report): the `traveller` prop cases (custom
// traveller element/component — prop not implemented), and the controlled-input
// case (React useState + number inputs — React-ism N/A).
//
// The "with panorama" cases and the `Customized`-based "panorama and state
// integration" cases ARE ported: the nested <LineChart>/<ComposedChart> inside
// <Brush> is panorama-transparent (CartesianChart short-circuits to its children
// inside a PanoramaContext), so its items draw the OUTER store's full dataset into
// the brush panorama surface — recharts' cloneElement(width/height/data/compact)
// semantics without cloneElement. `Customized` probes become plain probe
// components rendered as chart children.
import { describe, expect, it, test } from "vitest";
import { createSignal, flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render, fireEvent, screen, waitFor } from "../helper/render";
import { BarChart, Brush, ComposedChart, Line, LineChart, ReferenceLine } from "../../src";
import type { BrushProps } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { selectChartDataWithIndexes } from "../../src/state/selectors/dataSelectors";

// `pageX` isn't a MouseEventInit field (and testing-library doesn't assign it), so
// define it explicitly on a bubbling event — the Brush reads e.pageX (like recharts).
function mouseEventWithPageX(type: string, pageX: number): MouseEvent {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "pageX", { value: pageX, configurable: true });
  return ev;
}

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

  describe("with panorama", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={400} height={100} data={data}>
        <Line dataKey="value" dot isAnimationActive={false} />
        <Brush dataKey="value" x={100} y={50} width={400} height={40}>
          <LineChart>
            <Line dataKey="value" dot isAnimationActive={false} />
          </LineChart>
        </Brush>
        {props.children}
      </LineChart>
    ));

    function selectAllDotsInMainChart(container: Element): NodeListOf<Element> {
      return container.querySelectorAll(".recharts-line-dot:not(.recharts-brush *)");
    }

    function selectAllDotsInPanorama(container: Element): NodeListOf<Element> {
      return container.querySelectorAll(".recharts-brush .recharts-line-dot");
    }

    it("should render two lines, one for the big chart another in the panorama", () => {
      const { container } = renderTestCase();

      const dotsInPanorama = selectAllDotsInPanorama(container);
      expect(dotsInPanorama).toHaveLength(data.length);

      const dotsInMainChart = selectAllDotsInMainChart(container);
      expect(dotsInMainChart).toHaveLength(data.length);
    });

    it("should hide dots in the main chart after moving the slider, but keep all dots in the panorama visible", () => {
      const { container, spy } = renderTestCase(selectChartDataWithIndexes);

      expectLastCalledWith(spy, {
        chartData: data,
        dataStartIndex: 0,
        dataEndIndex: data.length - 1,
        computedData: undefined,
      });

      // The vendored test fires mouseMove on the traveller with clientX; the port
      // drags via the Brush's window capture listeners with an explicit pageX
      // (jsdom doesn't derive pageX from clientX), flushing after mouseDown so the
      // "isTravellerMoving" signal is visible before the move.
      const slider = container.querySelector(".recharts-brush-traveller") as SVGGElement;
      fireEvent.mouseDown(slider);
      flush();
      window.dispatchEvent(mouseEventWithPageX("mousemove", 200));
      window.dispatchEvent(mouseEventWithPageX("mouseup", 200));
      flush();

      expectLastCalledWith(spy, {
        chartData: data,
        dataStartIndex: 6,
        dataEndIndex: data.length - 1,
        computedData: undefined,
      });

      const dotsInPanorama = selectAllDotsInPanorama(container);
      expect(dotsInPanorama).toHaveLength(data.length);

      const dotsInMainChart = selectAllDotsInMainChart(container);
      expect(dotsInMainChart).toHaveLength(data.length - 6);
    });
  });

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
      expect(container.querySelectorAll(".recharts-brush-slide")).toHaveLength(1);
      travellers.forEach((travellerElement) => {
        // tabIndex=0 is necessary for a keyboard user to tab to an element.
        // If this fails, the component ceases to be accessible in any way.
        expect(travellerElement).toHaveProperty("tabIndex", 0);
      });

      // Each traveller is a `role="slider"` with an aria-label (the first/last data
      // `name`, "sic" per recharts — the label says "value" but reads `name`) and an
      // aria-valuenow = the traveller's pixel x. The attribute ORDER is asserted
      // byte-for-byte to match recharts. The vendor `.toMatchFileSnapshot` of the
      // inner SVG markup is SELF-RECORDED here via toMatchSnapshot (repo convention,
      // __snapshots__/) — it locks the port's OWN Solid serialization; the vendored
      // React `.svg` files are byte-coupled to React's serialization so aren't reused.
      const [traveller1, traveller2] = [travellers[0]!, travellers[1]!];
      const expectedNames = ["class", "tabindex", "role", "aria-label", "aria-valuenow", "style"];
      expect(traveller1.getAttributeNames()).toEqual(expectedNames);
      expect(traveller1.getAttribute("class")).toBe("recharts-layer recharts-brush-traveller");
      expect(traveller1.getAttribute("tabindex")).toBe("0");
      expect(traveller1.getAttribute("role")).toBe("slider");
      expect(traveller1.getAttribute("aria-label")).toBe("Min value: A, Max value: N");
      expect(traveller1.getAttribute("aria-valuenow")).toBe("100");
      expect(traveller1.getAttribute("style")).toBe("cursor: col-resize;");
      expect(traveller1.innerHTML).toMatchSnapshot();

      expect(traveller2.getAttributeNames()).toEqual(expectedNames);
      expect(traveller2.getAttribute("class")).toBe("recharts-layer recharts-brush-traveller");
      expect(traveller2.getAttribute("tabindex")).toBe("0");
      expect(traveller2.getAttribute("role")).toBe("slider");
      expect(traveller2.getAttribute("aria-label")).toBe("Min value: A, Max value: N");
      expect(traveller2.getAttribute("aria-valuenow")).toBe("495");
      expect(traveller2.getAttribute("style")).toBe("cursor: col-resize;");
      expect(traveller2.innerHTML).toMatchSnapshot();
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

  // Ported from the reference "Travellers should move..." controlled block. The
  // React useState + number-input fixture becomes a Solid signal + in-tree button
  // (writing the signal from test scope would re-render with an ownerless effect
  // → NO_OWNER diagnostic; the button keeps the swap inside the render root).
  describe("with controlled startIndex/endIndex", () => {
    const renderControlled = () => {
      const [startIndex, setStartIndex] = createSignal<number | undefined>(3);
      const [endIndex, setEndIndex] = createSignal<number | undefined>(data.length - 1);
      const result = render(() => (
        <>
          <button
            type="button"
            data-testid="set-indexes"
            onClick={() => {
              setStartIndex(2);
              setEndIndex(5);
            }}
          />
          <ComposedChart data={data} height={400} width={400}>
            <Line dataKey="value" isAnimationActive={false} />
            <ReferenceLine y={30} />
            <Brush
              startIndex={startIndex()}
              endIndex={endIndex()}
              onChange={(e) => {
                setEndIndex(e.endIndex);
                setStartIndex(e.startIndex);
              }}
              alwaysShowText
            >
              <ComposedChart>
                <Line dataKey="value" isAnimationActive={false} />
                <ReferenceLine y={30} />
              </ComposedChart>
            </Brush>
          </ComposedChart>
        </>
      ));
      return result;
    };

    test("Travellers should move and chart should update when brush start and end indexes are controlled", async () => {
      const { container } = renderControlled();
      flush();
      assertNotNull(container);

      const traveller = container.querySelector(".recharts-brush-traveller");
      assertNotNull(traveller);
      fireEvent.focus(traveller);
      flush();

      const button = container.querySelector('[data-testid="set-indexes"]');
      assertNotNull(button);
      fireEvent.click(button);
      flush();

      await waitFor(() => {
        const brushTexts = container
          .getElementsByClassName("recharts-brush-texts")
          .item(0)?.children;
        assertNotNull(brushTexts);
        expect(brushTexts.item(0)).toBeInTheDocument();
        expect(brushTexts.item(0)?.textContent).toContain("2");
        expect(brushTexts.item(1)?.textContent).toContain("5");
      });
    });

    test("Should render panorama in brush", () => {
      const { container } = renderControlled();
      flush();

      const svgs = container.getElementsByTagName("svg");
      expect(svgs).toHaveLength(2);

      const lines = container.getElementsByClassName("recharts-line");
      expect(lines).toHaveLength(2);

      const referenceLines = container.getElementsByClassName("recharts-reference-line-line");
      expect(referenceLines).toHaveLength(2);

      const chartReferenceLineY1 = referenceLines[0]?.getAttribute("y1");
      const chartReferenceLineY2 = referenceLines[0]?.getAttribute("y2");

      const panoReferenceLineY1 = referenceLines[1]?.getAttribute("y1");
      const panoReferenceLineY2 = referenceLines[1]?.getAttribute("y2");

      // Reference lines are created on different scales (chart vs panorama) and
      // therefore have different values.
      expect(chartReferenceLineY1).not.toEqual(panoReferenceLineY1);
      expect(chartReferenceLineY2).not.toEqual(panoReferenceLineY2);
    });
  });
});
