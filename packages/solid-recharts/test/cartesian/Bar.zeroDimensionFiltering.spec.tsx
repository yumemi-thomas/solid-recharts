// Ported from recharts 3.8.1 test/cartesian/Bar.zeroDimensionFiltering.spec.tsx (commit 7a23854).
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { Bar, BarChart, BarStack, XAxis, YAxis } from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { render } from "../helper/render";
import { selectBarRectangles } from "../../src/state/selectors/barSelectors";
import { getAllBars } from "../helper/expectBars";

function generateSparseStackedData(totalCategories: number, nonZeroCount: number) {
  const data: Array<{ category: string; stackA: number; stackB: number; stackC: number }> = [];
  const nonZeroIndices = new Set<number>();

  while (nonZeroIndices.size < nonZeroCount) {
    nonZeroIndices.add(Math.floor(Math.random() * totalCategories));
  }

  for (let i = 0; i < totalCategories; i++) {
    if (nonZeroIndices.has(i)) {
      data.push({
        category: `cat-${i}`,
        stackA: Math.floor(Math.random() * 100) + 10,
        stackB: Math.floor(Math.random() * 100) + 10,
        stackC: Math.floor(Math.random() * 100) + 10,
      });
    } else {
      data.push({
        category: `cat-${i}`,
        stackA: 0,
        stackB: 0,
        stackC: 0,
      });
    }
  }

  return data;
}

