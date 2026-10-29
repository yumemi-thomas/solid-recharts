import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expectNoDiagnostics } from "@solidjs/diagnostics";
import { captureBrowserArtifact } from "@solidjs/diagnostics/playwright";

// Real-browser RENDERING gate. The jsdom suite drives animations through an
// injected mock controller and never exercises the default RAF driver, the real
// Portal implementation, or real flush scheduling — all of which have a history
// of browser-only failures in this port. This spec asserts every chart type
// actually paints its graphical items in a real Chromium, and that no Solid
// reactive-graph diagnostics or page errors fire while doing so.
//
// Diagnostics come from the app's own runtime: app/dev installs the
// `@solidjs/diagnostics/browser` bridge, and `captureBrowserArtifact` opens a
// capture window around a scripted interaction. Each chart is mounted INSIDE that
// window (by clicking its gallery tab on the landing page), so every diagnostic
// raised while it renders — not just the ones that happen to reach the console —
// fails the test, with the same `expectNoDiagnostics` the jsdom guard uses.
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

/** Collects uncaught page errors and `console.error` output (favicon 404s aside). */
function watchPage(page: Page): { pageErrors: string[]; consoleErrors: string[] } {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      consoleErrors.push(msg.text());
    }
  });
  return { pageErrors, consoleErrors };
}

for (const [chart, { selector, min }] of Object.entries(CHART_CONTENT)) {
  test(`renders graphical content: ${chart}`, async ({ page }) => {
    const { pageErrors, consoleErrors } = watchPage(page);

    // Landing page: the diagnostics bridge is installed, no chart is mounted yet.
    await page.goto("/");
    const { artifact } = await captureBrowserArtifact(
      page,
      async () => {
        await page.getByRole("button", { name: chart, exact: true }).click();
        await page.waitForSelector("[data-testid=chart-root] svg", { timeout: 10_000 });

        // Entrance animations run ~1.5s on the real RAF driver; give them room to settle.
        await expect
          .poll(async () => page.locator(selector).count(), { timeout: 8_000 })
          .toBeGreaterThanOrEqual(min);
      },
      { scenario: `mount ${chart}`, attribution: false },
    );

    expectNoDiagnostics(artifact);
    expect(pageErrors, `page errors on ${chart}`).toEqual([]);
    expect(consoleErrors, `console errors on ${chart}`).toEqual([]);
  });
}

test("combined chart: two Bars render INSIDE their zIndex portal, plus Legend and Brush", async ({
  page,
}) => {
  const { pageErrors, consoleErrors } = watchPage(page);

  await page.goto("/");
  const { artifact } = await captureBrowserArtifact(
    page,
    async () => {
      await page.getByRole("button", { name: "combined", exact: true }).click();
      await page.waitForSelector("[data-testid=chart-root] svg");

      // Two Bars × 5 rows — and they must land inside the zIndex_300 portal layer,
      // proving the Portal-based relayering works in a real browser (jsdom cannot
      // catch native-DOM Portal failures).
      await expect
        .poll(
          async () => page.locator(".recharts-zIndex-layer_300 .recharts-bar-rectangle").count(),
          { timeout: 8_000 },
        )
        .toBeGreaterThanOrEqual(10);

      await expect(page.locator(".recharts-legend-wrapper")).toHaveCount(1);
      await expect(page.locator(".recharts-brush")).toHaveCount(1);
    },
    { scenario: "mount combined", attribution: false },
  );

  expectNoDiagnostics(artifact);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("tooltip: hovering the plot area shows the shared tooltip without diagnostics", async ({
  page,
}) => {
  const { pageErrors, consoleErrors } = watchPage(page);

  await page.goto("/?chart=tooltip");
  await page.waitForSelector("[data-testid=chart-root] svg", { timeout: 10_000 });
  // Let the entrance animation settle so the hover lands on final geometry.
  await expect
    .poll(async () => page.locator(".recharts-line path.recharts-curve").count())
    .toBeGreaterThanOrEqual(2);

  const plot = await page.locator("[data-testid=chart-root] .recharts-wrapper").boundingBox();
  expect(plot).not.toBeNull();
  if (plot == null) {
    return;
  }

  const { artifact } = await captureBrowserArtifact(
    page,
    async () => {
      // Sweep across the plot: enter, move between categories, leave.
      await page.mouse.move(plot.x + plot.width * 0.25, plot.y + plot.height * 0.5);
      await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();
      await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height * 0.5);
      await expect(page.locator(".recharts-tooltip-item").first()).toBeVisible();
      await page.mouse.move(plot.x - 20, plot.y - 20);
    },
    { scenario: "tooltip hover", attribution: false },
  );

  expectNoDiagnostics(artifact);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
