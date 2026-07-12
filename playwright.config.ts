import { defineConfig } from "@playwright/test";

// Real-browser a11y + geometry verification (complements the jsdom axe scans,
// which cannot evaluate color-contrast or real layout). Drives the app/dev Vite
// playground (`?chart=<key>`) with the bundled Chromium.
const PORT = 51847;

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.ts$/,
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command: `pnpm --filter @solid-recharts/dev exec vp dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
