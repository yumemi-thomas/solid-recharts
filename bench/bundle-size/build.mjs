// Bundle-size bench: builds identical chart entries for solid-recharts (from
// repo source, like app/dev consumes it) and recharts 3.8.1 (npm dist), through
// the SAME Vite pipeline (the repo's vite-plus/rolldown + its default minifier).
//
// Two measurements per entry:
//   app — everything the browser downloads (framework + charts + data)
//   lib — framework externalized (react/react-dom/solid-js/@solidjs/web are
//         imports, not bundled): the REAL cost of the chart library itself,
//         with no baseline-subtraction approximation.
//
// Run: npm install && node build.mjs   (npm on purpose — outside the pnpm workspace)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { build } from "vite";
import solid from "@solidjs/vite-plugin";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

const FRAMEWORK = {
  solid: /^(solid-js|@solidjs\/web)($|\/)/,
  react: /^(react|react-dom)($|\/)/,
};

const targets = [
  { name: "solid-line", entry: "src/solid-line.tsx", framework: "solid" },
  { name: "solid-charts", entry: "src/solid-charts.tsx", framework: "solid" },
  { name: "react-line", entry: "src/react-line.tsx", framework: "react" },
  { name: "react-charts", entry: "src/react-charts.tsx", framework: "react" },
];

const measure = (outDir) => {
  const total = { raw: 0, gzip: 0, brotli: 0 };
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|css)$/.test(name)) {
        const buf = readFileSync(p);
        total.raw += buf.length;
        total.gzip += gzipSync(buf, { level: 9 }).length;
        total.brotli += brotliCompressSync(buf, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
        }).length;
      }
    }
  };
  walk(outDir);
  return total;
};

const sizes = {};
for (const t of targets) {
  for (const mode of ["app", "lib"]) {
    const outDir = join(here, "dist", `${t.name}-${mode}`);
    await build({
      configFile: false,
      root: here,
      logLevel: "warn",
      plugins: t.framework === "solid" ? [solid()] : [],
      resolve:
        t.framework === "solid"
          ? {
              alias: {
                "solid-recharts": resolve(repoRoot, "packages/solid-recharts/src/index.ts"),
              },
            }
          : undefined,
      build: {
        outDir,
        emptyOutDir: true,
        chunkSizeWarningLimit: 1024,
        rollupOptions: {
          input: join(here, t.entry),
          external: mode === "lib" ? [FRAMEWORK[t.framework]] : undefined,
        },
      },
    });
    sizes[`${t.name}-${mode}`] = measure(outDir);
    console.log(`built ${t.name} (${mode}): ${(sizes[`${t.name}-${mode}`].raw / 1024).toFixed(1)} KB raw`);
  }
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const row = (label, s) => `| ${label} | ${kb(s.raw)} | ${kb(s.gzip)} | ${kb(s.brotli)} |`;
const pct = (a, b) => `${(((a - b) / b) * 100).toFixed(0)}%`;

console.log("\n## Library cost (framework externalized — the real cost of the chart lib)\n");
console.log("| entry | raw | gzip | brotli |");
console.log("| --- | --- | --- | --- |");
for (const t of targets) console.log(row(t.name, sizes[`${t.name}-lib`]));
for (const scenario of ["line", "charts"]) {
  const s = sizes[`solid-${scenario}-lib`];
  const r = sizes[`react-${scenario}-lib`];
  console.log(
    `\n${scenario}: solid-recharts is ${pct(s.gzip, r.gzip)} gzip / ${pct(s.brotli, r.brotli)} brotli vs recharts`,
  );
}

console.log("\n## Full app (framework bundled — what the browser downloads)\n");
console.log("| entry | raw | gzip | brotli |");
console.log("| --- | --- | --- | --- |");
for (const t of targets) console.log(row(t.name, sizes[`${t.name}-app`]));
