// Ported from recharts 3.8.1 test/component/Legend.itemSorter.spec.tsx (commit
// 7a23854). The "with default content" sorter cases are covered in
// Legend.render.spec.tsx; here we port the "when Legend content is a function"
// cases, which assert the exact props object passed to a function-form `content`.
//
// Tier-A adaptation: recharts calls the content as a React component
// (`React.createElement(content, props)`) so the spy sees `(props, {})` — the
// trailing `{}` is React's legacy context arg. The Solid port calls the function
// directly with a single argument, so the assertion drops the trailing `{}`; the
// props object itself is byte-identical. `render(() => <…/>)` + `flush()` replace
// React's synchronous render.
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  Area,
  AreaChart,
  DefaultZIndexes,
  Legend,
  Line,
  LineChart,
  LineDrawShape,
} from "../../src";
import type { LegendPayload } from "../../src";
import type { Props as DefaultLegendContentProps } from "../../src/component/DefaultLegendContent";
import { numericalData } from "../_data";
import { assertNotNull } from "../helper/assertNotNull";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

// ---- inlined helper (reference: test/helper/expectLegendLabels.tsx) ----
function assertHasLegend(container: Element): ReadonlyArray<Element> {
  expect(container.querySelectorAll(".recharts-default-legend")).toHaveLength(1);
  return Array.from(container.querySelectorAll(".recharts-default-legend .recharts-legend-item"));
}

function expectLegendLabels(
  container: Element,
  expectedLabels: ReadonlyArray<{
    textContent: string;
    fill: string | null | undefined;
    stroke?: string;
  }>,
): void {
  const expectsStroke = expectedLabels.some((label) => label.stroke != null);
  const actualLabels = assertHasLegend(container).map((legend) => ({
    textContent: legend.textContent,
    fill: legend.querySelector(".recharts-legend-icon")?.getAttribute("fill"),
    stroke: expectsStroke
      ? legend.querySelector(".recharts-legend-icon")?.getAttribute("stroke")
      : undefined,
  }));
  expect(actualLabels).toEqual(expectedLabels);
}

