// Port of recharts 3.10.1 test/cartesian/CartesianGrid/CartesianGrid.theme.spec.tsx.
// Tier A (DOM attributes, assertions unchanged). Harness adaptation only: React render ->
// Solid `render(() => <.../>)` + flush() (`rechartsTestRender`); the theme provider takes its
// `value` as a Solid context component; `@recharts/devtools` generateMockData -> test/_data.
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
  CartesianGrid,
  type CartesianGridProps,
  ComposedChart,
  RechartsThemeProvider,
} from "../../../src";
import { generateMockData } from "../../_data";

const mockData = generateMockData(5, 2);

function rechartsTestRender(chart: () => JSX.Element): { container: HTMLElement } {
  const { container } = render(chart);
  flush();
  return { container };
}

const MyChart = (props: { children: JSX.Element }): JSX.Element => (
  <ComposedChart width={400} height={400} data={mockData}>
    {props.children}
  </ComposedChart>
);

describe("CartesianGrid theme", () => {
  describe("lines and strokes", () => {
    describe("when not defined at all", () => {
      it("should use defaults", () => {
        const { container } = rechartsTestRender(() => (
          <MyChart>
            <CartesianGrid />
          </MyChart>
        ));
        const allLines = container.querySelectorAll(".recharts-cartesian-grid line");
        allLines.forEach((line) => {
          expect(line.getAttribute("stroke")).toBe("#ccc");
          expect(line.getAttribute("stroke-width")).toBe(null);
          expect(line.getAttribute("stroke-opacity")).toBe(null);
          expect(line.getAttribute("stroke-dasharray")).toBe(null);
        });
      });
    });

    describe("when defined as a prop", () => {
      it("should follow the prop", () => {
        const { container } = rechartsTestRender(() => (
          <MyChart>
            <CartesianGrid
              stroke="gold"
              strokeWidth={2}
              strokeOpacity={0.9}
              strokeDasharray={[1, 2, 3, 4]}
            />
          </MyChart>
        ));
        const allLines = container.querySelectorAll(".recharts-cartesian-grid line");
        allLines.forEach((line) => {
          expect(line.getAttribute("stroke")).toBe("gold");
          expect(line.getAttribute("stroke-width")).toBe("2");
          expect(line.getAttribute("stroke-opacity")).toBe("0.9");
          expect(line.getAttribute("stroke-dasharray")).toBe("1,2,3,4");
        });
      });
    });

    describe("when defined as a theme", () => {
      it("should follow the theme", () => {
        const { container } = rechartsTestRender(() => (
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
        const allLines = container.querySelectorAll(".recharts-cartesian-grid line");
        allLines.forEach((line) => {
          expect(line.getAttribute("stroke")).toBe("gold");
          expect(line.getAttribute("stroke-width")).toBe("2");
          expect(line.getAttribute("stroke-opacity")).toBe("0.9");
          expect(line.getAttribute("stroke-dasharray")).toBe("1,2,3,4");
        });
      });
    });

    describe("when defined as both a prop and a theme", () => {
      it("should follow the prop", () => {
        const { container } = rechartsTestRender(() => (
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
        const allLines = container.querySelectorAll(".recharts-cartesian-grid line");
        allLines.forEach((line) => {
          expect(line.getAttribute("stroke")).toBe("gold");
          expect(line.getAttribute("stroke-width")).toBe("2");
          expect(line.getAttribute("stroke-opacity")).toBe("0.9");
          expect(line.getAttribute("stroke-dasharray")).toBe("1,2,3,4");
        });
      });
    });

    describe("strokeDasharray", () => {
      function renderDasharray(input: CartesianGridProps["strokeDasharray"]): string | null {
        const { container } = rechartsTestRender(() => (
          <MyChart>
            <CartesianGrid strokeDasharray={input} />
          </MyChart>
        ));
        const firstLine = container.querySelector(".recharts-cartesian-grid line");
        return firstLine?.getAttribute("stroke-dasharray") ?? null;
      }

      it("should use strings as-is", () => {
        expect(renderDasharray("1")).toBe("1");
      });

      it("should convert number to string", () => {
        expect(renderDasharray(1)).toBe("1");
      });

      it("should convert array of numbers to string", () => {
        expect(renderDasharray([1, 2, 3])).toBe("1,2,3");
      });
    });
  });

  describe("fill", () => {
    function getBgRect(container: HTMLElement): HTMLElement | null {
      return container.querySelector<HTMLElement>(".recharts-cartesian-grid-bg");
    }

    describe("when not defined at all", () => {
      it("should use defaults from theme (legacyTheme has no fill, so background is null)", () => {
        const { container } = rechartsTestRender(() => (
          <MyChart>
            <CartesianGrid />
          </MyChart>
        ));
        // legacyTheme has fill: 'none' so Background returns null - no element rendered
        expect(getBgRect(container)).toBe(null);
      });
    });

    describe("when defined as a prop", () => {
      it("should follow the prop when both fill and fillOpacity are provided", () => {
        const { container } = rechartsTestRender(() => (
          <MyChart>
            <CartesianGrid fill="gold" fillOpacity={0.9} />
          </MyChart>
        ));
        const bgRect = getBgRect(container);
        expect(bgRect).not.toBe(null);
        expect(bgRect?.getAttribute("fill")).toBe("gold");
        expect(bgRect?.getAttribute("fill-opacity")).toBe("0.9");
      });
    });

    describe("when defined as a theme", () => {
      it("should follow the theme fill", () => {
        const { container } = rechartsTestRender(() => (
          <RechartsThemeProvider value={{ grid: { fill: "purple" } }}>
            <MyChart>
              <CartesianGrid />
            </MyChart>
          </RechartsThemeProvider>
        ));
        const bgRect = getBgRect(container);
        expect(bgRect).not.toBe(null);
        expect(bgRect?.getAttribute("fill")).toBe("purple");
      });

      it("should follow the theme fillOpacity when combined with fill", () => {
        const { container } = rechartsTestRender(() => (
          <RechartsThemeProvider value={{ grid: { fill: "lime", fillOpacity: 0.5 } }}>
            <MyChart>
              <CartesianGrid />
            </MyChart>
          </RechartsThemeProvider>
        ));
        const bgRect = getBgRect(container);
        expect(bgRect).not.toBe(null);
        expect(bgRect?.getAttribute("fill")).toBe("lime");
        expect(bgRect?.getAttribute("fill-opacity")).toBe("0.5");
      });
    });

    describe("when defined as both a prop and a theme", () => {
      it("should follow the prop fill", () => {
        const { container } = rechartsTestRender(() => (
          <RechartsThemeProvider value={{ grid: { fill: "red" } }}>
            <MyChart>
              <CartesianGrid fill="gold" />
            </MyChart>
          </RechartsThemeProvider>
        ));
        const bgRect = getBgRect(container);
        expect(bgRect).not.toBe(null);
        expect(bgRect?.getAttribute("fill")).toBe("gold");
      });

      it("should follow the prop fillOpacity when combined with fill", () => {
        const { container } = rechartsTestRender(() => (
          <RechartsThemeProvider value={{ grid: { fill: "red", fillOpacity: 0.1 } }}>
            <MyChart>
              <CartesianGrid fill="gold" fillOpacity={0.9} />
            </MyChart>
          </RechartsThemeProvider>
        ));
        const bgRect = getBgRect(container);
        expect(bgRect).not.toBe(null);
        expect(bgRect?.getAttribute("fill")).toBe("gold");
        expect(bgRect?.getAttribute("fill-opacity")).toBe("0.9");
      });
    });
  });
});
