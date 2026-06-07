// Partial seed of recharts 3.8.1 src/util/Constants.ts (commit 7a23854).
// Only the constants consumed so far; grows as more land.

/** Default width of a Y axis, in pixels, when `width` is not specified. */
export const DEFAULT_Y_AXIS_WIDTH = 60;

/** Default categorical color palette (used by Treemap, Sankey). */
export const COLOR_PANEL = [
  "#1890FF",
  "#66B5FF",
  "#41D9C7",
  "#2FC25B",
  "#6EDB8F",
  "#9AE65C",
  "#FACC14",
  "#E6965C",
  "#57AD71",
  "#223273",
  "#738AE6",
  "#7564CC",
  "#8543E0",
  "#A877ED",
  "#5C8EE6",
  "#13C2C2",
  "#70E0E0",
  "#5CA3E6",
  "#3436C7",
  "#8082FF",
  "#DD81E6",
  "#F04864",
  "#FA7D92",
  "#D598D9",
] as const;

/**
 * Identifies which data item the user is touching. The index is the position in
 * the data array (number) or a matrix path string (Treemap/Sunkey).
 */
export const DATA_ITEM_INDEX_ATTRIBUTE_NAME = "data-recharts-item-index";

/** Identifies which graphical item owns the touched element (always unique). */
export const DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME = "data-recharts-item-id";
