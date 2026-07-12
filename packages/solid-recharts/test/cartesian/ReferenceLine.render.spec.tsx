// Spec for the ReferenceLine vertical: a data-coordinate line mapped to pixels
// through the cartesian scale spine (selectAxisScale → RechartsScale). Geometry
// is exact — the scale spine is byte-identical to recharts, so a horizontal line
// at y=value spans the full plot width at the y the Y scale maps `value` to, and
// a vertical line at x=category spans the full plot height at that band's x.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import { LineChart, Line, XAxis, YAxis, ReferenceLine } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
  { name: "D", uv: 70 },
];

function lineCoords(container: Element) {
  return Array.from(container.querySelectorAll(".recharts-reference-line-line")).map((l) => ({
    x1: l.getAttribute("x1"),
    y1: l.getAttribute("y1"),
    x2: l.getAttribute("x2"),
    y2: l.getAttribute("y2"),
  }));
}

describe("<ReferenceLine />", () => {
  it("draws a horizontal line at y=value spanning the full plot width", () => {
    const { container } = render(() => (
      <LineChart
        width={500}
        height={500}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceLine y={50} stroke="#ff0000" />
      </LineChart>
    ));
    flush();

    // viewBox: x=65 (margin.left 5 + Y axis width 60), width=430 (500-5-65);
    // Y scale [0,100] → range [465, 5], so y=50 maps to 235. Orientation 'left'
    // reverses the points → [{x:65}, {x:495}].
    expect(lineCoords(container)).toEqual([{ x1: "65", y1: "235", x2: "495", y2: "235" }]);
  });

  it("draws a vertical line at x=category spanning the full plot height", () => {
    const { container } = render(() => (
      <LineChart
        width={500}
        height={500}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceLine x="B" stroke="#0000ff" />
      </LineChart>
    ));
    flush();

    const coords = lineCoords(container);
    expect(coords).toHaveLength(1);
    // Vertical line: x1 === x2 (one band position), spanning the plot height
    // (top y=5 .. bottom y=465). Orientation 'bottom' keeps points unreversed.
    const c = coords[0];
    expect(c?.x1).toBe(c?.x2);
    expect(new Set([c?.y1, c?.y2])).toEqual(new Set(["5", "465"]));
  });

  it("extends the axis domain so an out-of-range line renders when ifOverflow='extendDomain'", () => {
    // uv max is 70; with a default auto Y domain, y=200 is far out of range.
    // ifOverflow='extendDomain' grows the numerical domain to include 200, so the
    // line falls in range and renders (this exercises the un-deferred
    // selectReferenceElementsDomain → combineNumericalDomain path).
    const { container } = render(() => (
      <LineChart width={500} height={500} data={data}>
        <XAxis dataKey="name" />
        <YAxis type="number" />
        <Line dataKey="uv" />
        <ReferenceLine y={200} ifOverflow="extendDomain" stroke="#ff0000" />
      </LineChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-reference-line-line")).toHaveLength(1);
  });

  it("renders nothing when the value overflows the domain and ifOverflow='discard'", () => {
    const { container } = render(() => (
      <LineChart width={500} height={500} data={data}>
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        {/* 500 is outside [0,100]; default ifOverflow='discard' drops it */}
        <ReferenceLine y={500} stroke="#ff0000" />
      </LineChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-reference-line-line")).toHaveLength(0);
  });

  it("forwards compound kebab presentation attrs onto the line (allowlist fix)", () => {
    // Regression: ReferenceLine props are kebab (JSX.LineSVGAttributes). Before the
    // svgPropertiesAndEvents fix, compound attrs like stroke-dasharray/stroke-width
    // were dropped by the camelCase-only allowlist; now they forward verbatim.
    const { container } = render(() => (
      <LineChart
        width={500}
        height={500}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis type="number" domain={[0, 100]} />
        <Line dataKey="uv" />
        <ReferenceLine y={50} stroke="#ff0000" strokeWidth={3} strokeDasharray="4 2" />
      </LineChart>
    ));
    flush();

    const line = container.querySelector(".recharts-reference-line-line");
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute("stroke-width", "3");
    expect(line).toHaveAttribute("stroke-dasharray", "4 2");
    // No broken camelCase attribute leaked through.
    expect(line?.getAttribute("strokeWidth")).toBeNull();
  });
});
