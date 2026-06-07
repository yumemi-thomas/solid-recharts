/*
 * Ported verbatim from recharts 3.8.1 test/component/Tooltip/tooltipMouseHoverSelectors.ts.
 *
 * Different charts respond differently to mouse hover: some show the tooltip
 * optimistically (hover anywhere over `.recharts-wrapper`), others require hovering
 * precisely over a graphical element. Use these selectors with `showTooltip`.
 */
export type MouseHoverTooltipTriggerSelector = string;

export const areaChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const barChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const barChartItemMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-bar-rectangle";
export const barMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-bar-rectangle";
export const lineChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const composedChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const pieChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-pie-sector";
export const radarChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const radialBarChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-wrapper";
export const radialBarMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-radial-bar-sector";
export const sankeyNodeMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-sankey-nodes .recharts-rectangle";
export const sankeyLinkMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-sankey-links .recharts-sankey-link";
export const scatterChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-scatter-symbol";
export const sunburstChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-sector";
export const treemapNodeChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-treemap-depth-2 .recharts-rectangle";
export const funnelChartMouseHoverTooltipSelector: MouseHoverTooltipTriggerSelector =
  ".recharts-funnel-trapezoid";
