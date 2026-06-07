// Tier B (state-internal): ported from recharts' referenceElementsSlice.spec.ts,
// adapted to the Solid-native store (store.state / store.actions, no dispatch) and
// the `id`-based identity deviation (recharts matches by object reference; Solid
// store proxies break that, so each settings object carries a stable `id`).
import { describe, it, expect } from "vitest";
import { flush } from "solid-js";
import type {
  ReferenceAreaSettings,
  ReferenceDotSettings,
  ReferenceLineSettings,
} from "../../src/state/referenceElementsSlice";
import { createRechartsStore } from "../../src/state/store";

describe("referenceElementsSlice", () => {
  it("should add and remove a reference dot", () => {
    const store = createRechartsStore();
    expect(store.state.referenceElements.dots).toEqual([]);

    const dot: ReferenceDotSettings = {
      id: "dot-1",
      ifOverflow: "visible",
      r: 1,
      x: 2,
      xAxisId: 3,
      y: "category 4",
      yAxisId: 5,
    };

    store.actions.referenceElements.addDot(dot);
    flush();
    expect(store.state.referenceElements.dots).toEqual([dot]);

    store.actions.referenceElements.removeDot(dot);
    flush();
    expect(store.state.referenceElements.dots).toEqual([]);
  });

  it("should add and remove a reference area", () => {
    const store = createRechartsStore();
    expect(store.state.referenceElements.areas).toEqual([]);

    const area: ReferenceAreaSettings = {
      id: "area-1",
      ifOverflow: "visible",
      x1: 1,
      x2: 2,
      xAxisId: 3,
      y1: "category 4",
      y2: "category 5",
      yAxisId: 6,
    };

    store.actions.referenceElements.addArea(area);
    flush();
    expect(store.state.referenceElements.areas).toEqual([area]);

    store.actions.referenceElements.removeArea(area);
    flush();
    expect(store.state.referenceElements.areas).toEqual([]);
  });

  it("should add and remove a reference line", () => {
    const store = createRechartsStore();
    expect(store.state.referenceElements.lines).toEqual([]);

    const line: ReferenceLineSettings = {
      id: "line-1",
      ifOverflow: "visible",
      x: 1,
      xAxisId: 2,
      y: "category 3",
      yAxisId: 4,
      segment: undefined,
    };

    store.actions.referenceElements.addLine(line);
    flush();
    expect(store.state.referenceElements.lines).toEqual([line]);

    store.actions.referenceElements.removeLine(line);
    flush();
    expect(store.state.referenceElements.lines).toEqual([]);
  });
});
