// Port of recharts 3.8.1 test/helper/expectLine.ts (commit 7a23854).
import { expect } from "vitest";
import { assertNotNull } from "./assertNotNull";

export function getAllLines(container: Element) {
  return container.querySelectorAll(".recharts-curve.recharts-line-curve");
}

type ExpectedLine = {
  readonly d: string | null;
};

export function expectLines(container: Element, expectedLines: ReadonlyArray<ExpectedLine>) {
  assertNotNull(container);
  const allLinePaths = getAllLines(container);
  const actualLines: ReadonlyArray<ExpectedLine> = Array.from(allLinePaths).map((line) => ({
    d: line.getAttribute("d"),
  }));
  expect(actualLines).toEqual(expectedLines);
}
