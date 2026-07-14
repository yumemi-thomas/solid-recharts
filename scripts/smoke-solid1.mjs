import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = join(repoRoot, "packages/solid-recharts");
const fixtureRoot = mkdtempSync(join(tmpdir(), "solid-recharts-solid1-"));

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

try {
  run("pnpm", ["pack", "--pack-destination", fixtureRoot], packageRoot);
  const tarball = readdirSync(fixtureRoot).find((file) => file.endsWith(".tgz"));
  if (tarball == null) {
    throw new Error("solid-recharts pack did not produce a tarball");
  }

  mkdirSync(join(fixtureRoot, "src"));
  writeFileSync(
    join(fixtureRoot, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: { build: "vite build" },
        dependencies: {
          "solid-js": "1.9.14",
          "solid-recharts": `file:./${tarball}`,
        },
        devDependencies: {
          typescript: "^5.9.3",
          vite: "^7.0.0",
          "vite-plugin-solid": "2.11.12",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(fixtureRoot, "index.html"),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
  );
  writeFileSync(
    join(fixtureRoot, "vite.config.ts"),
    'import { defineConfig } from "vite";\nimport solid from "vite-plugin-solid";\nexport default defineConfig({ plugins: [solid()] });\n',
  );
  writeFileSync(join(fixtureRoot, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");
  writeFileSync(
    join(fixtureRoot, "src/main.tsx"),
    `import { render } from "solid-js/web";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "solid-recharts";

const data = [{ name: "A", value: 1 }, { name: "B", value: 2 }];
render(
  () => (
    <ResponsiveContainer width={400} height={240}>
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Line dataKey="value" />
      </LineChart>
    </ResponsiveContainer>
  ),
  document.getElementById("root"),
);
`,
  );

  run("pnpm", ["install"], fixtureRoot);
  run("pnpm", ["build"], fixtureRoot);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
