type BoundingClientElement = Pick<Element, "getBoundingClientRect">;

/** Calculates the required X-axis height from its rendered ticks and label. */
export const getCalculatedXAxisHeight = ({
  ticks,
  label,
  labelGapWithTick = 5,
  tickSize = 0,
  tickMargin = 0,
}: {
  ticks: ArrayLike<BoundingClientElement> | null;
  label: BoundingClientElement | null | undefined;
  labelGapWithTick: number | undefined;
  tickSize: number | undefined;
  tickMargin: number | undefined;
}): number => {
  if (!ticks) {
    return 0;
  }
  let maxTickHeight = 0;
  Array.from(ticks).forEach((tickNode) => {
    maxTickHeight = Math.max(maxTickHeight, tickNode.getBoundingClientRect().height);
  });
  const labelHeight = label?.getBoundingClientRect().height ?? 0;
  const updatedHeight =
    maxTickHeight + tickSize + tickMargin + labelHeight + (label ? labelGapWithTick : 0);
  return Math.round(updatedHeight);
};
