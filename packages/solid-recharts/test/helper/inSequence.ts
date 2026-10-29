/**
 * Runs `step` for each item one after the other: every step awaits the previous one.
 * The animation helpers advance a mock clock frame by frame, so their steps are
 * inherently sequential; this keeps that explicit without an `await` inside a loop.
 */
export async function inSequence<T>(
  items: ReadonlyArray<T>,
  step: (item: T, index: number) => Promise<void> | void,
): Promise<void> {
  await items.reduce<Promise<void>>(
    (previous, item, index) => previous.then(() => step(item, index)),
    Promise.resolve(),
  );
}

/**
 * The progress values `from, from + step, …` strictly below `until` (accumulated the
 * way a `for` loop does, so the floats match what the loops used to produce).
 */
export function progressSteps(from: number, step: number, until: number): ReadonlyArray<number> {
  const values: number[] = [];
  for (let value = from; value < until; value += step) {
    values.push(value);
  }
  return values;
}
