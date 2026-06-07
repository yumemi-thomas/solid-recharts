import { expect } from "vitest";
import { assertNotNull } from "./assertNotNull";

/*
 * Ported from recharts 3.8.1 test/helper/expectAxisTicks.ts (the DOM-query part).
 * Class-name adaptation: recharts queries `.recharts-xAxis-tick-labels`, but this
 * port's CartesianAxis renders the ticks group as `recharts-{axisType}-ticks` under
 * an axis Layer classed `recharts-cartesian-axis recharts-{axisType}`. We therefore
 * scope by the axis Layer class (`.recharts-xAxis` / `.recharts-yAxis`) + the
 * (identical) `.recharts-cartesian-axis-tick-value` label class.
 */

export type ExpectedTick = {
  textContent: string | null;
  x: string | null;
  y: string | null;
};

function normalizeDateString(str: string | null): string | null {
  if (!str) return str;
  return str.replace(/\(.*?\)/, "(Coordinated Universal Time)");
}

function readTicks(container: Element, axisSelector: string): ReadonlyArray<ExpectedTick> {
  const allTicks = container.querySelectorAll(
    `${axisSelector} .recharts-cartesian-axis-tick-value`,
  );
  assertNotNull(allTicks);
  return Array.from(allTicks).map((tick) => ({
    textContent: normalizeDateString(tick.textContent),
    x: tick.getAttribute("x"),
    y: tick.getAttribute("y"),
  }));
}

export function expectXAxisTicks(
  container: Element,
  expectedTicks: ReadonlyArray<ExpectedTick>,
): void {
  expect(readTicks(container, ".recharts-xAxis")).toEqual(expectedTicks);
}

export function expectYAxisTicks(
  container: Element,
  expectedTicks: ReadonlyArray<ExpectedTick>,
): void {
  expect(readTicks(container, ".recharts-yAxis")).toEqual(expectedTicks);
}