describe("Legend.itemSorter", () => {
  describe("with default content", () => {
    test("sorts legend items by label value by default", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      expectLegendLabels(container, [
        { textContent: "A", stroke: "#3182bd", fill: "none" },
        { textContent: "B", stroke: "#3182bd", fill: "none" },
      ]);
    });

    test("sorts legend items when itemSorter=dataKey", () => {
      const { container } = render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend itemSorter="dataKey" />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      expectLegendLabels(container, [
        { textContent: "B", stroke: "#3182bd", fill: "none" },
        { textContent: "A", stroke: "#3182bd", fill: "none" },
      ]);
    });
  });

  describe("when Legend content is a function", () => {
    it("should pass legend items sorted by label value by default", () => {
      const customContent = vi.fn();

      render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend content={customContent} />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      expect(customContent).toHaveBeenLastCalledWith({
        align: "center",
        chartHeight: 500,
        chartWidth: 500,
        content: customContent,
        iconSize: 14,
        inactiveColor: "#ccc",
        itemSorter: "value",
        labelStyle: {},
        layout: "horizontal",
        margin: { bottom: 5, left: 5, right: 5, top: 5 },
        payload: [
          {
            color: "#3182bd",
            dataKey: "value",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "value",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "A",
              shape: LineDrawShape,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "A",
          },
          {
            color: "#3182bd",
            dataKey: "percent",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "percent",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "B",
              shape: LineDrawShape,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "B",
          },
        ],
        verticalAlign: "bottom",
        width: 490,
      });
    });

    it("should pass legend items sorted by dataKey when itemSorter is set", () => {
      const customContent = vi.fn();

      render(() => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend content={customContent} itemSorter="dataKey" />
          <Line dataKey="percent" name="B" />
          <Line dataKey="value" name="A" />
        </LineChart>
      ));
      expect(customContent).toHaveBeenLastCalledWith({
        align: "center",
        chartHeight: 500,
        chartWidth: 500,
        content: customContent,
        iconSize: 14,
        inactiveColor: "#ccc",
        itemSorter: "dataKey",
        labelStyle: {},
        layout: "horizontal",
        margin: { bottom: 5, left: 5, right: 5, top: 5 },
        payload: [
          {
            color: "#3182bd",
            dataKey: "percent",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "percent",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "B",
              shape: LineDrawShape,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "B",
          },
          {
            color: "#3182bd",
            dataKey: "value",
            inactive: false,
            payload: {
              activeDot: true,
              animateNewValues: true,
              animationBegin: 0,
              animationDuration: 1500,
              animationEasing: "ease",
              connectNulls: false,
              dataKey: "value",
              dot: true,
              fill: "#fff",
              hide: false,
              isAnimationActive: "auto",
              label: false,
              legendType: "line",
              name: "A",
              shape: LineDrawShape,
              stroke: "#3182bd",
              strokeWidth: 1,
              type: "linear",
              xAxisId: 0,
              yAxisId: 0,
              zIndex: DefaultZIndexes.line,
            },
            type: "line",
            value: "A",
          },
        ],
        verticalAlign: "bottom",
        width: 490,
      });
    });
  });

  // Click a legend item by its label text. The legend renders into a Portal in
  // document.body, and Solid's <For> recreates the items each render, so we always
  // re-query the live legend item before clicking, then flush so the signal write
  // and the downstream payload recompute settle.
  function clickLegendItemByText(label: string): void {
    const item = [...document.querySelectorAll(".recharts-legend-item")].find(
      (n) => n.textContent === label,
    );
    assertNotNull(item);
    (item as HTMLElement).click();
  }

  describe("when Legend content hides and shows items on click", () => {
    // The host (the user's chart) owns the hidden-state. Legend just forwards
    // onClick; the user's handler flips `hide`/`stroke` on the series, which
    // re-publishes the legend payload with the new `inactive`/`color`.
    function MyLegendHidingComponent(): JSX.Element {
      const [hiddenItems, setHiddenItems] = createSignal<ReadonlyArray<string>>([]);

      const handleClick = ({ dataKey }: LegendPayload): void => {
        if (typeof dataKey !== "string") {
          return;
        }
        setHiddenItems((prev) =>
          prev.includes(dataKey) ? prev.filter((key) => key !== dataKey) : [...prev, dataKey],
        );
      };

      return (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend itemSorter="dataKey" onClick={handleClick} />
          <Line
            dataKey="percent"
            name="B"
            stroke={hiddenItems().includes("percent") ? "gold" : "red"}
            hide={hiddenItems().includes("percent")}
          />
          <Line
            dataKey="value"
            name="A"
            stroke={hiddenItems().includes("value") ? "silver" : "blue"}
            hide={hiddenItems().includes("value")}
          />
        </LineChart>
      );
    }

    describe("on initial render", () => {
      it("should render all items sorted by dataKey", () => {
        const { container } = render(() => <MyLegendHidingComponent />);
        expectLegendLabels(container, [
          { textContent: "B", stroke: "red", fill: "none" },
          { textContent: "A", stroke: "blue", fill: "none" },
        ]);
      });
    });

    describe("after clicking on legend items", () => {
      it("should hide the clicked item and keep the order", () => {
        const { container } = render(() => <MyLegendHidingComponent />);
        clickLegendItemByText("A");
        expectLegendLabels(container, [
          { textContent: "B", stroke: "red", fill: "none" },
          { textContent: "A", stroke: "#ccc", fill: "none" },
        ]);

        clickLegendItemByText("B");
        expectLegendLabels(container, [
          { textContent: "B", stroke: "#ccc", fill: "none" },
          { textContent: "A", stroke: "#ccc", fill: "none" },
        ]);
      });

      it("should show the clicked item again and keep the order", () => {
        const { container } = render(() => <MyLegendHidingComponent />);
        clickLegendItemByText("A");
        clickLegendItemByText("B");
        expectLegendLabels(container, [
          { textContent: "B", stroke: "#ccc", fill: "none" },
          { textContent: "A", stroke: "#ccc", fill: "none" },
        ]);

        clickLegendItemByText("B");
        expectLegendLabels(container, [
          { textContent: "B", stroke: "red", fill: "none" },
          { textContent: "A", stroke: "#ccc", fill: "none" },
        ]);

        clickLegendItemByText("A");
        expectLegendLabels(container, [
          { textContent: "B", stroke: "red", fill: "none" },
          { textContent: "A", stroke: "blue", fill: "none" },
        ]);
      });
    });
  });

  describe("when Legend content hides and shows items on click and also it has a custom content", () => {
    const spy = vi.fn();

    beforeEach(() => {
      spy.mockClear();
    });

    // Custom function-form content: renders one <button> per payload item that
    // calls the click handler closed over from the host. (Reference threads the
    // handler through a React context; Solid closes over it directly.) Clicking a
    // button flips the series hide/stroke, which republishes the payload — and the
    // content fn re-runs with the new `inactive`/`color`, captured by `spy`.
    function makeCustomContent(handleClick: (entry: LegendPayload) => void) {
      return (props: DefaultLegendContentProps): JSX.Element => {
        spy(props);
        assertNotNull(props.payload);
        return (
          <ul>
            <For each={props.payload}>
              {(entry) => (
                <li style={{ color: entry.color }}>
                  <button type="button" onClick={() => handleClick(entry)}>
                    {entry.value}
                  </button>
                </li>
              )}
            </For>
          </ul>
        );
      };
    }

    function clickButtonByText(label: string): void {
      const button = [...document.querySelectorAll("button")].find((n) => n.textContent === label);
      assertNotNull(button);
      button.click();
    }

    function useItemHiding(): {
      hiddenItems: () => ReadonlyArray<string>;
      handleClick: (entry: LegendPayload) => void;
    } {
      const [hiddenItems, setHiddenItems] = createSignal<ReadonlyArray<string>>([]);
      const handleClick = ({ dataKey }: LegendPayload): void => {
        if (typeof dataKey !== "string") {
          return;
        }
        setHiddenItems((prev) =>
          prev.includes(dataKey) ? prev.filter((key) => key !== dataKey) : [...prev, dataKey],
        );
      };
      return { hiddenItems, handleClick };
    }

    describe("in LineChart", () => {
      // https://github.com/recharts/recharts/issues/5992
      function MyLegendHidingLineChartTestCase(): JSX.Element {
        const { hiddenItems, handleClick } = useItemHiding();
        return (
          <LineChart width={500} height={500} data={numericalData}>
            <Legend itemSorter="dataKey" content={makeCustomContent(handleClick)} />
            <Line
              dataKey="percent"
              name="B"
              stroke={hiddenItems().includes("percent") ? "gold" : "red"}
              hide={hiddenItems().includes("percent")}
            />
            <Line
              dataKey="value"
              name="A"
              stroke={hiddenItems().includes("value") ? "silver" : "blue"}
              hide={hiddenItems().includes("value")}
            />
          </LineChart>
        );
      }

      describe("on initial render", () => {
        it("should render all items sorted by dataKey", () => {
          render(() => <MyLegendHidingLineChartTestCase />);
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "blue",
                  inactive: false,
                }),
              ],
            }),
          );
        });
      });

      describe("after clicking on legend items", () => {
        it("should hide the clicked item and keep the order", () => {
          render(() => <MyLegendHidingLineChartTestCase />);
          clickButtonByText("A");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );

          clickButtonByText("B");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "gold",
                  inactive: true,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );
        });
      });
    });

    describe("in stacked AreaChart", () => {
      function MyLegendHidingAreaChartTestCase(): JSX.Element {
        const { hiddenItems, handleClick } = useItemHiding();
        return (
          <AreaChart width={500} height={500} data={numericalData}>
            <Legend itemSorter="dataKey" content={makeCustomContent(handleClick)} />
            <Area
              dataKey="percent"
              name="B"
              stackId="1"
              stroke={hiddenItems().includes("percent") ? "gold" : "red"}
              hide={hiddenItems().includes("percent")}
            />
            <Area
              dataKey="value"
              name="A"
              stackId="1"
              stroke={hiddenItems().includes("value") ? "silver" : "blue"}
              hide={hiddenItems().includes("value")}
            />
          </AreaChart>
        );
      }

      describe("on initial render", () => {
        it("should render all items sorted by dataKey", () => {
          render(() => <MyLegendHidingAreaChartTestCase />);
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "blue",
                  inactive: false,
                }),
              ],
            }),
          );
        });
      });

      describe("after clicking on legend items", () => {
        it("should hide the clicked item and keep the order", () => {
          render(() => <MyLegendHidingAreaChartTestCase />);
          clickButtonByText("A");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );

          clickButtonByText("B");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "gold",
                  inactive: true,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );
        });

        it("should show the clicked item again and keep the order", () => {
          render(() => <MyLegendHidingAreaChartTestCase />);
          clickButtonByText("A");
          clickButtonByText("B");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "gold",
                  inactive: true,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );

          clickButtonByText("B");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "silver",
                  inactive: true,
                }),
              ],
            }),
          );

          clickButtonByText("A");
          expectLastCalledWith(
            spy,
            expect.objectContaining({
              payload: [
                expect.objectContaining({
                  value: "B",
                  dataKey: "percent",
                  color: "red",
                  inactive: false,
                }),
                expect.objectContaining({
                  value: "A",
                  dataKey: "value",
                  color: "blue",
                  inactive: false,
                }),
              ],
            }),
          );
        });
      });
    });
  });
});