describe("Bar zero-dimension filtering", () => {
  it("should filter zero-dimension rectangles inside BarStack and preserve originalDataIndex", () => {
    const data = [
      { category: "A", stackA: -100, stackB: 60, stackC: 40 },
      { category: "B", stackA: 80, stackB: -30, stackC: 20 },
    ];

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={300} height={200} data={data} stackOffset="positive">
        <XAxis dataKey="category" />
        <YAxis />
        <BarStack>
          <Bar id="bar-a" dataKey="stackA" fill="#8884d8" isAnimationActive={false} />
          <Bar id="bar-b" dataKey="stackB" fill="#82ca9d" isAnimationActive={false} />
          <Bar id="bar-c" dataKey="stackC" fill="#ffc658" isAnimationActive={false} />
          {props.children}
        </BarStack>
      </BarChart>
    ));

    const { spy } = renderTestCase((state) =>
      selectBarRectangles(state, "bar-a", false, undefined),
    );
    const rectangles = spy.mock.lastCall?.[0] ?? [];

    expect(rectangles.length).toBe(1);
    expect(rectangles[0]).toEqual(
      expect.objectContaining({
        originalDataIndex: 1,
      }),
    );
    expect(
      rectangles.some(
        (rect: { width: number; height: number }) => rect.width === 0 || rect.height === 0,
      ),
    ).toBe(false);
  });

  it("should keep BarStack clip-path indices aligned after filtering sparse rectangles", () => {
    const data = [
      { category: "A", stackA: 0 },
      { category: "B", stackA: 12 },
    ];

    const { container } = render(() => (
      <BarChart width={300} height={200} data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <BarStack stackId="sparse-stack" radius={8}>
          <Bar dataKey="stackA" fill="#8884d8" isAnimationActive={false} />
        </BarStack>
      </BarChart>
    ));
    flush();

    const clippedBarLayers = container.querySelectorAll(".recharts-bar-rectangle[clip-path]");
    expect(clippedBarLayers).toHaveLength(1);
    expect(clippedBarLayers[0]!.getAttribute("clip-path")).toBe(
      "url(#recharts-bar-stack-clip-path-sparse-stack-1)",
    );

    expect(
      container.querySelector("clipPath#recharts-bar-stack-clip-path-sparse-stack-1"),
    ).not.toBeNull();
    expect(
      container.querySelector("clipPath#recharts-bar-stack-clip-path-sparse-stack-0"),
    ).toBeNull();
  });

  it("should filter out zero-dimension rectangles from selectBarRectangles", () => {
    const totalCategories = 100;
    const nonZeroCategories = 10;
    const data = generateSparseStackedData(totalCategories, nonZeroCategories);

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <Bar id="bar-a" dataKey="stackA" stackId="stack" fill="#8884d8" isAnimationActive={false} />
        <Bar id="bar-b" dataKey="stackB" stackId="stack" fill="#82ca9d" isAnimationActive={false} />
        <Bar id="bar-c" dataKey="stackC" stackId="stack" fill="#ffc658" isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    const { spy } = renderTestCase((state) =>
      selectBarRectangles(state, "bar-a", false, undefined),
    );
    const rectangles = spy.mock.lastCall?.[0] ?? [];

    expect(rectangles.length).toBeLessThanOrEqual(nonZeroCategories);

    rectangles.forEach((rect: { width: number; height: number }) => {
      expect(rect.width).not.toBe(0);
      expect(rect.height).not.toBe(0);
    });
  });

  it("should render only non-zero rectangles as DOM elements", () => {
    const totalCategories = 50;
    const nonZeroCategories = 5;
    const data = generateSparseStackedData(totalCategories, nonZeroCategories);

    const { container } = render(() => (
      <BarChart width={800} height={400} data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <Bar dataKey="stackA" stackId="stack" fill="#8884d8" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const bars = getAllBars(container);

    expect(bars.length).toBeLessThanOrEqual(nonZeroCategories);
  });

  it("should reduce component tree size proportionally to sparsity", { timeout: 30_000 }, () => {
    const scenarios = [
      { totalCategories: 100, nonZeroCategories: 10 },
      { totalCategories: 500, nonZeroCategories: 25 },
      { totalCategories: 1000, nonZeroCategories: 50 },
    ];

    scenarios.forEach(({ totalCategories, nonZeroCategories }) => {
      const data = generateSparseStackedData(totalCategories, nonZeroCategories);

      const { container, unmount } = render(() => (
        <BarChart width={800} height={400} data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Bar dataKey="stackA" stackId="stack" fill="#8884d8" isAnimationActive={false} />
          <Bar dataKey="stackB" stackId="stack" fill="#82ca9d" isAnimationActive={false} />
          <Bar dataKey="stackC" stackId="stack" fill="#ffc658" isAnimationActive={false} />
        </BarChart>
      ));
      flush();

      const actualBars = getAllBars(container).length;
      const potentialBars = totalCategories * 3;
      const reductionPercent = Math.round((1 - actualBars / potentialBars) * 100);

      expect(actualBars).toBeLessThan(potentialBars);
      expect(reductionPercent).toBeGreaterThanOrEqual(90);

      unmount();
    });
  });

  it("should reduce rectangle count at selector level", () => {
    const totalCategories = 200;
    const nonZeroCategories = 20;
    const numberOfStackedBars = 3;
    const data = generateSparseStackedData(totalCategories, nonZeroCategories);

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <Bar id="bar-a" dataKey="stackA" stackId="stack" fill="#8884d8" isAnimationActive={false} />
        <Bar id="bar-b" dataKey="stackB" stackId="stack" fill="#82ca9d" isAnimationActive={false} />
        <Bar id="bar-c" dataKey="stackC" stackId="stack" fill="#ffc658" isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    const { spy, unmount } = renderTestCase((state) => ({
      barA: selectBarRectangles(state, "bar-a", false, undefined),
      barB: selectBarRectangles(state, "bar-b", false, undefined),
      barC: selectBarRectangles(state, "bar-c", false, undefined),
    }));

    const counts = spy.mock.lastCall?.[0] as
      | { barA: ReadonlyArray<unknown>; barB: ReadonlyArray<unknown>; barC: ReadonlyArray<unknown> }
      | undefined;
    const actualRectangles =
      (counts?.barA.length ?? 0) + (counts?.barB.length ?? 0) + (counts?.barC.length ?? 0);

    const potentialRectangles = totalCategories * numberOfStackedBars;
    const percentSaved = Math.round(
      ((potentialRectangles - actualRectangles) / potentialRectangles) * 100,
    );

    expect(percentSaved).toBeGreaterThan(80);
    expect(actualRectangles).toBeLessThanOrEqual(nonZeroCategories * numberOfStackedBars);

    unmount();
  });

  it("should handle sparse dashboard data efficiently", { timeout: 30_000 }, () => {
    const months = 36;
    const metrics = 50;
    const sparsity = 0.85;

    const data: Array<Record<string, number | string>> = [];
    for (let month = 0; month < months; month++) {
      const entry: Record<string, number | string> = { month: `Month ${month + 1}` };
      for (let metric = 0; metric < metrics; metric++) {
        entry[`metric${metric}`] =
          Math.random() > sparsity ? Math.floor(Math.random() * 100) + 1 : 0;
      }
      data.push(entry);
    }

    const { container } = render(() => (
      <BarChart width={1200} height={600} data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        {Array.from({ length: metrics }, (_, i) => (
          <Bar
            dataKey={`metric${i}`}
            stackId="stack"
            fill={`hsl(${(i * 7) % 360}, 70%, 50%)`}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    ));
    flush();

    const actualBars = getAllBars(container).length;
    const potentialBars = months * metrics;

    expect(actualBars).toBeLessThan(potentialBars * 0.5);
  });

  it("should handle extreme sparsity efficiently", { timeout: 30_000 }, () => {
    const dataPoints = 672;
    const errorRate = 0.01;

    const data = Array.from({ length: dataPoints }, (_, i) => ({
      time: `Hour ${i}`,
      errors: Math.random() < errorRate ? Math.floor(Math.random() * 10) + 1 : 0,
      warnings: Math.random() < errorRate * 2 ? Math.floor(Math.random() * 20) + 1 : 0,
      info: Math.random() < errorRate * 5 ? Math.floor(Math.random() * 50) + 1 : 0,
    }));

    const { container } = render(() => (
      <BarChart width={1200} height={400} data={data}>
        <XAxis dataKey="time" />
        <YAxis />
        <Bar dataKey="errors" stackId="log" fill="#ff4444" isAnimationActive={false} />
        <Bar dataKey="warnings" stackId="log" fill="#ffaa00" isAnimationActive={false} />
        <Bar dataKey="info" stackId="log" fill="#4488ff" isAnimationActive={false} />
      </BarChart>
    ));
    flush();

    const actualBars = getAllBars(container).length;
    const potentialBars = dataPoints * 3;

    expect(actualBars).toBeLessThan(potentialBars * 0.2);
  });

  it("should not filter out zero-height bars that have a custom shape (BoxPlot use case)", () => {
    const HorizonBar = (barProps: { x?: number; y?: number; width?: number; height?: number }) => {
      const { x, y, width } = barProps;
      if (x == null || y == null || width == null) {
        return null;
      }
      return <line x1={x} y1={y} x2={x + width} y2={y} stroke="#000" stroke-width={3} />;
    };

    const data = [
      { min: 100, bottomWhisker: 100, bottomBox: 50, topBox: 200, topWhisker: 200, marker: 0 },
      { min: 200, bottomWhisker: 200, bottomBox: 200, topBox: 100, topWhisker: 100, marker: 0 },
    ];

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={400} height={400} data={data}>
        <XAxis />
        <YAxis />
        <Bar stackId="a" id="bar-min" dataKey="min" fill="none" isAnimationActive={false} />
        <Bar
          stackId="a"
          id="bar-marker"
          dataKey="marker"
          shape={(item) => (
            <HorizonBar x={item.x} y={item.y} width={item.width} height={item.height} />
          )}
          isAnimationActive={false}
        />
        <Bar stackId="a" id="bar-whisker" dataKey="bottomWhisker" isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));

    const { spy } = renderTestCase((state) =>
      selectBarRectangles(state, "bar-marker", false, undefined),
    );
    const rectangles = spy.mock.lastCall?.[0] ?? [];

    expect(rectangles.length).toBe(data.length);
    rectangles.forEach((rect: { height: number }) => {
      expect(rect.height).toBe(0);
    });
  });
});
