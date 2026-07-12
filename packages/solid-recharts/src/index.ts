export type { EasingInput } from "./animation/easing";
export { LineChart } from "./chart/LineChart";
export type { LineChartProps } from "./chart/LineChart";
export { AreaChart } from "./chart/AreaChart";
export type { AreaChartProps } from "./chart/AreaChart";
export { BarChart } from "./chart/BarChart";
export type { BarChartProps } from "./chart/BarChart";
export { ComposedChart } from "./chart/ComposedChart";
export type { ComposedChartProps } from "./chart/ComposedChart";
export { ScatterChart } from "./chart/ScatterChart";
export type { ScatterChartProps } from "./chart/ScatterChart";
export { FunnelChart } from "./chart/FunnelChart";
export type { FunnelChartProps } from "./chart/FunnelChart";
export { SunburstChart } from "./chart/SunburstChart";
export type { SunburstChartProps, SunburstData } from "./chart/SunburstChart";
export { Treemap } from "./chart/Treemap";
export type {
  TreemapProps,
  TreemapDataType,
  TreemapNode,
  TreemapContentType,
} from "./chart/Treemap";
export { Sankey } from "./chart/Sankey";
export type {
  SankeyProps,
  SankeyData,
  SankeyNode,
  SankeyLink,
  SankeyNodeProps,
  SankeyLinkProps,
  SankeyElementType,
  SankeyNodeOptions,
} from "./chart/Sankey";
export { PieChart } from "./chart/PieChart";
export type { PieChartProps } from "./chart/PieChart";
export { RadarChart } from "./chart/RadarChart";
export type { RadarChartProps } from "./chart/RadarChart";
export { RadialBarChart } from "./chart/RadialBarChart";
export type { RadialBarChartProps } from "./chart/RadialBarChart";
export { Cell } from "./component/Cell";
export type { CellProps } from "./component/Cell";
export { Cross } from "./shape/Cross";
export type { CrossProps } from "./shape/Cross";
export { Polygon } from "./shape/Polygon";
export type { PolygonProps } from "./shape/Polygon";
export { Sector } from "./shape/Sector";
export type { SectorProps } from "./shape/Sector";
export { Rectangle } from "./shape/Rectangle";
export type { RectangleProps, RectRadius } from "./shape/Rectangle";
export { Symbols } from "./shape/Symbols";
export type { SymbolsProps } from "./shape/Symbols";
export { Trapezoid } from "./shape/Trapezoid";
export type { TrapezoidProps } from "./shape/Trapezoid";
export { Global } from "./util/Global";
export { getRelativeCoordinate } from "./util/getRelativeCoordinate";
export { createHorizontalChart, createVerticalChart } from "./util/createCartesianCharts";
export { createCentricChart, createRadialChart } from "./util/createPolarCharts";
export { DefaultZIndexes } from "./zIndex/DefaultZIndexes";
export { Surface } from "./container/Surface";
export type { SurfaceProps, CartesianViewBox } from "./container/Surface";
export { Dot } from "./shape/Dot";
export type { DotProps } from "./shape/Dot";
export { Curve, getPath, defaultCurveProps } from "./shape/Curve";
export type { CurveProps, CurveType, BaseLineType } from "./shape/Curve";
export { Line } from "./cartesian/Line";
export type { LineProps, LinePointItem } from "./cartesian/Line";
export { LineDrawShape } from "./cartesian/LineDrawShape";
export type { LineDrawShapeProps } from "./cartesian/LineDrawShape";
export { Bar } from "./cartesian/Bar";
export type { BarProps, BarRectangleItem } from "./cartesian/Bar";
export { BarStack } from "./cartesian/BarStack";
export type { BarStackProps } from "./cartesian/BarStack";
export { Area } from "./cartesian/Area";
export type { AreaProps, AreaPointItem } from "./cartesian/Area";
export { AreaRevealShape } from "./cartesian/AreaRevealShape";
export type { AreaRevealShapeProps } from "./cartesian/AreaRevealShape";
export { Scatter } from "./cartesian/Scatter";
export type { ScatterProps } from "./cartesian/Scatter";
export { Funnel } from "./cartesian/Funnel";
export type { FunnelProps, FunnelTrapezoidItem } from "./cartesian/Funnel";
export { FunnelTrapezoid, defaultFunnelShape } from "./util/FunnelUtils";
export type { FunnelTrapezoidProps } from "./util/FunnelUtils";
export { Brush } from "./cartesian/Brush";
export type { BrushProps } from "./cartesian/Brush";
export { Pie } from "./polar/Pie";
export type { PieProps, PieShape } from "./polar/Pie";
export { PolarAngleAxis } from "./polar/PolarAngleAxis";
export type { PolarAngleAxisProps, PolarAngleTickContentProps } from "./polar/PolarAngleAxis";
export { PolarRadiusAxis } from "./polar/PolarRadiusAxis";
export type { PolarRadiusAxisProps, PolarRadiusTickContentProps } from "./polar/PolarRadiusAxis";
export { Radar } from "./polar/Radar";
export type { RadarProps } from "./polar/Radar";
export { PolarGrid } from "./polar/PolarGrid";
export type { PolarGridProps } from "./polar/PolarGrid";
export { RadialBar } from "./polar/RadialBar";
export type { RadialBarProps } from "./polar/RadialBar";
export { ZAxis } from "./cartesian/ZAxis";
export type { ZAxisProps } from "./cartesian/ZAxis";
export { ReferenceLine } from "./cartesian/ReferenceLine";
export type { ReferenceLineProps, ReferenceLineSegment } from "./cartesian/ReferenceLine";
export { ReferenceDot } from "./cartesian/ReferenceDot";
export type {
  ReferenceDotProps,
  ReferenceDotEventHandler,
  ReferenceDotTouchEventHandler,
} from "./cartesian/ReferenceDot";
export { ReferenceArea } from "./cartesian/ReferenceArea";
export type { ReferenceAreaProps } from "./cartesian/ReferenceArea";
export { ErrorBar } from "./cartesian/ErrorBar";
export type { ErrorBarProps, ErrorBarDirection } from "./cartesian/ErrorBar";
export { Tooltip } from "./component/Tooltip";
export type { TooltipProps } from "./component/Tooltip";
export { Cursor } from "./component/Cursor";
export type { CursorProps, CursorDefinition } from "./component/Cursor";
export { Text } from "./component/Text";
export {
  Label,
  CartesianLabelContextProvider,
  CartesianLabelFromLabelProp,
  PolarLabelContextProvider,
  PolarLabelFromLabelProp,
} from "./component/Label";
export type { Props as LabelProps, ImplicitLabelType, LabelPosition } from "./component/Label";
export { LabelList, LabelListFromLabelProp } from "./component/LabelList";
export type {
  ImplicitLabelListType,
  CartesianLabelListEntry,
  Props as LabelListProps,
  LabelListPropsWithPosition,
} from "./component/LabelList";
export { CartesianAxis } from "./cartesian/CartesianAxis";
export type { CartesianAxisProps } from "./cartesian/CartesianAxis";
export { CartesianGrid } from "./cartesian/CartesianGrid";
export type { CartesianGridProps } from "./cartesian/CartesianGrid";
export { Legend } from "./component/Legend";
export type { LegendProps } from "./component/Legend";
export {
  ResponsiveContainer,
  useResponsiveContainerContext,
} from "./component/ResponsiveContainer";
export type {
  Props as ResponsiveContainerProps,
  ResponsiveContainerCalculations,
} from "./component/ResponsiveContainer";
export { useChartHeight, useChartWidth } from "./context/chartLayoutContext";
export { DefaultLegendContent } from "./component/DefaultLegendContent";
export type {
  LegendPayload,
  Props as DefaultLegendContentProps,
} from "./component/DefaultLegendContent";
export type {
  TooltipItemSorter,
  Props as DefaultTooltipContentProps,
  ValueType as TooltipValueType,
} from "./component/DefaultTooltipContent";
export type {
  LegendType,
  CartesianTickContentProps,
  BaseTickContentProps,
  XAxisTickContentProps,
  YAxisTickContentProps,
  ShapeAnimationProps,
} from "./util/types";
export type { IfOverflow } from "./util/IfOverflow";
export { XAxis } from "./cartesian/XAxis";
export type { XAxisProps } from "./cartesian/XAxis";
export { YAxis } from "./cartesian/YAxis";
export type { YAxisProps } from "./cartesian/YAxis";
// Public hooks (recharts exposes these from the main entry too).
export {
  useActiveTooltipDataPoints,
  useActiveTooltipLabel,
  useActiveTooltipCoordinate,
  useIsTooltipActive,
  useXAxis,
  useYAxis,
  useXAxisScale,
  useYAxisScale,
  useXAxisInverseScale,
  useYAxisInverseScale,
  useXAxisInverseDataSnapScale,
  useYAxisInverseDataSnapScale,
  useXAxisInverseTickSnapScale,
  useYAxisInverseTickSnapScale,
  useXAxisTicks,
  useYAxisTicks,
  useXAxisDomain,
  useYAxisDomain,
  useCartesianScale,
  useOffset,
  usePlotArea,
} from "./hooks";
export type { ScaleFunction, InverseScaleFunction, CartesianDataPoint } from "./hooks";
// Layout hooks + low-level building blocks recharts also exposes from the main entry.
export {
  useChartLayout,
  useCartesianChartLayout,
  usePolarChartLayout,
  useMargin,
} from "./context/chartLayoutContext";
export { Layer } from "./container/Layer";
export type { LayerProps } from "./container/Layer";
export { ZIndexLayer } from "./zIndex/ZIndexLayer";
export { getNiceTickValues } from "./util/scale/getNiceTickValues";
export { interpolate } from "./util/DataUtils";
// Animation engine (v3.9) — matching, handles, controller injection.
export { matchByIndex, matchByDataKey, matchAppend } from "./animation/matchBy";
export type { AnimationItem, AnimationMatchBy, AnimationMatchByProp } from "./animation/matchBy";
export { JavascriptAnimation, CSSTransitionAnimation } from "./animation/AnimationHandle";
export type { AnimationHandle } from "./animation/AnimationHandle";
export type { AnimationController, OnAnimationStateUpdate } from "./animation/AnimationController";
export type { TimeoutController, CancelableTimeout } from "./animation/timeoutController";
export { AnimationControllerProvider } from "./animation/useAnimationController";
export type { AnimationInterpolateFn } from "./animation/AnimatedItems";
export { DefaultTooltipContent } from "./component/DefaultTooltipContent";

