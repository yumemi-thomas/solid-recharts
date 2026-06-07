// Ported from recharts 3.8.1 test/helper/expectLabel.ts (commit 7a23854).
import { expect } from "vitest";
import { assertNotNull } from "./assertNotNull";

export type ExpectedLabel = {
  textContent: string;
  x: string | null;
  y: string | null;
  width: string | null;
  height: string | null;
  offset: string | null;
};

export function expectLabels(
  container: Element,
  expectedLabels: ReadonlyArray<ExpectedLabel>,
  cssSelector: string = ".recharts-text.recharts-label",
) {
  assertNotNull(container);
  const labels = container.querySelectorAll(cssSelector);

  const actualLabels: ReadonlyArray<ExpectedLabel> = Array.from(labels).map((label) => ({
    textContent: label.textContent ?? "",
    x: label.getAttribute("x"),
    y: label.getAttribute("y"),
    width: label.getAttribute("width"),
    height: label.getAttribute("height"),
    offset: label.getAttribute("offset"),
  }));

  expect(actualLabels).toEqual(expectedLabels);
}
