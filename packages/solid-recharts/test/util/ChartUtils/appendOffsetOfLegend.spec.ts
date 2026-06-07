import { appendOffsetOfLegend } from "../../../src/util/ChartUtils";
import type { Size } from "../../../src/util/types";
import type { LegendSettings } from "../../../src/state/legendSlice";

/*
 * Ported from recharts 3.8.1 test/util/ChartUtils/appendOffsetOfLegend.spec.tsx.
 * Deviations: recharts imports `OffsetHorizontal`/`OffsetVertical` types which this
 * port does not export — the offset is typed inline as the `{ top, right, bottom,
 * left }` shape `appendOffsetOfLegend` accepts. The `vi.mock('.../ReactUtils')` is
 * dropped: this port has no `ReactUtils` and `appendOffsetOfLegend` does not use it.
 */

type Offset = { top: number; right: number; bottom: number; left: number };

const emptyOffset: Offset = {
  top: 1,
  right: 2,
  bottom: 9,
  left: 5,
};

describe("appendOffsetOfLegend", () => {
  it("should add extra space for a vertical legend", () => {
    const settings: LegendSettings = {
      verticalAlign: "bottom",
      layout: "vertical",
      align: "left",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual({
      ...emptyOffset,
      left: 105,
    });
  });

  it("should add extra space for a horizontal legend, middle aligned", () => {
    const settings: LegendSettings = {
      layout: "horizontal",
      verticalAlign: "middle",
      align: "left",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual({
      ...emptyOffset,
      left: 105,
    });
  });

  it("should not modify the original offset that was passed as an argument", () => {
    const clone: Offset = { ...emptyOffset };
    const settings: LegendSettings = {
      layout: "horizontal",
      verticalAlign: "middle",
      align: "left",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    appendOffsetOfLegend(emptyOffset, settings, size);

    expect(emptyOffset).toEqual(clone);
  });

  it("should add extra space for a horizontal legend", () => {
    const settings: LegendSettings = {
      align: "left",
      layout: "horizontal",
      verticalAlign: "bottom",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual({ ...emptyOffset, bottom: 209 });
  });

  it("should add extra space for a vertical legend, center aligned", () => {
    const settings: LegendSettings = {
      align: "center",
      layout: "vertical",
      verticalAlign: "bottom",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual({ ...emptyOffset, bottom: 209 });
  });

  it("should do nothing for vertical legend with align: center", () => {
    const settings: LegendSettings = {
      align: "center",
      layout: "vertical",
      verticalAlign: "middle",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };
    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual(emptyOffset);
  });

  it("should add space for horizontal legend with verticalAlign: middle and align:left", () => {
    const settings: LegendSettings = {
      align: "left",
      layout: "horizontal",
      verticalAlign: "middle",
      itemSorter: "value",
    };
    const size: Size = {
      width: 100,
      height: 200,
    };

    const result = appendOffsetOfLegend(emptyOffset, settings, size);
    expect(result).toEqual({ ...emptyOffset, left: 105 });
  });
});
