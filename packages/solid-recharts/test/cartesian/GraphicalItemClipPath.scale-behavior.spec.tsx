// Ported from recharts 3.8.1 test/cartesian/GraphicalItemClipPath.scale-behavior.spec.tsx.
//
// These tests investigate why categorical (scalePoint) and numerical (scaleLinear)
// axes compute different pixel positions for the same data points when data slides.
//
// Tier-A (pure d3-scale) cases are byte-identical — they only exercise victory-vendor
// d3-scale and so are golden-anchored to d3.
//
// Tier-B (real LineChart) cases port the selector-spy harness: React useState + an
// `act(button.click())` data slide becomes a Solid `data` signal flipped on click,
// and the selectLinePoints accessor is spied through createSelectorTestCase. The
// last spy call holds the current points. `p.payload` is `unknown` in our port
// (recharts erases it via `any`), so a runtime guard reads `name`/`x` — no `as`.
import { describe, it, expect, beforeEach } from "vitest";
import { scaleLinear, scalePoint } from "victory-vendor/d3-scale";
import { createSignal, flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { fireEvent } from "@solidjs/testing-library";
import { Line, LineChart, XAxis, YAxis } from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { selectLinePoints } from "../../src/state/selectors/lineSelectors";
import type { LinePointItem } from "../../src/cartesian/Line";
import { assertNotNull } from "../helper/assertNotNull";

// Runtime guards (not casts) that read the named fields off the erased payload.
function payloadName(p: LinePointItem): string | undefined {
  const payload = p.payload;
  if (payload != null && typeof payload === "object" && "name" in payload) {
    const name = (payload as { name: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function payloadX(p: LinePointItem): number | undefined {
  const payload = p.payload;
  if (payload != null && typeof payload === "object" && "x" in payload) {
    const x = (payload as { x: unknown }).x;
    return typeof x === "number" ? x : undefined;
  }
  return undefined;
}

describe("Scale behavior: categorical vs numerical point positions during data sliding", () => {
  describe("d3 scalePoint (categorical) behavior", () => {
    const RANGE: [number, number] = [0, 500];

    it("distributes categories evenly across the range", () => {
      const scale = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);

      expect(scale("A")).toBe(0);
      expect(scale("B")).toBe(100);
      expect(scale("C")).toBe(200);
      expect(scale("D")).toBe(300);
      expect(scale("E")).toBe(400);
      expect(scale("F")).toBe(500);
    });

    it("redistributes ALL points when domain changes from [A..F] to [B..G]", () => {
      const before = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const after = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);

      // Every surviving point gets a completely new position
      // B: was at 100, now at 0 — shifted by -100
      expect(before("B")).toBe(100);
      expect(after("B")).toBe(0);

      // C: was at 200, now at 100 — shifted by -100
      expect(before("C")).toBe(200);
      expect(after("C")).toBe(100);

      // F: was at 500, now at 400 — shifted by -100
      expect(before("F")).toBe(500);
      expect(after("F")).toBe(400);

      // The removed point A is no longer in the domain
      expect(after("A")).toBeUndefined();

      // The new point G gets the last position
      expect(after("G")).toBe(500);
    });

    it("the shift is consistent because the same number of categories fill the same range", () => {
      const before = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const after = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);

      // When removing one item from start and adding one to end (same count),
      // the spacing stays constant: 500 / 5 = 100
      const spacingBefore = before("B")! - before("A")!;
      const spacingAfter = after("C")! - after("B")!;
      expect(spacingBefore).toBe(100);
      expect(spacingAfter).toBe(100);

      // Every surviving point shifts by exactly one spacing unit
      for (const label of ["B", "C", "D", "E", "F"]) {
        const shift = before(label)! - after(label)!;
        expect(shift).toBe(100);
      }
    });

    it("returns undefined for values not in the domain — animation must extrapolate", () => {
      const after = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);
      // The removed point A cannot be positioned by the new scale
      // The animation system must guess where to animate it to
      expect(after("A")).toBeUndefined();
    });

    it("has different spacing when the count changes", () => {
      // If we go from 6 items to 5 items, the spacing changes
      const before = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const after = scalePoint<string>().domain(["B", "C", "D", "E", "F"]).range(RANGE);

      const spacingBefore = before("B")! - before("A")!;
      const spacingAfter = after("C")! - after("B")!;

      expect(spacingBefore).toBe(100); // 500 / 5
      expect(spacingAfter).toBe(125); // 500 / 4

      // Surviving points shift by different amounts!
      const shiftB = before("B")! - after("B")!;
      const shiftF = before("F")! - after("F")!;
      expect(shiftB).toBe(100); // 100 → 0
      expect(shiftF).toBe(0); // 500 → 500

      // B and F have different shifts — this makes animation non-uniform
      expect(shiftB).not.toBe(shiftF);
    });
  });

  describe("d3 scaleLinear (numerical) behavior", () => {
    const RANGE: [number, number] = [0, 500];

    it("maps values proportionally across the range", () => {
      const scale = scaleLinear().domain([1, 6]).range(RANGE);

      expect(scale(1)).toBe(0);
      expect(scale(2)).toBe(100);
      expect(scale(3)).toBe(200);
      expect(scale(4)).toBe(300);
      expect(scale(5)).toBe(400);
      expect(scale(6)).toBe(500);
    });

    it("repositions points proportionally when domain slides from [1,6] to [2,7]", () => {
      const before = scaleLinear().domain([1, 6]).range(RANGE);
      const after = scaleLinear().domain([2, 7]).range(RANGE);

      // Point 2: was at (2-1)/(6-1) * 500 = 100, now at (2-2)/(7-2) * 500 = 0
      expect(before(2)).toBe(100);
      expect(after(2)).toBe(0);

      // Point 6: was at (6-1)/(6-1) * 500 = 500, now at (6-2)/(7-2) * 500 = 400
      expect(before(6)).toBe(500);
      expect(after(6)).toBe(400);

      // Every surviving point shifts by exactly 100 (same as categorical with equal count)
      for (const val of [2, 3, 4, 5, 6]) {
        const shift = before(val) - after(val);
        expect(shift).toBe(100);
      }
    });

    it("can compute positions for values OUTSIDE the domain (extrapolation)", () => {
      const after = scaleLinear().domain([2, 7]).range(RANGE);

      // The removed point 1 is below the domain minimum
      // scaleLinear extrapolates: (1-2)/(7-2) * 500 = -100
      expect(after(1)).toBe(-100);

      // The new point 7 is at the domain maximum
      expect(after(7)).toBe(500);
    });

    it("extrapolation means removed points animate to just outside the left edge", () => {
      const before = scaleLinear().domain([1, 6]).range(RANGE);
      const after = scaleLinear().domain([2, 7]).range(RANGE);

      // Point 1's position in the old scale was at 0 (left edge)
      expect(before(1)).toBe(0);

      // In the new scale, point 1 would be at -100 (just past the left edge)
      expect(after(1)).toBe(-100);

      // This is exactly one spacing unit past the left edge,
      // which creates a smooth sliding-off animation
      const spacing = after(3) - after(2);
      expect(spacing).toBe(100);
      expect(after(1)).toBe(after(2) - spacing);
    });

    it("new points entering from the right also land at a natural position", () => {
      const before = scaleLinear().domain([1, 6]).range(RANGE);
      const after = scaleLinear().domain([2, 7]).range(RANGE);

      // Point 7 in the OLD scale would be at (7-1)/(6-1) * 500 = 600
      expect(before(7)).toBe(600);

      // In the new scale, point 7 is at 500 (right edge)
      expect(after(7)).toBe(500);

      // So animating from before(7)=600 to after(7)=500 means
      // the point enters from just past the right edge — smooth!
    });

    it("has the SAME spacing when count changes (unlike scalePoint)", () => {
      // Even if we go from 6 values to 5, the spacing per unit stays constant
      // because it's determined by domain range / pixel range, not by item count
      const before = scaleLinear().domain([1, 6]).range(RANGE);
      const after = scaleLinear().domain([2, 6]).range(RANGE);

      const spacingBefore = before(2) - before(1);
      const spacingAfter = after(3) - after(2);

      expect(spacingBefore).toBe(100); // 500 / 5
      expect(spacingAfter).toBe(125); // 500 / 4

      // Spacing changes because the domain range changed (was 5, now 4)
      // but the key difference is: scaleLinear CAN position the removed value
      expect(after(1)).toBe(-125);
    });
  });

  describe("key difference for animation: extrapolation capability", () => {
    const RANGE: [number, number] = [0, 500];

    it("scalePoint returns undefined for removed items — animation system must invent a position", () => {
      const oldScale = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const newScale = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);

      // A was at position 0 in the old scale
      expect(oldScale("A")).toBe(0);
      // A cannot be positioned in the new scale
      expect(newScale("A")).toBeUndefined();
    });

    it("scaleLinear can position any value including removed ones — natural animation", () => {
      const oldScale = scaleLinear().domain([1, 6]).range(RANGE);
      const newScale = scaleLinear().domain([2, 7]).range(RANGE);

      // Point 1 was at position 0
      expect(oldScale(1)).toBe(0);
      // Point 1 can STILL be positioned in the new scale: it's at -100
      expect(newScale(1)).toBe(-100);

      // Similarly, point 7 in the old scale is at 600 (past the right edge)
      expect(oldScale(7)).toBe(600);
      // And in the new scale it's at 500 (right edge)
      expect(newScale(7)).toBe(500);
    });
  });

  describe("in a real LineChart: selectLinePoints with categorical XAxis", () => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 500, height: 300 });
    });

    const dataWindow1 = [
      { name: "A", value: 10 },
      { name: "B", value: 20 },
      { name: "C", value: 30 },
      { name: "D", value: 40 },
      { name: "E", value: 50 },
      { name: "F", value: 60 },
    ];

    const dataWindow2 = [
      { name: "B", value: 20 },
      { name: "C", value: 30 },
      { name: "D", value: 40 },
      { name: "E", value: 50 },
      { name: "F", value: 60 },
      { name: "G", value: 70 },
    ];

    it("should redistribute all x positions when data slides with categorical axis", () => {
      const [data, setData] = createSignal(dataWindow1);
      const DataSlidingChart = (props: { children: JSX.Element }): JSX.Element => (
        <>
          <button type="button" onClick={() => setData(dataWindow2)}>
            Slide
          </button>
          <LineChart width={500} height={300} data={data()}>
            <XAxis dataKey="name" />
            <YAxis />
            <Line isAnimationActive={false} dataKey="value" id="line" />
            {props.children}
          </LineChart>
        </>
      );

      const renderTestCase = createSelectorTestCase(DataSlidingChart);
      const { container, spy } = renderTestCase((state) =>
        selectLinePoints(state, 0, 0, false, "line"),
      );

      // Get positions before slide
      const beforePoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(beforePoints);
      expect(beforePoints).toHaveLength(6);

      const beforeXPositions = beforePoints.map((p) => ({ name: payloadName(p), x: p.x }));

      // Slide the data
      const button = container.querySelector("button")!;
      fireEvent.click(button);
      flush();

      const afterPoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(afterPoints);
      expect(afterPoints).toHaveLength(6);

      const afterXPositions = afterPoints.map((p) => ({ name: payloadName(p), x: p.x }));

      // Key observation: B's x position changes from its "before" position
      const beforeB = beforeXPositions.find((p) => p.name === "B")!;
      const afterB = afterXPositions.find((p) => p.name === "B")!;
      expect(beforeB.x).not.toBe(afterB.x);

      // B was at position index 1 (of 6), now at position index 0 (of 6)
      // With scalePoint, all positions redistribute
      // B moves from where "B" was to where "A" used to be (approximately)
      expect(afterB.x).toBeLessThan(beforeB.x!);

      // Similarly for F: was at position 5 (of 6), now at position 4 (of 6)
      const beforeF = beforeXPositions.find((p) => p.name === "F")!;
      const afterF = afterXPositions.find((p) => p.name === "F")!;
      expect(afterF.x).toBeLessThan(beforeF.x!);

      // The shift for each surviving point should be equal (same spacing, same count)
      const shiftB = beforeB.x! - afterB.x!;
      const shiftF = beforeF.x! - afterF.x!;
      expect(shiftB).toBeCloseTo(shiftF, 1);

      // Point A is no longer in the data at all — animation must extrapolate its exit position
      expect(afterXPositions.find((p) => p.name === "A")).toBeUndefined();
    });
  });

  describe("in a real LineChart: selectLinePoints with numerical XAxis", () => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 500, height: 300 });
    });

    const dataWindow1 = [
      { x: 1, value: 10 },
      { x: 2, value: 20 },
      { x: 3, value: 30 },
      { x: 4, value: 40 },
      { x: 5, value: 50 },
      { x: 6, value: 60 },
    ];

    const dataWindow2 = [
      { x: 2, value: 20 },
      { x: 3, value: 30 },
      { x: 4, value: 40 },
      { x: 5, value: 50 },
      { x: 6, value: 60 },
      { x: 7, value: 70 },
    ];

    it("should compute positions based on numeric values with linear scale", () => {
      const [data, setData] = createSignal(dataWindow1);
      const DataSlidingChart = (props: { children: JSX.Element }): JSX.Element => (
        <>
          <button type="button" onClick={() => setData(dataWindow2)}>
            Slide
          </button>
          <LineChart width={500} height={300} data={data()}>
            <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
            <YAxis />
            <Line isAnimationActive={false} dataKey="value" id="line" />
            {props.children}
          </LineChart>
        </>
      );

      const renderTestCase = createSelectorTestCase(DataSlidingChart);
      const { container, spy } = renderTestCase((state) =>
        selectLinePoints(state, 0, 0, false, "line"),
      );

      const beforePoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(beforePoints);
      expect(beforePoints).toHaveLength(6);

      const beforeXPositions = beforePoints.map((p) => ({ x: payloadX(p), px: p.x }));

      // Slide the data
      const button = container.querySelector("button")!;
      fireEvent.click(button);
      flush();

      const afterPoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(afterPoints);
      expect(afterPoints).toHaveLength(6);

      const afterXPositions = afterPoints.map((p) => ({ x: payloadX(p), px: p.x }));

      // Key observation: positions shift proportionally
      const beforeP2 = beforeXPositions.find((p) => p.x === 2)!;
      const afterP2 = afterXPositions.find((p) => p.x === 2)!;

      // Point 2 moves left because the domain shifted from [1,6] to [2,7]
      expect(afterP2.px).toBeLessThan(beforeP2.px!);

      // All surviving points should shift by the same amount
      const shifts = [2, 3, 4, 5, 6].map((val) => {
        const before = beforeXPositions.find((p) => p.x === val)!;
        const after = afterXPositions.find((p) => p.x === val)!;
        return before.px! - after.px!;
      });

      // All shifts should be equal (linear scale preserves uniform shift)
      for (const shift of shifts) {
        expect(shift).toBeCloseTo(shifts[0]!, 1);
      }

      // The new point (x=7) is at the right edge of the plot
      const p7 = afterXPositions.find((p) => p.x === 7)!;
      const p6 = afterXPositions.find((p) => p.x === 6)!;
      const spacing = p7.px! - p6.px!;
      expect(spacing).toBeGreaterThan(0);
    });

    it("should position the leftmost point at the left edge of plot area after slide", () => {
      const [data, setData] = createSignal(dataWindow1);
      const DataSlidingChart = (props: { children: JSX.Element }): JSX.Element => (
        <>
          <button type="button" onClick={() => setData(dataWindow2)}>
            Slide
          </button>
          <LineChart width={500} height={300} data={data()}>
            <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
            <YAxis />
            <Line isAnimationActive={false} dataKey="value" id="line" />
            {props.children}
          </LineChart>
        </>
      );

      const renderTestCase = createSelectorTestCase(DataSlidingChart);
      const { container, spy } = renderTestCase((state) =>
        selectLinePoints(state, 0, 0, false, "line"),
      );

      const beforePoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(beforePoints);
      // Point 1 (leftmost) should be at the left edge
      const p1Before = beforePoints.find((p) => payloadX(p) === 1)!;
      // Point 6 (rightmost) should be at the right edge
      const p6Before = beforePoints.find((p) => payloadX(p) === 6)!;

      const button = container.querySelector("button")!;
      fireEvent.click(button);
      flush();

      const afterPoints: ReadonlyArray<LinePointItem> | undefined =
        spy.mock.calls[spy.mock.calls.length - 1]?.[0];
      assertNotNull(afterPoints);
      // Point 2 (now leftmost) should be at the left edge
      const p2After = afterPoints.find((p) => payloadX(p) === 2)!;
      // Point 7 (now rightmost) should be at the right edge
      const p7After = afterPoints.find((p) => payloadX(p) === 7)!;

      // With domain=['dataMin','dataMax'], the leftmost is always at the same x
      // and the rightmost is always at the same x
      expect(p2After.x).toBe(p1Before.x);
      expect(p7After.x).toBe(p6Before.x);
    });
  });

  describe("comparing shifts: categorical vs numerical during identical data slide", () => {
    beforeEach(() => {
      mockGetBoundingClientRect({ width: 500, height: 300 });
    });

    it("both axis types produce the same shift magnitude when item count stays constant", () => {
      // Categorical
      const catChart = (props: { children: JSX.Element }): JSX.Element => (
        <LineChart
          width={500}
          height={300}
          data={[
            { name: "A", value: 10 },
            { name: "B", value: 20 },
            { name: "C", value: 30 },
          ]}
        >
          <XAxis dataKey="name" />
          <Line isAnimationActive={false} dataKey="value" id="line" />
          {props.children}
        </LineChart>
      );
      const catRender = createSelectorTestCase(catChart);
      const { spy: catSpy } = catRender((state) => selectLinePoints(state, 0, 0, false, "line"));
      const catPoints: ReadonlyArray<LinePointItem> | undefined =
        catSpy.mock.calls[catSpy.mock.calls.length - 1]?.[0];
      assertNotNull(catPoints);

      // Numerical
      const numChart = (props: { children: JSX.Element }): JSX.Element => (
        <LineChart
          width={500}
          height={300}
          data={[
            { x: 1, value: 10 },
            { x: 2, value: 20 },
            { x: 3, value: 30 },
          ]}
        >
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
          <Line isAnimationActive={false} dataKey="value" id="line" />
          {props.children}
        </LineChart>
      );
      const numRender = createSelectorTestCase(numChart);
      const { spy: numSpy } = numRender((state) => selectLinePoints(state, 0, 0, false, "line"));
      const numPoints: ReadonlyArray<LinePointItem> | undefined =
        numSpy.mock.calls[numSpy.mock.calls.length - 1]?.[0];
      assertNotNull(numPoints);

      // Both should have same number of points
      expect(catPoints).toHaveLength(3);
      expect(numPoints).toHaveLength(3);

      // Both should use the same range, so the first and last point positions
      // should be similar (they both map to the edges of the plot area)
      const catSpacing = catPoints[1]!.x! - catPoints[0]!.x!;
      const numSpacing = numPoints[1]!.x! - numPoints[0]!.x!;

      // Both spacings should be equal because both have the same number of points
      // across the same plot width
      expect(catSpacing).toBeCloseTo(numSpacing, 0);
    });
  });

  describe("animation implications: what defaultLineAnimateItems must handle", () => {
    it("with scalePoint: removed item has no position in new frame, must be computed from shift", () => {
      const RANGE: [number, number] = [0, 500];
      const before = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const after = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);

      // Simulate what defaultLineAnimateItems does:
      // 1. Match surviving points: B→B, C→C, D→D, E→E, F→F
      const matchedPairs = ["B", "C", "D", "E", "F"].map((label) => ({
        label,
        prevX: before(label)!,
        nextX: after(label)!,
      }));

      // 2. Compute average shift
      const shifts = matchedPairs.map((p) => p.nextX - p.prevX);
      const avgShift = shifts.reduce((a, b) => a + b, 0) / shifts.length;
      expect(avgShift).toBe(-100); // all points shifted left by 100

      // 3. For removed item A: animate from prev position to prev position + shift
      const removedPrevX = before("A")!;
      expect(removedPrevX).toBe(0);
      const removedExitX = removedPrevX + avgShift;
      expect(removedExitX).toBe(-100); // slides off the left edge — correct!

      // 4. For new item G: animate from next position - shift to next position
      const newNextX = after("G")!;
      expect(newNextX).toBe(500);
      const newEntryX = newNextX - avgShift;
      expect(newEntryX).toBe(600); // enters from past the right edge — correct!
    });

    it("with scaleLinear: the scale itself handles extrapolation", () => {
      const RANGE: [number, number] = [0, 500];
      const before = scaleLinear().domain([1, 6]).range(RANGE);
      const after = scaleLinear().domain([2, 7]).range(RANGE);

      // The matched pairs work the same way
      const matchedPairs = [2, 3, 4, 5, 6].map((val) => ({
        val,
        prevX: before(val),
        nextX: after(val),
      }));

      const shifts = matchedPairs.map((p) => p.nextX - p.prevX);
      const avgShift = shifts.reduce((a, b) => a + b, 0) / shifts.length;
      expect(avgShift).toBe(-100);

      // For removed item 1: our animation computes prev + shift = 0 + (-100) = -100
      const removedExitX = before(1) + avgShift;
      expect(removedExitX).toBe(-100);

      // But scaleLinear can also extrapolate directly: after(1) = -100
      expect(after(1)).toBe(-100);
    });

    it("both approaches produce the same exit/entry positions when count stays constant", () => {
      const RANGE: [number, number] = [0, 500];

      // scalePoint approach
      const catBefore = scalePoint<string>().domain(["A", "B", "C", "D", "E", "F"]).range(RANGE);
      const catAfter = scalePoint<string>().domain(["B", "C", "D", "E", "F", "G"]).range(RANGE);
      const catShift = catAfter("B")! - catBefore("B")!;
      const catRemovedExit = catBefore("A")! + catShift;
      const catNewEntry = catAfter("G")! - catShift;

      // scaleLinear approach
      const numBefore = scaleLinear().domain([1, 6]).range(RANGE);
      const numAfter = scaleLinear().domain([2, 7]).range(RANGE);
      const numShift = numAfter(2) - numBefore(2);
      const numRemovedExit = numBefore(1) + numShift;
      const numNewEntry = numAfter(7) - numShift;

      // All the same!
      expect(catShift).toBe(numShift);
      expect(catRemovedExit).toBe(numRemovedExit);
      expect(catNewEntry).toBe(numNewEntry);

      // Both produce: exit at -100, entry from 600
      expect(catRemovedExit).toBe(-100);
      expect(catNewEntry).toBe(600);
    });
  });
});
