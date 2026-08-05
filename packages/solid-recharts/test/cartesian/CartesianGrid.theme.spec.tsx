// Port of recharts 3.10.1 test/cartesian/CartesianGrid/CartesianGrid.theme.spec.tsx.
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
  CartesianGrid,
  ComposedChart,
  RechartsThemeProvider,
  type CartesianGridProps,
} from "../../src";
import { generateMockData } from "../_data";

const mockData = generateMockData(5, 2);

const MyChart = (props: { children: JSX.Element }): JSX.Element => (
  <ComposedChart width={400} height={400} data={mockData}>
    {props.children}
  </ComposedChart>
);

function renderGrid(children: () => JSX.Element): HTMLElement {
  const { container } = render(() => <MyChart>{children()}</MyChart>);
  flush();
  return container;
}

function expectLineStyles(
  container: HTMLElement,
  expected: {
    stroke: string;
    strokeWidth: string | null;
    strokeOpacity: string | null;
    strokeDasharray: string | null;
  },
): void {
  container.querySelectorAll(".recharts-cartesian-grid line").forEach((line) => {
    expect(line.getAttribute("stroke")).toBe(expected.stroke);
    expect(line.getAttribute("stroke-width")).toBe(expected.strokeWidth);
    expect(line.getAttribute("stroke-opacity")).toBe(expected.strokeOpacity);
    expect(line.getAttribute("stroke-dasharray")).toBe(expected.strokeDasharray);
  });
}

describe("CartesianGrid theme", () => {
  describe("lines and strokes", () => {
    it("should use defaults when not defined at all", () => {
      expectLineStyles(
        renderGrid(() => <CartesianGrid />),
        {
          stroke: "#ccc",
          strokeWidth: null,
          strokeOpacity: null,
          strokeDasharray: null,
        },
      );
    });

    it("should follow props", () => {
      expectLineStyles(
        renderGrid(() => (
          <CartesianGrid
            stroke="gold"
            strokeWidth={2}
            strokeOpacity={0.9}
            strokeDasharray={[1, 2, 3, 4]}
          />
        )),
        { stroke: "gold", strokeWidth: "2", strokeOpacity: "0.9", strokeDasharray: "1,2,3,4" },
      );
    });

    it("should follow the theme", () => {
      const { container } = render(() => (
        <RechartsThemeProvider
          value={{
            grid: {
              stroke: "gold",
              strokeWidth: 2,
              strokeOpacity: 0.9,
              strokeDasharray: [1, 2, 3, 4],
            },
          }}
        >
          <MyChart>
            <CartesianGrid />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      expectLineStyles(container, {
        stroke: "gold",
        strokeWidth: "2",
        strokeOpacity: "0.9",
        strokeDasharray: "1,2,3,4",
      });
    });

    it("should prefer props over the theme", () => {
      const { container } = render(() => (
        <RechartsThemeProvider
          value={{
            grid: {
              stroke: "red",
              strokeWidth: 21,
              strokeOpacity: 0.11,
              strokeDasharray: [1, 12, 3, 4],
            },
          }}
        >
          <MyChart>
            <CartesianGrid
              stroke="gold"
              strokeWidth={2}
              strokeOpacity={0.9}
              strokeDasharray={[1, 2, 3, 4]}
            />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      expectLineStyles(container, {
        stroke: "gold",
        strokeWidth: "2",
        strokeOpacity: "0.9",
        strokeDasharray: "1,2,3,4",
      });
    });

    function renderDasharray(input: CartesianGridProps["strokeDasharray"]): string | null {
      return (
        renderGrid(() => <CartesianGrid strokeDasharray={input} />)
          .querySelector(".recharts-cartesian-grid line")
          ?.getAttribute("stroke-dasharray") ?? null
      );
    }

    it("should use strings as-is", () => expect(renderDasharray("1")).toBe("1"));
    it("should convert number to string", () => expect(renderDasharray(1)).toBe("1"));
    it("should convert array of numbers to string", () =>
      expect(renderDasharray([1, 2, 3])).toBe("1,2,3"));
  });

  describe("fill", () => {
    const getBgRect = (container: HTMLElement): Element | null =>
      container.querySelector(".recharts-cartesian-grid-bg");

    it("should use defaults from the legacy theme", () => {
      expect(getBgRect(renderGrid(() => <CartesianGrid />))).toBe(null);
    });

    it("should follow fill props", () => {
      const bgRect = getBgRect(renderGrid(() => <CartesianGrid fill="gold" fillOpacity={0.9} />));
      expect(bgRect).not.toBe(null);
      expect(bgRect?.getAttribute("fill")).toBe("gold");
      expect(bgRect?.getAttribute("fill-opacity")).toBe("0.9");
    });

    it("should follow theme fill", () => {
      const { container } = render(() => (
        <RechartsThemeProvider value={{ grid: { fill: "purple" } }}>
          <MyChart>
            <CartesianGrid />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      expect(getBgRect(container)?.getAttribute("fill")).toBe("purple");
    });

    it("should follow theme fillOpacity", () => {
      const { container } = render(() => (
        <RechartsThemeProvider value={{ grid: { fill: "lime", fillOpacity: 0.5 } }}>
          <MyChart>
            <CartesianGrid />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      const bgRect = getBgRect(container);
      expect(bgRect?.getAttribute("fill")).toBe("lime");
      expect(bgRect?.getAttribute("fill-opacity")).toBe("0.5");
    });

    it("should prefer fill props over theme fill", () => {
      const { container } = render(() => (
        <RechartsThemeProvider value={{ grid: { fill: "red" } }}>
          <MyChart>
            <CartesianGrid fill="gold" />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      expect(getBgRect(container)?.getAttribute("fill")).toBe("gold");
    });

    it("should prefer fillOpacity props over theme fillOpacity", () => {
      const { container } = render(() => (
        <RechartsThemeProvider value={{ grid: { fill: "red", fillOpacity: 0.1 } }}>
          <MyChart>
            <CartesianGrid fill="gold" fillOpacity={0.9} />
          </MyChart>
        </RechartsThemeProvider>
      ));
      flush();
      const bgRect = getBgRect(container);
      expect(bgRect?.getAttribute("fill")).toBe("gold");
      expect(bgRect?.getAttribute("fill-opacity")).toBe("0.9");
    });
  });
});
