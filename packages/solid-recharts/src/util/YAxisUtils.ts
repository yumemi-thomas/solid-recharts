// Ported from recharts 3.8.1 src/util/YAxisUtils.ts (commit 7a23854).
type IGetBoundingClient = Pick<Element, "getBoundingClientRect">;

/**
 * Calculates the width of the Y-axis based on the tick labels and the axis label.
 * @param params.ticks an array-like of tick elements, each with `getBoundingClientRect`
 * @param params.label the axis label element, with `getBoundingClientRect`
 * @param params.labelGapWithTick gap between the label and the tick (default 5)
 * @param params.tickSize length of the tick line (default 0)
 * @param params.tickMargin margin between the tick line and the tick text (default 0)
 * @returns the calculated width of the Y-axis
 */
export const getCalculatedYAxisWidth = ({
  ticks,
  label,
  labelGapWithTick = 5,
  tickSize = 0,
  tickMargin = 0,
}: {
  ticks: ArrayLike<IGetBoundingClient> | null;
  label: IGetBoundingClient | null | undefined;
  labelGapWithTick: number | undefined;
  tickSize: number | undefined;
  tickMargin: number | undefined;
}): number => {
  let maxTickWidth = 0;
  if (ticks) {
    Array.from(ticks).forEach((tickNode: IGetBoundingClient) => {
      if (tickNode) {
        const bbox = tickNode.getBoundingClientRect();

        if (bbox.width > maxTickWidth) {
          maxTickWidth = bbox.width;
        }
      }
    });

    const labelWidth = label ? label.getBoundingClientRect().width : 0;

    const tickWidth = tickSize + tickMargin;

    const updatedYAxisWidth =
      maxTickWidth + tickWidth + labelWidth + (label ? labelGapWithTick : 0);

    return Math.round(updatedYAxisWidth);
  }

  return 0;
};
