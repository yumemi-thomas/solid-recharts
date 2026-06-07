# PORT_ORDER — generated from recharts 3.8.1 import graph (value imports)

Computed from the **pristine** reference; regenerate with scripts/analyze-graph.mjs. Build top to bottom.

## Tier 0 — leaf primitives & utils (zero intra-src deps). Build first, fully tested.

1. src/animation/easing.ts
2. src/animation/timeoutController.ts
3. src/animation/util.ts
4. src/component/Cell.tsx
5. src/context/brushUpdateContext.tsx
6. src/context/legendPortalContext.tsx
7. src/context/PanoramaContext.tsx
8. src/context/tooltipPortalContext.tsx
9. src/state/polarOptionsSlice.ts
10. src/state/RechartsReduxContext.tsx
11. src/state/reduxDevtoolsJsonStringifyReplacer.ts
12. src/state/selectors/arrayEqualityCheck.ts
13. src/types.ts
14. src/util/Constants.ts
15. src/util/createEventProxy.ts
16. src/util/CssPrefixUtils.ts
17. src/util/excludeEventProps.ts
18. src/util/getClassNameFromUnknown.tsx
19. src/util/getEveryNth.ts
20. src/util/getSliced.ts
21. src/util/Global.ts
22. src/util/IfOverflow.ts
23. src/util/isWellBehavedNumber.ts
24. src/util/LogUtils.ts
25. src/util/LRUCache.ts
26. src/util/payload/getUniqPayload.ts
27. src/util/propsAreEqual.ts
28. src/util/resolveDefaultProps.tsx
29. src/util/round.ts
30. src/util/scale/util/arithmetic.ts
31. src/util/svgPropertiesNoEvents.ts
32. src/util/typedDataKey.ts
33. src/util/useElementOffset.ts
34. src/util/YAxisUtils.tsx
35. src/zIndex/DefaultZIndexes.tsx

## Tier 1 — singletons depending only on already-ported units

36. src/animation/configUpdate.ts
37. src/state/chartDataSlice.ts
38. src/state/zIndexSlice.ts
39. src/util/svgPropertiesAndEvents.ts
40. src/util/usePrefersReducedMotion.ts
41. src/zIndex/getZIndexFromUnknown.tsx
42. src/animation/AnimationManager.ts
43. src/container/Layer.tsx
44. src/animation/createDefaultAnimationManager.tsx
45. src/component/Customized.tsx
46. src/animation/useAnimationManager.tsx
47. src/component/responsiveContainerUtils.ts
48. src/context/tooltipContext.tsx
49. src/util/getActiveCoordinate.ts
50. src/util/RadialBarUtils.tsx

## Tier 2 — THE CORE (210 files, one SCC, but **93% a DAG**: only 81/1217 intra-core edges close cycles)

Recommended port order below (minimum-feedback-arc linearization). It is NOT one-file-at-a-time-green:
bring up the store + minimal selectors, then port feature-vertically guided by Tier-A specs. 81 edges run "backward" in this order — declare the interface/stub for these targets first, backfill later.

### Declare/stub these FIRST (most-referenced-before-ported)

- (x4) src/state/selectors/barSelectors.ts
- (x4) src/context/ErrorBarContext.tsx
- (x2) src/util/axisPropsAreEqual.ts
- (x2) src/index.ts
- (x2) src/polar/defaultPolarRadiusAxisProps.tsx
- (x2) src/polar/defaultPolarAngleAxisProps.tsx
- (x2) src/cartesian/ErrorBar.tsx
- (x2) src/state/types/BarSettings.ts
- (x2) src/state/selectors/rootPropsSelectors.ts
- (x2) src/state/referenceElementsSlice.ts

### Recommended core order

