import { test, expect } from "@playwright/test";

// Real-browser RENDERING gate. The jsdom suite drives animations through an
// injected mock controller and never exercises the default RAF driver, the real
// Portal implementation, or real browser scheduling — all of which have a history
// of browser-only failures in this port. This spec asserts every chart type
// actually paints its graphical items in a real Chromium without page or console errors.
const CHART_CONTENT: Record<string, { selector: string; min: number }> = {
  bar: { selector: ".recharts-bar-rectangle path, .recharts-bar-rectangle rect", min: 5 },
  line: { selector: ".recharts-line path.recharts-curve", min: 1 },
  area: { selector: ".recharts-area path.recharts-curve", min: 1 },
  pie: { selector: ".recharts-pie-sector path.recharts-sector", min: 3 },
  scatter: { selector: ".recharts-scatter .recharts-symbols", min: 3 },
  radar: { selector: ".recharts-radar .recharts-polygon", min: 1 },
  radialbar: { selector: ".recharts-radial-bar-sector path, .recharts-sector", min: 3 },
  funnel: { selector: ".recharts-funnel-trapezoid path", min: 3 },
  sankey: { selector: ".recharts-sankey-nodes rect, .recharts-sankey-node", min: 2 },
  treemap: { selector: ".recharts-treemap-depth-1 rect, .recharts-rectangle", min: 2 },
  sunburst: { selector: ".recharts-sector, .recharts-sunburst path", min: 2 },
};

for (const [chart, { selector, min }] of Object.entries(CHART_CONTENT)) {
  test(`renders graphical content: ${chart}`, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto(`/?chart=${chart}`);
    await page.waitForSelector("[data-testid=chart-root] svg", { timeout: 10_000 });

    // Entrance animations run ~1.5s on the real RAF driver; give them room to settle.
    await expect
      .poll(async () => page.locator(selector).count(), { timeout: 8_000 })
      .toBeGreaterThanOrEqual(min);

    expect(pageErrors, `page errors on ${chart}`).toEqual([]);
    expect(
      consoleErrors.filter((error) => !error.includes("favicon")),
      `console errors on ${chart}`,
    ).toEqual([]);
  });
}

test("combined chart: two Bars render INSIDE their zIndex portal, plus Legend and Brush", async ({
  page,
}) => {
  await page.goto("/?chart=combined");
  await page.waitForSelector("[data-testid=chart-root] svg");

  // Two Bars × 5 rows — and they must land inside the zIndex_300 portal layer,
  // proving the Portal-based relayering works in a real browser (jsdom cannot
  // catch native-DOM Portal failures).
  await expect
    .poll(async () => page.locator(".recharts-zIndex-layer_300 .recharts-bar-rectangle").count(), {
      timeout: 8_000,
    })
    .toBeGreaterThanOrEqual(10);

  await expect(page.locator(".recharts-legend-wrapper")).toHaveCount(1);
  await expect(page.locator(".recharts-brush")).toHaveCount(1);
});
