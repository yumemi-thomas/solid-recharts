import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Real-browser accessibility scan. Unlike the jsdom `AccessibilityScans.spec`,
// a real browser has layout + rendering, so axe's `color-contrast` rule (and all
// layout-dependent rules) actually run here. This is the authoritative a11y gate.
const CHARTS = [
  "bar",
  "line",
  "area",
  "pie",
  "scatter",
  "radar",
  "radialbar",
  "funnel",
  "sankey",
  "treemap",
  "sunburst",
  "combined",
] as const;

for (const chart of CHARTS) {
  test(`a11y (full axe incl. color-contrast): ${chart}`, async ({ page }) => {
    await page.goto(`/?chart=${chart}`);
    await page.waitForSelector("[data-testid=chart-root] svg", { timeout: 10_000 });

    // Scope to the chart subtree: page-level rules (html-has-lang, landmark-one-main,
    // page-has-heading-one) are properties of the host document, not the component.
    const results = await new AxeBuilder({ page }).include("[data-testid=chart-root]").analyze();

    if (results.violations.length > 0) {
      // Surface concrete details in the report instead of an opaque array diff.
      console.log(
        `\n[${chart}] axe violations:\n` +
          results.violations
            .map(
              (v) =>
                `  • ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help}\n` +
                v.nodes
                  .slice(0, 3)
                  .map(
                    (n) =>
                      `      ${n.target.join(" ")} :: ${n.failureSummary?.split("\n").join(" ")}`,
                  )
                  .join("\n"),
            )
            .join("\n"),
      );
    }
    expect(results.violations).toEqual([]);
  });
}

test("real layout geometry is non-zero (the jsdom size-0 blind spot)", async ({ page }) => {
  await page.goto("/?chart=combined");
  await page.waitForSelector("[data-testid=chart-root] svg");

  const svg = await page.locator("[data-testid=chart-root] svg").first().boundingBox();
  expect(svg).not.toBeNull();
  expect(svg?.width ?? 0).toBeGreaterThan(0);
  expect(svg?.height ?? 0).toBeGreaterThan(0);

  // Axis tick labels are exactly what jsdom measures as width 0; in a real browser
  // they have measured width — proving text-measurement-dependent layout works.
  const tick = page.locator("[data-testid=chart-root] svg text").first();
  const tickBox = await tick.boundingBox();
  expect(tickBox?.width ?? 0).toBeGreaterThan(0);
});
