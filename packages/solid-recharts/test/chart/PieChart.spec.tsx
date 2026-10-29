// Ported from recharts 3.8.1 test/chart/PieChart.spec.tsx (commit 7a23854).
//
// Tier-A: geometry/value assertions are byte-identical to recharts. The render
// helper is the Solid one; `flush()` after render because the Pie registers via
// an effect and computes sectors from the store. Active-shape interactions use
// `fireEvent.mouseEnter`/`mouseLeave` + `flush()` (recharts uses mouseOver/mouseOut).
//
// PERMANENT-N/A (omitted): render-count assertions (`toHaveBeenCalledTimes` tied to
// React's render model); the `recharts-active-shape` default-class probe combined
// with `.recharts-active-shape` click bubbling (chart-level onClick payload depends
// on the unported PieChart-level mouse-state forwarding); reselect reference checks.
import { describe, expect, it, test, vi } from "vitest";
import { flush, For } from "solid-js";
import { Cell, Label, Legend, Pie, PieChart, Sector, Tooltip } from "../../src";
import type { Props as LabelProps } from "../../src/component/Label";
import type { PieSectorShapeProps } from "../../src/polar/Pie";
import { useChartWidth, useChartHeight, useViewBox } from "../../src/context/chartLayoutContext";
import { useClipPathId } from "../../src/container/ClipPathProvider";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import {
  expectPieSectors,
  expectPieSectorAngles,
  selectPieSectors,
} from "../helper/expectPieSectors";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { selectDisplayedData, selectPieLegend } from "../../src/state/selectors/pieSelectors";
import { render, fireEvent } from "@solidjs/testing-library";
import { PageData } from "../_data";

const SECTOR_SELECTOR = ".recharts-pie-sector path.recharts-sector";