// ---------------------------------------------------------------------------
// Public type re-exports — match the recharts main-entry type surface.
// ---------------------------------------------------------------------------
export type { BarShapeProps } from "./cartesian/Bar";
export type { ScatterPointItem, ScatterPointNode, ScatterShapeProps } from "./cartesian/Scatter";
export type { LabelListEntry } from "./component/LabelList";
export type {
  RenderableText,
  TextAnchor,
  TextVerticalAnchor,
  Props as TextProps,
} from "./component/Text";
export type { TooltipContentProps } from "./component/Tooltip";
export type {
  PieLabel,
  PieLabelRenderProps,
  PieSectorDataItem,
  PieSectorShapeProps,
} from "./polar/Pie";
export type { RadarPoint } from "./polar/Radar";
export type { RadialBarDataItem } from "./polar/RadialBar";
export type {
  AxisId,
  NiceTicksAlgorithm,
  XAxisOrientation,
  XAxisPadding,
  YAxisOrientation,
  YAxisPadding,
} from "./state/cartesianAxisSlice";
export type { AxisRange } from "./state/selectors/axisSelectors";
export type { TooltipIndex, TooltipPayload, TooltipPayloadEntry } from "./state/tooltipSlice";
export type { ActiveLabel, MouseHandlerDataParam } from "./synchronisation/types";
export type { ChartOffset, PlotArea } from "./types";
export type { RadialBarSectorProps } from "./util/RadialBarUtils";
export type {
  NoFunnel,
  TypedHorizontalChartContext,
  TypedVerticalChartContext,
} from "./util/createCartesianCharts";
export type {
  NoCentric,
  NoRadial,
  TypedCentricChartContext,
  TypedRadialChartContext,
} from "./util/createPolarCharts";
export type { CustomScaleDefinition } from "./util/scale/CustomScaleDefinition";
export type { BandPosition } from "./util/scale/RechartsScale";
export type {
  ActiveDotProps,
  AxisDomainItem,
  AxisInterval,
  CartesianLayout,
  CartesianTickItem,
  Coordinate,
  DataKey,
  DotItemDotProps,
  HTMLMousePointer,
  HTMLTouchPointer,
  LayoutType,
  Margin,
  MousePointer,
  NumberDomain,
  Padding,
  PolarCoordinate,
  PolarLayout,
  RelativePointer,
  SVGMousePointer,
  SVGTouchPointer,
  SymbolType,
  TickItem,
  TouchPointer,
} from "./util/types";
