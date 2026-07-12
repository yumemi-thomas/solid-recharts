// Smoke-check: load each built charts bundle in real Chromium and assert SVG
// charts actually render (guards against tree-shaking dropping runtime code).
// Run after build.mjs: node smoke.mjs
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
// Only the -app builds are self-contained (the -lib builds externalize the
// framework, so they can't run standalone).
const targets = ["solid-charts-app", "react-charts-app", "solid-line-app", "react-line-app"];

const browser = await chromium.launch();
let failed = false;
for (const name of targets) {
  const assets = join(here, "dist", name, "assets");
  const chunk = readdirSync(assets).find((f) => f.endsWith(".js"));
  const code = readFileSync(join(assets, chunk), "utf8");

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><div id="root"></div>`);
  await page.addScriptTag({ content: code, type: "module" });
  let svgs = 0;
  try {
    await page.waitForSelector("svg", { timeout: 10_000 });
    // One .recharts-wrapper per chart (legend item icons are also
    // .recharts-surface svgs, so counting surfaces would over-count).
    svgs = await page.locator(".recharts-wrapper").count();
  } catch {
    /* fall through — reported below */
  }
  const expected = name.includes("-charts") ? 4 : 1;
  const ok = svgs === expected && errors.length === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? "✓" : "✗"} ${name}: ${svgs}/${expected} chart surfaces` +
      (errors.length ? ` — page errors: ${errors.join(" | ")}` : ""),
  );
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