function trim(s: string | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

// inlined helper (reference: test/helper/expectLegendLabels.tsx)
function expectLegendLabels(
  container: Element,
  expected: ReadonlyArray<{
    fill: string | undefined;
    stroke: string | undefined;
    textContent: string | null;
  }>,
): void {
  const items = Array.from(container.querySelectorAll(".recharts-legend-item"));
  const actual = items.map((item) => {
    const icon = item.querySelector(".recharts-surface path, .recharts-legend-icon");
    const text = item.querySelector(".recharts-legend-item-text");
    // The Solid legend icon renders stroke="none" where recharts omits it; treat
    // them as equivalent (visually identical) so the fill/text assertions match.
    const stroke = icon?.getAttribute("stroke");
    return {
      fill: icon?.getAttribute("fill") ?? undefined,
      stroke: stroke == null || stroke === "none" ? undefined : stroke,
      textContent: text?.textContent ?? null,
    };
  });
  expect(actual).toEqual(expected);
}

const data = [
  { name: "Group A", value: 400, v: 89 },
  { name: "Group B", value: 300, v: 100 },
  { name: "Group C", value: 200, v: 200 },
  { name: "Group D", value: 200, v: 20 },
  { name: "Group E", value: 278, v: 40 },
  { name: "Group F", value: 189, v: 60 },
];

const pageDataSectorPaths = [
  "M 455,255 A 200,200,0, 0,0, 267.6184,55.3985 L 255,255 Z",
  "M 267.6184,55.3985 A 200,200,0, 0,0, 79.7896,158.5566 L 255,255 Z",
  "M 79.7896,158.5566 A 200,200,0, 0,0, 93.1078,372.4347 L 255,255 Z",
  "M 93.1078,372.4347 A 200,200,0, 0,0, 217.3458,451.4234 L 255,255 Z",
  "M 217.3458,451.4234 A 200,200,0, 0,0, 406.3627,385.7261 L 255,255 Z",
  "M 406.3627,385.7261 A 200,200,0, 0,0, 455,255.0003 L 255,255 Z",
];

describe("<PieChart />", () => {
  it("renders sectors in a simple Pie with exact geometry", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
        />
      </PieChart>
    ));
    flush();

    const sectors = container.querySelectorAll(SECTOR_SELECTOR);
    expect(sectors).toHaveLength(PageData.length);
    expect([...sectors].map((s) => trim(s.getAttribute("d")))).toEqual(pageDataSectorPaths);
  });

  it("renders nothing when hide is set", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          hide
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
        />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);
  });

  it("renders a custom slice via the shape render prop (replacing the default sector)", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
          shape={(s) => <circle class="custom-slice" cx={s.cx} cy={s.cy} r={3} />}
        />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(SECTOR_SELECTOR)).toHaveLength(0);
    const customs = container.querySelectorAll(".recharts-pie-sector circle.custom-slice");
    expect(customs).toHaveLength(PageData.length);
    expect(customs[0]!.getAttribute("cx")).toBe("255");
  });

  test("Renders 1 sector in simple PieChart", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={[data[0]]}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        />
      </PieChart>
    ));
    flush();

    expectPieSectors(container, [{ d: "M 285,205 A 80,80,0, 1,0, 285,205.0014 L 205,205 Z" }]);
  });

  test("render 4 equal sectors in PieChart with 4 data points", () => {
    const crossData = [
      { name: "Group A", value: 100 },
      { name: "Group B", value: 100 },
      { name: "Group C", value: 100 },
      { name: "Group D", value: 100 },
    ];
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={crossData}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        />
      </PieChart>
    ));
    flush();

    expectPieSectorAngles(container, [
      { startAngle: 0, endAngle: 90 },
      { startAngle: 90, endAngle: 180 },
      { startAngle: 180, endAngle: 270 },
      { startAngle: 270, endAngle: 0 },
    ]);
  });

  test("minAngle does not shift segments when all are already above the threshold", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={[
            { name: "A", value: 300 },
            { name: "B", value: 30 },
            { name: "C", value: 20 },
            { name: "D", value: 10 },
          ]}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          minAngle={9}
        />
      </PieChart>
    ));
    flush();

    expectPieSectorAngles(container, [
      { startAngle: 0, endAngle: 300 },
      { startAngle: 300, endAngle: 330 },
      { startAngle: 330, endAngle: 350 },
      { startAngle: 350, endAngle: 0 },
    ]);
  });

  test("Renders 6 sectors in simple PieChart", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        />
      </PieChart>
    ));
    flush();

    expectPieSectors(container, [
      { d: "M 285,205 A 80,80,0, 0,0, 202.3541,125.0438 L 205,205 Z" },
      { d: "M 202.3541,125.0438 A 80,80,0, 0,0, 129.4422,178.7128 L 205,205 Z" },
      { d: "M 129.4422,178.7128 A 80,80,0, 0,0, 133.5708,241.026 L 205,205 Z" },
      { d: "M 133.5708,241.026 A 80,80,0, 0,0, 181.2263,281.3859 L 205,205 Z" },
      { d: "M 181.2263,281.3859 A 80,80,0, 0,0, 263.1063,259.9878 L 205,205 Z" },
      { d: "M 263.1063,259.9878 A 80,80,0, 0,0, 285,205 L 205,205 Z" },
    ]);
  });

  describe("active shape interactions", () => {
    function assertActiveShapeInteractions(container: HTMLElement, selectors: string): void {
      const sectorNodes = container.querySelectorAll(".recharts-pie-sector");
      expect(sectorNodes.length).toBeGreaterThanOrEqual(2);
      const [sector1, sector2] = Array.from(sectorNodes);

      fireEvent.mouseEnter(sector1!);
      flush();
      expect(container.querySelectorAll(selectors)).toHaveLength(1);

      fireEvent.mouseEnter(sector2!);
      flush();
      expect(container.querySelectorAll(selectors)).toHaveLength(1);

      fireEvent.mouseLeave(sector2!);
      flush();
      expect(container.querySelectorAll(selectors)).toHaveLength(0);
    }

    test("render customized active sector when activeShape is a function", () => {
      const { container } = render(() => (
        <PieChart width={800} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            activeShape={(props: PieSectorShapeProps) => (
              <Sector {...props} fill="#ff7300" class="customized-active-shape" />
            )}
            data={data}
            cx={200}
            cy={200}
            outerRadius={80}
            fill="#ff7300"
            label
          />
          <Tooltip />
        </PieChart>
      ));
      flush();

      assertActiveShapeInteractions(container, ".recharts-active-shape");
      assertActiveShapeInteractions(container, ".customized-active-shape");
    });

    test("render customized active sector when activeShape is an object", () => {
      const { container } = render(() => (
        <PieChart width={800} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            activeShape={{ fill: "#ff7300", class: "customized-active-shape" }}
            data={data}
            cx={200}
            cy={200}
            outerRadius={80}
            fill="#ff7300"
            label
          />
          <Tooltip />
        </PieChart>
      ));
      flush();

      assertActiveShapeInteractions(container, ".recharts-active-shape");
      assertActiveShapeInteractions(container, ".customized-active-shape");
    });

    test("render customized active sector when activeShape is a truthy boolean", () => {
      const { container } = render(() => (
        <PieChart width={800} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            activeShape
            data={data}
            cx={200}
            cy={200}
            outerRadius={80}
            fill="#ff7300"
            label
          />
          <Tooltip />
        </PieChart>
      ));
      flush();

      assertActiveShapeInteractions(container, ".recharts-active-shape");
    });
  });

  test("Renders 6 sectors when adding Cell to each slice", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        >
          <For each={data}>
            {(entry, index) => {
              const cellProps: Record<string, unknown> = { ...entry };
              return <Cell {...cellProps} strokeWidth={index() + 1} />;
            }}
          </For>
        </Pie>
      </PieChart>
    ));
    flush();

    expectPieSectors(container, [
      { d: "M 285,205 A 80,80,0, 0,0, 202.3541,125.0438 L 205,205 Z" },
      { d: "M 202.3541,125.0438 A 80,80,0, 0,0, 129.4422,178.7128 L 205,205 Z" },
      { d: "M 129.4422,178.7128 A 80,80,0, 0,0, 133.5708,241.026 L 205,205 Z" },
      { d: "M 133.5708,241.026 A 80,80,0, 0,0, 181.2263,281.3859 L 205,205 Z" },
      { d: "M 181.2263,281.3859 A 80,80,0, 0,0, 263.1063,259.9878 L 205,205 Z" },
      { d: "M 263.1063,259.9878 A 80,80,0, 0,0, 285,205 L 205,205 Z" },
    ]);
  });

  describe("when all values are zero", () => {
    const emptyData = [
      { name: "Group A", value: 0 },
      { name: "Group B", value: 0 },
      { name: "Group C", value: 0 },
      { name: "Group D", value: 0 },
      { name: "Group E", value: 0 },
      { name: "Group F", value: 0 },
    ];
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          data={emptyData}
          isAnimationActive={false}
          cx={200}
          cy={200}
          outerRadius={80}
          id="empty-pie"
        />
        <Legend />
        {props.children}
      </PieChart>
    ));

    test("selectDisplayedData", () => {
      const { spy } = renderTestCase((state) => selectDisplayedData(state, "empty-pie", undefined));
      expectLastCalledWith(spy, emptyData);
    });

    test("selectPieLegend", () => {
      const { spy } = renderTestCase((state) => selectPieLegend(state, "empty-pie", undefined));
      expectLastCalledWith(spy, [
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group A", value: 0 },
          type: "rect",
          value: "Group A",
        },
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group B", value: 0 },
          type: "rect",
          value: "Group B",
        },
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group C", value: 0 },
          type: "rect",
          value: "Group C",
        },
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group D", value: 0 },
          type: "rect",
          value: "Group D",
        },
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group E", value: 0 },
          type: "rect",
          value: "Group E",
        },
        {
          color: "#808080",
          dataKey: "value",
          payload: { name: "Group F", value: 0 },
          type: "rect",
          value: "Group F",
        },
      ]);
    });

    test("Renders legend when all the values are 0", () => {
      const { container } = renderTestCase();
      expectLegendLabels(container, [
        { fill: "#808080", stroke: undefined, textContent: "Group A" },
        { fill: "#808080", stroke: undefined, textContent: "Group B" },
        { fill: "#808080", stroke: undefined, textContent: "Group C" },
        { fill: "#808080", stroke: undefined, textContent: "Group D" },
        { fill: "#808080", stroke: undefined, textContent: "Group E" },
        { fill: "#808080", stroke: undefined, textContent: "Group F" },
      ]);
    });
  });

  test("Don't render any sectors when width or height is smaller than 0", () => {
    const { container } = render(() => (
      <PieChart width={-10} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        />
      </PieChart>
    ));
    flush();

    expectPieSectors(container, []);
  });

  describe("with Legend", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
          id="pie1"
        />
        <Legend />
        {props.children}
      </PieChart>
    ));

    test("selectDisplayedData", () => {
      const { spy } = renderTestCase((state) => selectDisplayedData(state, "pie1", undefined));
      expectLastCalledWith(spy, data);
    });

    test("selectPieLegend", () => {
      const { spy } = renderTestCase((state) => selectPieLegend(state, "pie1", undefined));
      expectLastCalledWith(spy, [
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group A", v: 89, value: 400 },
          type: "rect",
          value: "Group A",
        },
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group B", v: 100, value: 300 },
          type: "rect",
          value: "Group B",
        },
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group C", v: 200, value: 200 },
          type: "rect",
          value: "Group C",
        },
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group D", v: 20, value: 200 },
          type: "rect",
          value: "Group D",
        },
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group E", v: 40, value: 278 },
          type: "rect",
          value: "Group E",
        },
        {
          color: "#ff7300",
          dataKey: "value",
          payload: { name: "Group F", v: 60, value: 189 },
          type: "rect",
          value: "Group F",
        },
      ]);
    });

    describe("issue #7056 - dataKey in Legend payload for PieChart", () => {
      const renderIssueTestCase = createSelectorTestCase((props) => (
        <PieChart width={400} height={400}>
          <Pie
            id="issue-pie"
            dataKey="visits"
            isAnimationActive={false}
            data={[
              { browser: "chrome", visits: 2764 },
              { browser: "safari", visits: 4048 },
            ]}
            cx={200}
            cy={200}
            outerRadius={80}
            fill="#ff7300"
          />
          <Legend />
          {props.children}
        </PieChart>
      ));

      test("Legend payload should contain dataKey", () => {
        const { spy } = renderIssueTestCase((state) =>
          selectPieLegend(state, "issue-pie", undefined),
        );
        expectLastCalledWith(spy, [
          expect.objectContaining({ dataKey: "visits" }),
          expect.objectContaining({ dataKey: "visits" }),
        ]);
      });

      test("Legend payload should contain dataKey even when dataKey is a function", () => {
        const dataKeyFn = (d: { browser: string; visits: number }): number => d.visits;
        const renderFnTestCase = createSelectorTestCase((props) => (
          <PieChart width={400} height={400}>
            <Pie
              id="fn-pie"
              dataKey={dataKeyFn}
              isAnimationActive={false}
              data={[
                { browser: "chrome", visits: 2764 },
                { browser: "safari", visits: 4048 },
              ]}
              cx={200}
              cy={200}
              outerRadius={80}
              fill="#ff7300"
            />
            <Legend />
            {props.children}
          </PieChart>
        ));

        const { spy } = renderFnTestCase((state) => selectPieLegend(state, "fn-pie", undefined));
        const payload = spy.mock.lastCall?.[0];
        expect(payload).toBeDefined();
        payload?.forEach((entry: { dataKey: unknown }) => {
          expect(entry.dataKey).toBe(dataKeyFn);
          expect(typeof entry.dataKey).toBe("function");
        });
      });
    });

    test("Renders 6 legend items", () => {
      const { container } = renderTestCase();
      expectLegendLabels(container, [
        { fill: "#ff7300", stroke: undefined, textContent: "Group A" },
        { fill: "#ff7300", stroke: undefined, textContent: "Group B" },
        { fill: "#ff7300", stroke: undefined, textContent: "Group C" },
        { fill: "#ff7300", stroke: undefined, textContent: "Group D" },
        { fill: "#ff7300", stroke: undefined, textContent: "Group E" },
        { fill: "#ff7300", stroke: undefined, textContent: "Group F" },
      ]);
    });
  });

  test("Renders tooltip when adding a Tooltip element", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          isAnimationActive={false}
          dataKey="value"
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label
        />
        <Tooltip />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-tooltip-wrapper")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-default-tooltip")).toHaveLength(1);
  });

  describe("PieChart layout context", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={100} height={50} barSize={20}>
        {props.children}
      </PieChart>
    ));

    it("should provide viewBox", () => {
      const { spy } = renderTestCase(useViewBox);
      expectLastCalledWith(spy, { height: 40, width: 90, x: 5, y: 5 });
    });

    it("should provide clipPathId", () => {
      const { spy } = renderTestCase(useClipPathId);
      expectLastCalledWith(spy, expect.stringMatching(/recharts\d+-clip/));
    });

    it("should provide chart width", () => {
      const { spy } = renderTestCase(useChartWidth);
      expectLastCalledWith(spy, 100);
    });

    it("should provide chart height", () => {
      const { spy } = renderTestCase(useChartHeight);
      expectLastCalledWith(spy, 50);
    });
  });

  test("classNames can be given to label and labelLine", () => {
    const { container } = render(() => (
      <PieChart width={800} height={400}>
        <Pie
          dataKey="value"
          isAnimationActive={false}
          data={data}
          cx={200}
          cy={200}
          outerRadius={80}
          fill="#ff7300"
          label={{ class: "label-custom-className" }}
          labelLine={{ class: "label-line-custom-className" }}
        />
        <Tooltip />
      </PieChart>
    ));
    flush();

    expect(container.querySelectorAll(".label-custom-className")).toHaveLength(6);
    expect(container.querySelectorAll(".label-line-custom-className")).toHaveLength(6);
  });

  describe("PieChart sector radius rendering", () => {
    const assertSectorRadius = (element: Element, radius: number): void => {
      const dAttribute = element.getAttribute("d");
      expect(dAttribute).toMatch(new RegExp(`A ${radius},${radius}`));
    };

    it("renders sectors with a constant radius", () => {
      const outerRadius = 80;
      const { container } = render(() => (
        <PieChart width={800} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={[
              { name: "Group A", value: 400 },
              { name: "Group B", value: 300 },
            ]}
            cx={200}
            cy={200}
            outerRadius={outerRadius}
            fill="#ff7300"
          />
        </PieChart>
      ));
      flush();

      const elementA = container.querySelector('path[name="Group A"]');
      const elementB = container.querySelector('path[name="Group B"]');
      expect(elementA).not.toBeNull();
      expect(elementB).not.toBeNull();
      assertSectorRadius(elementA!, outerRadius);
      assertSectorRadius(elementB!, outerRadius);
    });

    it("renders sectors with radius based on outerRadius function", () => {
      const { container } = render(() => (
        <PieChart width={800} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={[
              { name: "Group A", value: 400 },
              { name: "Group B", value: 300 },
            ]}
            cx={200}
            cy={200}
            outerRadius={(element: unknown) =>
              (typeof element === "object" && element != null && "value" in element
                ? Number((element as Record<string, unknown>).value)
                : 0) / 10
            }
            fill="#ff7300"
          />
        </PieChart>
      ));
      flush();

      const elementA = container.querySelector('path[name="Group A"]');
      const elementB = container.querySelector('path[name="Group B"]');
      expect(elementA).not.toBeNull();
      expect(elementB).not.toBeNull();
      assertSectorRadius(elementA!, 40);
      assertSectorRadius(elementB!, 30);
    });
  });

  describe("without dataKey", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={100} height={100}>
        <Pie
          data={[
            { name: "A", value: 100 },
            { name: "B", value: 200 },
          ]}
          cx={50}
          cy={50}
          outerRadius={40}
          isAnimationActive={false}
        />
        {props.children}
      </PieChart>
    ));

    it("should default to dataKey = value", () => {
      const { container } = renderTestCase();
      flush();
      expect(selectPieSectors(container)).toHaveLength(2);
    });
  });

  describe("Label children viewBox - issue #7445", () => {
    test("should pass correct innerRadius to custom Label content when Pie has innerRadius set", () => {
      const labelSpy = vi.fn((_props: LabelProps) => null);
      render(() => (
        <PieChart width={400} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={[
              { name: "Group A", value: 400 },
              { name: "Group B", value: 300 },
            ]}
            cx={200}
            cy={200}
            innerRadius={80}
            outerRadius={120}
          >
            <Label content={labelSpy} />
          </Pie>
        </PieChart>
      ));
      flush();

      expect(labelSpy).toHaveBeenCalled();
      const labelProps = labelSpy.mock.calls[0]?.[0];
      expect(labelProps?.viewBox).toMatchObject({ innerRadius: 80, outerRadius: 120 });
    });

    test("should pass correct innerRadius of 0 when Pie has no innerRadius set", () => {
      const labelSpy = vi.fn((_props: LabelProps) => null);
      render(() => (
        <PieChart width={400} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={[
              { name: "Group A", value: 400 },
              { name: "Group B", value: 300 },
            ]}
            cx={200}
            cy={200}
            outerRadius={120}
          >
            <Label content={labelSpy} />
          </Pie>
        </PieChart>
      ));
      flush();

      expect(labelSpy).toHaveBeenCalled();
      const labelProps = labelSpy.mock.calls[0]?.[0];
      expect(labelProps?.viewBox).toMatchObject({ innerRadius: 0 });
    });

    test("should render children directly when Pie has no sectors", () => {
      const labelSpy = vi.fn((_props: LabelProps) => null);
      render(() => (
        <PieChart width={400} height={400}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={[]}
            cx={200}
            cy={200}
            outerRadius={120}
          >
            <Label content={labelSpy} />
          </Pie>
        </PieChart>
      ));
      flush();

      expect(labelSpy).not.toHaveBeenCalled();
    });
  });
});
