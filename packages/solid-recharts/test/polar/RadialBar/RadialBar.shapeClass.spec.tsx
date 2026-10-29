// Not a recharts port: pins that the `class` handed to a RadialBar `shape` / `activeShape`
// function is a string, both at run time and in the callback's type. recharts builds it as
// `` className: `recharts-radial-bar-sector ${entry.className}` ``
// (vendor/recharts-reference/src/polar/RadialBar.tsx:172) and `RadialBarSector` forwards the
// sector props as they are to the user's function, so a structured (array) value would reach
// user code that treats `class` as the string it is everywhere else in the public API.
//
// Pushing `props.class` into an `Array<string | undefined>` is also the compile-time check:
// it stops type-checking if the payload's `class` is widened to Solid's `JSX.ClassValue`.
import { flush, For } from "solid-js";
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { Cell, RadialBar, RadialBarChart, Tooltip } from "../../../src";
import { PageData } from "../../_data";

describe("RadialBar sector class", () => {
  it("is a string in the props of a function `shape`", () => {
    const classes: Array<string | undefined> = [];
    render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          shape={(props) => {
            classes.push(props.class);
            return null;
          }}
        />
      </RadialBarChart>
    ));
    flush();

    expect(classes.length).toBeGreaterThan(0);
    for (const value of classes) {
      expect(typeof value).toBe("string");
      expect(value).toContain("recharts-radial-bar-sector");
    }
  });

  it("is a string in the props of a function `activeShape`", () => {
    const classes: Array<string | undefined> = [];
    render(() => (
      <RadialBarChart width={500} height={500} data={PageData} throttledEvents={[]}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          activeShape={(props) => {
            classes.push(props.class);
            return null;
          }}
        />
        <Tooltip defaultIndex={0} />
      </RadialBarChart>
    ));
    flush();

    expect(classes.length).toBeGreaterThan(0);
    for (const value of classes) {
      expect(typeof value).toBe("string");
      expect(value).toContain("recharts-radial-bar-sector");
    }
  });

  it("carries a <Cell> class in that string", () => {
    const classes: Array<string | undefined> = [];
    render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar
          isAnimationActive={false}
          dataKey="amt"
          shape={(props) => {
            classes.push(props.class);
            return null;
          }}
        >
          <For each={PageData}>{() => <Cell class="from-cell" />}</For>
        </RadialBar>
      </RadialBarChart>
    ));
    flush();

    expect(classes.length).toBeGreaterThan(0);
    for (const value of classes) {
      expect(value).toBe("recharts-radial-bar-sector from-cell");
    }
  });

  it("is rendered on the default sector path together with the Sector class and the <Cell> class", () => {
    const { container } = render(() => (
      <RadialBarChart width={500} height={500} data={PageData}>
        <RadialBar isAnimationActive={false} dataKey="amt">
          <For each={PageData}>{() => <Cell class="from-cell" />}</For>
        </RadialBar>
      </RadialBarChart>
    ));
    flush();

    const sectors = container.querySelectorAll(".recharts-radial-bar-sectors path");
    expect(sectors.length).toBeGreaterThan(0);
    for (const sector of sectors) {
      expect(sector.classList.contains("recharts-sector")).toBe(true);
      expect(sector.classList.contains("recharts-radial-bar-sector")).toBe(true);
      expect(sector.classList.contains("from-cell")).toBe(true);
    }
  });
});
