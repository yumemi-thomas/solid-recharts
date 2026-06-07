import { expect } from "vitest";
import { trim } from "./trim";
import { assertNotNull } from "./assertNotNull";
import { round } from "../../src/util/round";

// Ported from recharts 3.8.1 test/helper/expectPieSectors.ts.

export function selectPieSectors(container: Element): ReadonlyArray<Element> {
  return Array.from(container.querySelectorAll(".recharts-pie-sector path.recharts-sector"));
}

export type ExpectedSector = {
  d: string;
};

export function expectPieSectors(
  container: Element,
  expectedSectors: ReadonlyArray<ExpectedSector>,
): void {
  const sectors = selectPieSectors(container);
  const actualSectors = sectors.map((sector) => ({
    d: trim(sector.getAttribute("d") ?? ""),
  }));
  expect(actualSectors).toEqual(expectedSectors);
}

/**
 * The angle in degrees of a point on a circle relative to its center, measured
 * counter-clockwise from the positive x-axis (SVG y-axis points down, so negated).
 */
function calculateAngle(cx: number, cy: number, x: number, y: number): number {
  const radians = Math.atan2(-(y - cy), x - cx);
  let degrees = radians * (180 / Math.PI);
  if (degrees < 0) {
    degrees += 360;
  }
  return round(degrees);
}

function calculateAnglesFromPath(
  cx: number,
  cy: number,
  path: string,
): { startAngle: number; endAngle: number } | null {
  const match = path.match(
    /M\s*([-\d.]+)[,\s]+([-\d.]+)\s*A(?:[\s\d,.]*?)\s*([-\d.]+)[,\s]+([-\d.]+)\s*L/,
  );
  if (!match) {
    return null;
  }
  const [, x1, y1, x2, y2] = match.map(parseFloat);
  const startAngle = calculateAngle(cx, cy, x1!, y1!);
  const endAngle = calculateAngle(cx, cy, x2!, y2!);
  return { startAngle, endAngle };
}

export function getPieSectorAngles(
  sectors: ReadonlyArray<Element>,
): ReadonlyArray<{ startAngle: number; endAngle: number }> {
  return sectors.map((sector) => {
    const d = sector.getAttribute("d");
    if (!d) {
      throw new Error('Sector path "d" attribute is missing');
    }
    const cx = parseFloat(sector.getAttribute("cx") ?? "0");
    const cy = parseFloat(sector.getAttribute("cy") ?? "0");
    const anglesFromPath = calculateAnglesFromPath(cx, cy, d);
    assertNotNull(anglesFromPath);
    return anglesFromPath;
  });
}

export function expectPieSectorAngles(
  container: Element,
  expectedAngles: ReadonlyArray<{ startAngle: number; endAngle: number }>,
): void {
  const sectors = selectPieSectors(container);
  const actualAngles = getPieSectorAngles(sectors);
  expect(actualAngles).toEqual(expectedAngles);
}