1. src/util/types.ts
2. src/util/cursor/getCursorRectangle.ts
3. src/state/eventSettingsSlice.ts
4. src/state/brushSlice.ts
5. src/util/getRelativeCoordinate.ts
6. src/state/layoutSlice.ts
7. src/shape/Polygon.tsx
8. src/util/ActiveShapeUtils.tsx
9. src/util/getRadiusAndStrokeWidthFromDot.tsx
10. src/state/selectors/numberDomainEqualityCheck.ts
11. src/util/scale/CustomScaleDefinition.ts
12. src/util/scale/RechartsScale.ts
13. src/util/CartesianUtils.ts
14. src/container/Surface.tsx
15. src/util/PolarUtils.ts
16. src/util/DOMUtils.ts
17. src/util/DataUtils.ts
18. src/animation/CSSTransitionAnimate.tsx
19. src/shape/Sector.tsx
20. src/util/cursor/getRadialCursorPoints.ts
21. src/shape/Cross.tsx
22. src/util/tooltip/translate.ts
23. src/component/TooltipBoundingBox.tsx
24. src/component/ResponsiveContainer.tsx
25. src/util/TickUtils.ts
26. src/animation/JavascriptAnimate.tsx
27. src/util/useId.ts
28. src/util/useUniqueId.ts
29. src/util/useAnimationId.tsx
30. src/util/scale/CartesianScaleHelper.ts
31. src/util/ReactUtils.ts
32. src/shape/Dot.tsx
33. src/shape/Symbols.tsx
34. src/component/DefaultLegendContent.tsx
35. src/state/legendSlice.ts
36. src/util/ReduceCSSCalc.ts
37. src/component/Text.tsx
38. src/shape/Trapezoid.tsx
39. src/util/cursor/getCursorPoints.ts
40. src/shape/Rectangle.tsx
41. src/state/hooks.ts
42. src/state/ReportPolarOptions.tsx
43. src/state/ReportEventSettings.tsx
44. src/state/ReportMainChartProps.tsx
45. src/context/accessibilityContext.tsx
46. src/state/SetGraphicalItem.ts
47. src/state/SetTooltipEntrySettings.tsx
48. src/state/cartesianAxisSlice.ts
49. src/util/scale/getNiceTickValues.ts
50. src/util/scale/index.ts
51. src/state/renderedTicksSlice.ts
52. src/state/selectors/combiners/combineRealScaleType.ts
53. src/state/polarAxisSlice.ts
54. src/context/chartLayoutContext.tsx
55. src/cartesian/getCartesianPosition.tsx
56. src/state/SetLegendPayload.ts
57. src/shape/Curve.tsx
58. src/state/tooltipSlice.ts
59. src/util/Events.ts
60. src/state/selectors/combiners/combineCoordinateForDefaultIndex.ts
61. src/component/DefaultTooltipContent.tsx
62. src/synchronisation/types.ts
63. src/chart/types.ts
64. src/state/optionsSlice.ts
65. src/state/selectors/combiners/combineTooltipInteractionState.ts
66. src/state/selectors/combiners/combineActiveLabel.ts
67. src/state/store.ts
68. src/state/RechartsStoreProvider.tsx
69. src/context/chartDataContext.tsx
70. src/synchronisation/syncSelectors.ts
71. src/state/externalEventsMiddleware.ts
72. src/state/selectors/selectTooltipEventType.ts
73. src/state/selectors/pickAxisId.ts
74. src/state/selectors/pickAxisType.ts
75. src/state/selectors/selectAllAxes.ts
76. src/state/selectors/selectTooltipAxisType.ts
77. src/state/selectors/selectTooltipAxisId.ts
78. src/state/selectors/selectTooltipState.ts
79. src/state/selectors/selectTooltipPayloadSearcher.ts
80. src/state/selectors/selectTooltipSettings.ts
81. src/state/selectors/dataSelectors.ts
82. src/zIndex/zIndexSelectors.ts
83. src/zIndex/ZIndexLayer.tsx
84. src/component/Dots.tsx
85. src/state/selectors/legendSelectors.ts
86. src/state/selectors/containerSelectors.ts
87. src/util/useReportScale.ts
88. src/zIndex/ZIndexPortal.tsx
89. src/context/legendPayloadContext.tsx
90. src/component/Legend.tsx
91. src/util/ChartUtils.ts
92. src/util/getAxisTypeBasedOnLayout.ts
93. src/state/selectors/combiners/combineTooltipPayload.ts
94. src/util/isDomainSpecifiedByUser.ts
95. src/state/selectors/combiners/combineActiveTooltipIndex.ts
96. src/state/selectors/selectChartOffsetInternal.ts
97. src/state/selectors/brushSelectors.ts
98. src/state/selectors/combiners/combineCheckedDomain.ts
99. src/state/selectors/selectChartOffset.ts
100. src/container/RootSurface.tsx
101. src/state/selectors/selectPlotArea.ts
102. src/hooks.ts
103. src/container/ClipPathProvider.tsx
104. src/util/scale/createCategoricalInverse.ts
105. src/cartesian/GraphicalItemClipPath.tsx
106. src/state/selectors/combiners/combineInverseScaleFunction.ts
107. src/state/graphicalItemsSlice.ts
108. src/state/selectors/touchSelectors.ts
109. src/state/types/PieSettings.ts
110. src/context/RegisterGraphicalItemId.tsx
111. src/state/selectors/graphicalItemSelectors.ts
112. src/state/types/StackedGraphicalItem.ts
113. src/state/selectors/combiners/combineTooltipPayloadConfigurations.ts
114. src/state/types/ScatterSettings.ts
115. src/state/types/LineSettings.ts
116. src/util/stacks/stackTypes.ts
117. src/state/types/RadialBarSettings.ts
118. src/util/stacks/getStackSeriesIdentifier.ts
119. src/state/selectors/combiners/combineDisplayedStackedData.ts
120. src/state/selectors/combiners/combineStackedData.ts
121. src/state/selectors/axisSelectors.ts
122. src/cartesian/ZAxis.tsx
123. src/state/selectors/combiners/combineConfiguredScale.ts
124. src/state/selectors/combiners/combineAxisRangeWithReverse.ts
125. src/state/selectors/tooltipSelectors.ts
126. src/context/useTooltipAxis.ts
127. src/component/ActivePoints.tsx
128. src/component/Label.tsx
129. src/state/selectors/selectors.ts
130. src/component/Cursor.tsx
131. src/state/keyboardEventsMiddleware.ts
132. src/chart/CartesianChart.tsx
133. src/chart/FunnelChart.tsx
134. src/chart/ComposedChart.tsx
135. src/chart/AreaChart.tsx
136. src/chart/ScatterChart.tsx
137. src/chart/BarChart.tsx
138. src/chart/LineChart.tsx
139. src/state/selectors/polarScaleSelectors.ts
140. src/state/selectors/polarGridSelectors.ts
141. src/cartesian/Area.tsx
142. src/state/rootPropsSlice.ts
143. src/state/selectors/rootPropsSelectors.ts
144. src/state/ReportChartProps.tsx
145. src/synchronisation/useChartSynchronisation.tsx
146. src/component/Tooltip.tsx
147. src/state/selectors/polarSelectors.ts
148. src/cartesian/Brush.tsx
149. src/state/selectors/polarAxisSelectors.ts
150. src/polar/PolarGrid.tsx
151. src/state/selectors/selectActivePropsFromChartPointer.ts
152. src/state/mouseEventsMiddleware.ts
153. src/state/touchEventsMiddleware.ts
154. src/chart/RechartsWrapper.tsx
155. src/chart/CategoricalChart.tsx
156. src/chart/SunburstChart.tsx
157. src/chart/Sankey.tsx
158. src/chart/Treemap.tsx
159. src/chart/PolarChart.tsx
160. src/chart/PieChart.tsx
161. src/chart/RadialBarChart.tsx
162. src/chart/RadarChart.tsx
163. src/cartesian/CartesianAxis.tsx
164. src/cartesian/Funnel.tsx
165. src/polar/RadialBar.tsx
166. src/polar/Radar.tsx
167. src/polar/Pie.tsx
168. src/polar/PolarRadiusAxis.tsx
169. src/polar/PolarAngleAxis.tsx
170. src/util/createPolarCharts.tsx
171. src/cartesian/Scatter.tsx
172. src/cartesian/Line.tsx
173. src/cartesian/ErrorBar.tsx
174. src/state/errorBarSlice.ts
175. src/state/referenceElementsSlice.ts
176. src/cartesian/ReferenceArea.tsx
177. src/cartesian/ReferenceDot.tsx
178. src/cartesian/ReferenceLine.tsx
179. src/cartesian/YAxis.tsx
180. src/cartesian/XAxis.tsx
181. src/cartesian/getTicks.ts
182. src/cartesian/CartesianGrid.tsx
183. src/cartesian/BarStack.tsx
184. src/state/selectors/combiners/combineBarSizeList.ts
185. src/cartesian/Bar.tsx
186. src/util/createCartesianCharts.tsx
187. src/util/BarUtils.tsx
188. src/state/types/BarSettings.ts
189. src/component/LabelList.tsx
190. src/state/selectors/combiners/combineBarPosition.ts
191. src/state/selectors/combiners/combineAllBarPositions.ts
192. src/state/selectors/barSelectors.ts
193. src/index.ts
194. src/context/ErrorBarContext.tsx
195. src/state/selectors/barStackSelectors.ts
196. src/cartesian/getEquidistantTicks.ts
197. src/util/axisPropsAreEqual.ts
198. src/state/selectors/lineSelectors.ts
199. src/util/ScatterUtils.tsx
200. src/state/selectors/scatterSelectors.ts
201. src/polar/defaultPolarAngleAxisProps.tsx
202. src/polar/defaultPolarRadiusAxisProps.tsx
203. src/state/selectors/pieSelectors.ts
204. src/state/selectors/radarSelectors.ts
205. src/state/selectors/radialBarSelectors.ts
206. src/util/FunnelUtils.tsx
207. src/state/selectors/funnelSelectors.ts
208. src/state/types/AreaSettings.ts
209. src/state/selectors/areaSelectors.ts
210. src/state/types/RadarSettings.ts
