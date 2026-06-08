// Port of recharts 3.8.1 test/cartesian/CartesianGrid.spec.tsx (commit 7a23854).
// Tier A (byte-identical DOM assertions): the grid-line count + coordinate cases.
// Harness adaptation only: React render -> Solid `render(() => <.../>)` + flush();
// dropped `import React`; @testing-library/react -> the repo's local testing-library.
//
// The "Biaxial storybook" case reads the yAxis scale from the store via an inline
// probe component rendered as a chart child (the Solid-idiomatic equivalent of
// recharts' <Customized> spy — there is no <Customized> in this port; a plain
// chart child already has the store context).
//
// NOT ported (blocked / out of this minimal port's scope, recorded by the author):
//   - "...to the background" cases: this port does not render the
//     `rect.recharts-cartesian-grid-bg` background rect (deferred in the source).
import { describe, expect, it, test, vi } from "vitest";
import { createEffect, flush } from "solid-js";
import { render } from "../helper/render";
import {
  CartesianGrid,
  LineChart,
  ComposedChart,
  BarChart,
  ScatterChart,
  AreaChart,
  Area,
  YAxis,
  XAxis,
  Brush,
  Legend,
  Line,
  Tooltip,
} from "../../src";
import type { Margin } from "../../src/util/types";
import { assertNotNull } from "../helper/assertNotNull";
import { pageData } from "../_data";
import { selectAxisScale } from "../../src/state/selectors/axisSelectors";
import { useAppSelector } from "../../src/state/hooks";

const allChartsThatSupportCartesianGrid = [
  { ChartElement: AreaChart, testName: "AreaElement" },
  { ChartElement: ComposedChart, testName: "ComposedChart" },
  { ChartElement: BarChart, testName: "BarChart" },
  { ChartElement: LineChart, testName: "LineChart" },
  { ChartElement: ScatterChart, testName: "ScatterChart" },
] as const;

type ExpectedHorizontalLine = {
  y: string | null;
};

function expectHorizontalGridLines(
  container: Element,
  expectedLines: ReadonlyArray<ExpectedHorizontalLine>,
) {
  const horizontalLines = container.querySelectorAll(".recharts-cartesian-grid-horizontal line");
  assertNotNull(horizontalLines);
  const horizontalLinesContexts = Array.from(horizontalLines).map((line) => ({
    y: line.getAttribute("y1"),
  }));
  expect(horizontalLinesContexts).toEqual(expectedLines);
  horizontalLines.forEach((line) => {
    expect(line.getAttribute("y1")).toEqual(line.getAttribute("y2"));
    expect.soft(line).toHaveAttribute("x1", expect.any(String));
    expect.soft(line).toHaveAttribute("x2", expect.any(String));
  });
}

type ExpectedVerticalLine = {
  x: string | null;
};

function expectVerticalGridLines(
  container: Element,
  expectedLines: ReadonlyArray<ExpectedVerticalLine>,
) {
  const verticalLines = container.querySelectorAll(".recharts-cartesian-grid-vertical line");
  assertNotNull(verticalLines);
  const verticalLinesContexts = Array.from(verticalLines).map((line) => ({
    x: line.getAttribute("x1"),
  }));
  expect(verticalLinesContexts).toEqual(expectedLines);
  verticalLines.forEach((line) => {
    expect(line.getAttribute("x1")).toEqual(line.getAttribute("x2"));
    expect.soft(line).toHaveAttribute("y1", expect.any(String));
    expect.soft(line).toHaveAttribute("y2", expect.any(String));
  });
}

