import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Dev playground. Imports the library from source via alias so the Solid plugin transforms it.
export default defineConfig({
  plugins: [solid()],
  resolve: {
    // Keep "module"/"import" so deps expose their ESM builds (the narrow
    // ["development","browser"] set forced es-toolkit to its CJS build).
    conditions: ["module", "browser", "import", "development"],
    alias: { "solid-recharts": resolve(here, "../../packages/solid-recharts/src/index.ts") },
  },
});
