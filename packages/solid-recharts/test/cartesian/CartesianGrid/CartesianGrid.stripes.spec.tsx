// Not a recharts port: pins which `fillOpacity` the grid stripes use. recharts hands the stripes
// the props only (vendor/recharts-reference/src/cartesian/CartesianGrid.tsx:593-594,
// `<HorizontalStripes {...propsIncludingDefaults} … />`, which read `fillOpacity` off those props
// at :344-345 and :383-384), while the theme fallback `props.fillOpacity ?? theme.grid.fillOpacity`
// belongs to the background (:584-585) and, for the stroke props, to the lines.
import { flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { CartesianGrid, ComposedChart, RechartsThemeProvider } from "../../../src";
import { generateMockData } from "../../_data";

const mockData = generateMockData(5, 2);

const MyChart = (props: { children: JSX.Element }): JSX.Element => (
  <ComposedChart width={400} height={400} data={mockData}>
    {props.children}
  </ComposedChart>
);

function fillOpacityOf(elements: NodeListOf<Element>): ReadonlyArray<string | null> {
  return Array.from(elements, (element) => element.getAttribute("fill-opacity"));
}

describe("CartesianGrid stripes", () => {
  it("do not take fillOpacity from the theme, only the background does", () => {
    const { container } = render(() => (
      <RechartsThemeProvider value={{ grid: { fill: "lime", fillOpacity: 0.5 } }}>
        <MyChart>
          <CartesianGrid horizontalFill={["red", "blue"]} verticalFill={["green", "yellow"]} />
        </MyChart>
      </RechartsThemeProvider>
    ));
    flush();

    const horizontal = container.querySelectorAll(
      ".recharts-cartesian-gridstripes-horizontal .recharts-cartesian-grid-bg",
    );
    const vertical = container.querySelectorAll(
      ".recharts-cartesian-gridstripes-vertical .recharts-cartesian-grid-bg",
    );
    expect(horizontal.length).toBeGreaterThan(0);
    expect(vertical.length).toBeGreaterThan(0);
    expect(fillOpacityOf(horizontal)).toEqual(Array.from(horizontal, () => null));
    expect(fillOpacityOf(vertical)).toEqual(Array.from(vertical, () => null));
    expect(
      container
        .querySelector(".recharts-cartesian-grid > .recharts-cartesian-grid-bg")
        ?.getAttribute("fill-opacity"),
    ).toBe("0.5");
  });

  it("follow the fillOpacity prop, which wins over the theme on the background too", () => {
    const { container } = render(() => (
      <RechartsThemeProvider value={{ grid: { fill: "lime", fillOpacity: 0.1 } }}>
        <MyChart>
          <CartesianGrid
            fillOpacity={0.9}
            horizontalFill={["red", "blue"]}
            verticalFill={["green", "yellow"]}
          />
        </MyChart>
      </RechartsThemeProvider>
    ));
    flush();

    const stripes = container.querySelectorAll(
      ".recharts-cartesian-gridstripes-horizontal .recharts-cartesian-grid-bg, .recharts-cartesian-gridstripes-vertical .recharts-cartesian-grid-bg",
    );
    expect(stripes.length).toBeGreaterThan(0);
    expect(fillOpacityOf(stripes)).toEqual(Array.from(stripes, () => "0.9"));
    expect(
      container
        .querySelector(".recharts-cartesian-grid > .recharts-cartesian-grid-bg")
        ?.getAttribute("fill-opacity"),
    ).toBe("0.9");
  });
});
