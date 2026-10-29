import { defineConfig } from "vite-plus";
import solid from "@solidjs/vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Dev playground. Imports the library from source via alias so the Solid plugin transforms it.
export default defineConfig({
  // - `diagnostics: false`: the plugin would otherwise inject the diagnostics bridge on
  //   its own (it is on whenever the app declares `@solidjs/diagnostics`); src/main.tsx
  //   installs it explicitly, so the e2e gate does not depend on that auto-wiring.
  // - `performanceTracks: false`: the Chrome Performance-panel tracks keep Solid's
  //   attribution engine running for the whole dev session, which makes the app emit
  //   the engine-only cost findings (IMMUTABLE_UPDATE_IN_STORE, EFFECT_RELAY_TEAR, …)
  //   into every capture. The e2e gate asserts correctness diagnostics; update-cost
  //   budgets live in the jsdom suite (test/performance), which turns the engine on
  //   per scenario.
  plugins: [solid({ diagnostics: false, performanceTracks: false })],
  resolve: {
    // Keep "module"/"import" so deps expose their ESM builds (the narrow
    // ["development","browser"] set forced es-toolkit to its CJS build).
    conditions: ["module", "browser", "import", "development"],
    alias: { "solid-recharts": resolve(here, "../../packages/solid-recharts/src/index.ts") },
  },
});
