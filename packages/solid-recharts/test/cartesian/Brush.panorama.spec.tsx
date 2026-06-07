// Spec for the Brush PANORAMA: <Brush>{<Line/>}</Brush> mirrors the graphical item
// inside the brush rect as a full-dataset overview. The mirrored item renders under
// PanoramaContextProvider → RootSurface routes it to a nested Surface at the brush
// rect, using isPanorama=true (full data range + the brush viewBox), so its geometry
// is independent of (and unaffected by) the main chart's data window.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "../helper/render";
import { LineChart, Line, XAxis, YAxis, Brush } from "../../src";

const data = [
  { name: "A", uv: 10 },
  { name: "B", uv: 30 },
  { name: "C", uv: 50 },
  { name: "D", uv: 70 },
  { name: "E", uv: 40 },
  { name: "F", uv: 20 },
];

describe("<Brush /> panorama", () => {
  it("renders the brush children as a mini-chart inside the brush rect", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={300}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
        <Brush dataKey="name" height={40}>
          <Line dataKey="uv" isAnimationActive={false} />
        </Brush>
      </LineChart>
    ));
    flush();

    // Main line + panorama line.
    const curves = container.querySelectorAll(".recharts-line .recharts-curve");
    expect(curves).toHaveLength(2);

    // The panorama renders in its own nested <svg> (the brush Surface).
    expect(container.querySelectorAll("svg svg").length).toBeGreaterThanOrEqual(1);

    // The two curves differ: the main starts at the plot left (x≈65 with a Y axis),
    // the panorama at the brush padding (x≈1) — proving distinct coordinate spaces.
    const xOf = (c: Element): number =>
      Number((c.getAttribute("d") ?? "").match(/^M(-?\d+(?:\.\d+)?)/)?.[1] ?? NaN);
    const xs = [...curves].map(xOf).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(5); // panorama curve near the brush's left padding
    expect(xs[1]).toBeGreaterThan(50); // main curve at the plot's left edge
  });

  it("the panorama shows the full dataset regardless of the brush window", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={300}
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="uv" isAnimationActive={false} />
        <Brush dataKey="name" height={40} startIndex={2} endIndex={4}>
          <Line dataKey="uv" isAnimationActive={false} dot />
        </Brush>
      </LineChart>
    ));
    flush();

    // The panorama Line always plots all 6 points (full data), even though the main
    // window is [2,4]. The panorama dots live in the nested brush <svg>.
    const panoramaSvg = container.querySelector("svg svg");
    expect(panoramaSvg).not.toBeNull();
    expect(panoramaSvg!.querySelectorAll(".recharts-line-dot")).toHaveLength(data.length);
  });
});