describe("CartesianGrid", () => {
  it("renders more grid lines when the chart has data", () => {
    const { container } = render(() => (
      <AreaChart width={500} height={500} data={pageData}>
        <Area dataKey="pv" />
        <CartesianGrid />
      </AreaChart>
    ));
    flush();
    expectHorizontalGridLines(container, [
      {
        y: "495",
      },
      {
        y: "372.5",
      },
      {
        y: "250",
      },
      {
        y: "127.5",
      },
      {
        y: "5",
      },
    ]);
    expectVerticalGridLines(container, [
      {
        x: "5",
      },
      {
        x: "86.66666666666667",
      },
      {
        x: "168.33333333333334",
      },
      {
        x: "250",
      },
      {
        x: "331.6666666666667",
      },
      {
        x: "413.33333333333337",
      },
      {
        x: "495",
      },
    ]);
  });

  it("renders as many grid lines as the axis has ticks", () => {
    const { container } = render(() => (
      <AreaChart width={500} height={500} data={pageData}>
        <Area dataKey="pv" />
        <YAxis tickCount={6} />
        <XAxis dataKey="uv" type="number" tickCount={3} />
        <CartesianGrid />
      </AreaChart>
    ));
    flush();
    expectHorizontalGridLines(container, [
      {
        y: "465",
      },
      {
        y: "373",
      },
      {
        y: "281",
      },
      {
        y: "189",
      },
      {
        y: "96.99999999999999",
      },
      {
        y: "5",
      },
    ]);
    expectVerticalGridLines(container, [
      {
        x: "65",
      },
      {
        x: "280",
      },
      {
        x: "495",
      },
    ]);
  });

  it("should render fewer ticks when clipped by a Brush", () => {
    const { container } = render(() => (
      <AreaChart width={500} height={500} data={pageData}>
        <Area dataKey="pv" />
        <CartesianGrid />
        <Brush startIndex={0} endIndex={2} />
      </AreaChart>
    ));
    flush();
    expectHorizontalGridLines(container, [
      {
        y: "455",
      },
      {
        y: "342.5",
      },
      {
        y: "230",
      },
      {
        y: "117.5",
      },
      {
        y: "5",
      },
    ]);
    expectVerticalGridLines(container, [
      {
        x: "5",
      },
      {
        x: "250",
      },
      {
        x: "495",
      },
    ]);
  });

  it("should render all ticks from LineChart Biaxial storybook", () => {
    const scaleSpy = vi.fn();
    // Inline probe — the Solid-idiomatic equivalent of recharts' <Customized> spy.
    const Comp = (): null => {
      const scale = useAppSelector((state) => selectAxisScale(state, "yAxis", "left", false));
      createEffect(
        () => scale()?.domain(),
        (domain) => scaleSpy(domain),
      );
      return null;
    };
    const { container } = render(() => (
      <LineChart
        width={500}
        height={300}
        data={pageData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid yAxisId="left" strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line yAxisId="right" type="monotone" dataKey="uv" stroke="#82ca9d" />
        <Tooltip />
        <Comp />
      </LineChart>
    ));
    flush();

    expect(scaleSpy).toHaveBeenLastCalledWith([0, 1200]);
    expectHorizontalGridLines(container, [
      {
        y: "265",
      },
      {
        y: "200",
      },
      {
        y: "135",
      },
      {
        y: "70",
      },
      {
        y: "5",
      },
    ]);
    expectVerticalGridLines(container, [
      {
        x: "80",
      },
      {
        x: "135",
      },
      {
        x: "190",
      },
      {
        x: "245",
      },
      {
        x: "300",
      },
      {
        x: "355",
      },
      {
        x: "410",
      },
    ]);
  });
});

describe.each(allChartsThatSupportCartesianGrid)(
  "<CartesianGrid /> when child of $testName",
  ({ ChartElement }) => {
    describe("when horizontalPoints and verticalPoints are set explicitly", () => {
      const horizontalPoints = [10, 20, 30, 100, 400];
      const verticalPoints = [100, 200, 300, 400];

      const chartMargin: Margin = {
        bottom: 11,
        left: 12,
        right: 13,
        top: 14,
      };

      const exampleCartesianGridDimensions = {
        x: 1,
        y: 2,
        width: 300,
        height: 200,
      };

      describe("layout and size when set explicitly in $testName", () => {
        it("should put x, y, width and height as coordinates to all lines", () => {
          const { container } = render(() => (
            <ChartElement width={500} height={500}>
              <CartesianGrid
                {...exampleCartesianGridDimensions}
                verticalPoints={verticalPoints}
                horizontalPoints={horizontalPoints}
              />
            </ChartElement>
          ));
          flush();
          const horizontalLines = container.querySelectorAll(
            ".recharts-cartesian-grid-horizontal line",
          );
          expect(horizontalLines).toHaveLength(horizontalPoints.length);
          horizontalLines.forEach((line) => {
            expect.soft(line).toHaveAttribute("x", "1");
            expect.soft(line).toHaveAttribute("y", "2");
            expect.soft(line).toHaveAttribute("x1", "1");
            expect.soft(line).toHaveAttribute("x2", "301");
            expect.soft(line).toHaveAttribute("y1", expect.any(String));
            expect.soft(line).toHaveAttribute("y2", expect.any(String));
            expect(line.getAttribute("y1")).toEqual(line.getAttribute("y2"));
          });
          expectHorizontalGridLines(container, [
            {
              y: "10",
            },
            {
              y: "20",
            },
            {
              y: "30",
            },
            {
              y: "100",
            },
            {
              y: "400",
            },
          ]);
          const verticalLines = container.querySelectorAll(
            ".recharts-cartesian-grid-vertical line",
          );
          expect(verticalLines).toHaveLength(verticalPoints.length);
          verticalLines.forEach((line) => {
            expect.soft(line).toHaveAttribute("x", "1");
            expect.soft(line).toHaveAttribute("y", "2");
            expect.soft(line).toHaveAttribute("x1", expect.any(String));
            expect.soft(line).toHaveAttribute("x2", expect.any(String));
            expect(line.getAttribute("x1")).toEqual(line.getAttribute("x2"));
            expect.soft(line).toHaveAttribute("y1", "2");
            expect.soft(line).toHaveAttribute("y2", "202");
          });
          expectVerticalGridLines(container, [
            {
              x: "100",
            },
            {
              x: "200",
            },
            {
              x: "300",
            },
            {
              x: "400",
            },
          ]);
        });
      });

      describe("layout and size when inherited from parent chart", () => {
        it("should put x, y, width and height as coordinates to all lines", () => {
          const { container } = render(() => (
            <ChartElement margin={chartMargin} width={500} height={400}>
              <CartesianGrid verticalPoints={verticalPoints} horizontalPoints={horizontalPoints} />
            </ChartElement>
          ));
          flush();
          const horizontalLines = container.querySelectorAll(
            ".recharts-cartesian-grid-horizontal line",
          );
          expect(horizontalLines).toHaveLength(5);
          horizontalLines.forEach((line) => {
            expect.soft(line).toHaveAttribute("x", "12");
            expect.soft(line).toHaveAttribute("y", "14");
            expect.soft(line).toHaveAttribute("x1", "12");
            expect.soft(line).toHaveAttribute("x2", "487");
          });
          const verticalLines = container.querySelectorAll(
            ".recharts-cartesian-grid-vertical line",
          );
          expect(verticalLines).toHaveLength(4);
          verticalLines.forEach((line) => {
            expect.soft(line).toHaveAttribute("x", "12");
            expect.soft(line).toHaveAttribute("y", "14");
            expect.soft(line).toHaveAttribute("y1", "14");
            expect.soft(line).toHaveAttribute("y2", "389");
          });
        });
      });

      describe("grid", () => {
        describe("basic features", () => {
          it("should render on its own, outside of Recharts", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            const allLines = container.querySelectorAll("line");
            expect.soft(allLines).toHaveLength(9);
            for (let i = 0; i < allLines.length; i++) {
              const line = allLines[i];
              expect.soft(line).toHaveAttribute("stroke", "#ccc");
              expect.soft(line).toHaveAttribute("fill", "none");
            }
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });

          test("Render 5 horizontal lines and 4 vertical lines in simple CartesianGrid", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(9);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });

          test.each([0, -1, -Infinity])("Don't render any lines when width is %s", (w) => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  width={w}
                  height={500}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect(container.querySelectorAll("line")).toHaveLength(0);
          });

          test.each([0, -1, -Infinity])("Don't render any lines when height is %s", (h) => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  width={500}
                  height={h}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect(container.querySelectorAll("line")).toHaveLength(0);
          });
        });

        describe("horizontalPoints without generator", () => {
          it("should not render any lines if horizontal=false", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  horizontal={false}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(verticalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(0);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });

          it("should render all lines if horizontal=true", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  horizontal
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(9);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });

          it("should render all lines if horizontal is undefined", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(9);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });
        });

        describe("verticalPoints without generator", () => {
          it("should not render any lines if vertical=false", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  vertical={false}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(0);
          });

          it("should render all lines if vertical=true", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  vertical
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(9);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });

          it("should render all lines if vertical is undefined", () => {
            const { container } = render(() => (
              <ChartElement width={500} height={500}>
                <CartesianGrid
                  {...exampleCartesianGridDimensions}
                  verticalPoints={verticalPoints}
                  horizontalPoints={horizontalPoints}
                />
              </ChartElement>
            ));
            flush();
            expect.soft(container.querySelectorAll("line")).toHaveLength(9);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-horizontal line"))
              .toHaveLength(horizontalPoints.length);
            expect
              .soft(container.querySelectorAll(".recharts-cartesian-grid-vertical line"))
              .toHaveLength(verticalPoints.length);
          });
        });
      });
    });
  },
);
