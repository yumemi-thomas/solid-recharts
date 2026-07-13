// Ported from recharts 3.8.1 src/util/stacks/stackTypes.ts (commit 7a23854).
import { Series } from "d3-shape";
import { StackId } from "../ChartUtils";
import { DataKey } from "../types";
import { GraphicalItemId } from "../../state/graphicalItemsSlice";
import { MaybeStackedGraphicalItem } from "../../state/types/StackedGraphicalItem";

/*
 * Chart stacks come in layers:
 * - The top layer is the stack itself, a collection of series, identified by `StackId`
 *   (from the graphical items' `stackId` prop). A chart may have multiple stacks.
 * - One stack has multiple series — the individual data series that make it up. One
 *   series is one `GraphicalItem`; this module identifies it.
 * - The third layer is the data point: a tuple of two numbers.
 */

/**
 * Collection of all stacks in the chart. A simple stacked chart has a single
 * stack; an empty object means no stacks.
 */
export type AllStackGroups = Record<StackId, StackGroup>;

/**
 * A collection of series stacked together. The series and graphical items are
 * joined by the {@link StackSeriesIdentifier}.
 */
export type StackGroup = {
  readonly stackedData: ReadonlyArray<StackSeries>;
  readonly graphicalItems: ReadonlyArray<MaybeStackedGraphicalItem>;
};

/**
 * A collection of data points representing one graphical item in the stack. The
 * coordinates already include the baseline of the previous series in the stack.
 *
 * Deviation from recharts: the d3 `Series<Datum, Key>` Datum param is the SOURCE
 * data record, not the [number, number] point (recharts declares it as
 * StackDataPoint and bridges with `@ts-expect-error`). We type it to what
 * `getStackedData` actually produces so the assignment is sound without a cast;
 * each series element is still structurally a `StackDataPoint` ([number, number]).
 */
export type StackSeries = Series<Record<string, unknown>, DataKey<unknown>>;

/**
 * A tuple of two numbers: where the previous stack series ended and where this
 * one ends — letting the next series set its baseline.
 */
export type StackDataPoint = [number, number];

/**
 * Identifier joining a stack series with its graphical item.
 */
export type StackSeriesIdentifier = GraphicalItemId;
