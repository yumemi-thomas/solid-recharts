/**
 * Styling presets for Recharts components.
 *
 * @experimental
 */
export interface RechartsTheme {
  grid: Partial<{
    stroke: string;
    strokeOpacity: number;
    strokeWidth: number;
    strokeDasharray: string | number | ReadonlyArray<number>;
    fillOpacity: number;
    fill: string;
  }>;
}
