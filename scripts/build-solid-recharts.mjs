import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(
  fileURLToPath(new URL("../packages/solid-recharts", import.meta.url)),
);

for (const target of ["browser", "server"]) {
  execFileSync("vp", ["pack"], {
    cwd: packageRoot,
    stdio: "inherit",
    env: { ...process.env, SOLID_RECHARTS_BUILD_TARGET: target },
  });
}
