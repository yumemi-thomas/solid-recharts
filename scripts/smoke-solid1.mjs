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

function output(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8" });
}

try {
  output("pnpm", ["pack", "--pack-destination", fixtureRoot], packageRoot);
  const tarball = readdirSync(fixtureRoot).find((file) => file.endsWith(".tgz"));
  if (tarball == null) {
    throw new Error("solid-recharts pack did not produce a tarball");
  }

  const archiveEntries = output(
    "tar",
    ["-tf", join(fixtureRoot, tarball)],
    fixtureRoot,
  ).split("\n");
  for (const requiredEntry of [
    "package/dist/browser/index.js",
    "package/dist/server/index.js",
    "package/dist/browser/index.d.ts",
  ]) {
    if (!archiveEntries.includes(requiredEntry)) {
      throw new Error(`solid-recharts package is missing ${requiredEntry}`);
    }
  }
  if (archiveEntries.some((entry) => /package\/src\/.*\.tsx?$/.test(entry))) {
    throw new Error("solid-recharts package must not publish raw TypeScript sources");
  }

  mkdirSync(join(fixtureRoot, "src"));
  writeFileSync(
    join(fixtureRoot, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: {
          typecheck: "tsc --noEmit",
          "build:browser": "vite build --outDir dist/browser",
          "build:ssr": "vite build --ssr src/entry-server.tsx --outDir dist/server",
          smoke: "pnpm typecheck && pnpm build:browser && pnpm build:ssr && node dist/server/entry-server.js",
        },
        dependencies: {
          "solid-js": "1.9.14",
          "solid-recharts": `file:./${tarball}`,
        },
        devDependencies: {
          "@types/node": "^22.20.1",
          typescript: "^5.9.3",
          vite: "8.0.0",
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
  writeFileSync(
    join(fixtureRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "preserve",
          jsxImportSource: "solid-js",
          strict: true,
          verbatimModuleSyntax: true,
          noEmit: true,
          types: ["vite/client", "node"],
        },
        include: ["src", "vite.config.ts"],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(fixtureRoot, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");
  writeFileSync(
    join(fixtureRoot, "src/main.tsx"),
    `import { render } from "solid-js/web";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "solid-recharts";

const data = [{ name: "A", value: 1 }, { name: "B", value: 2 }];
const root = document.getElementById("root");
if (root === null) {
  throw new Error("Solid 1 smoke fixture is missing its root element");
}
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
  root,
);
`,
  );
  writeFileSync(
    join(fixtureRoot, "src/entry-server.tsx"),
    `import { renderToString } from "solid-js/web";
import { Dot, Surface } from "solid-recharts";

const html = renderToString(() => (
  <Surface width={400} height={240}>
    <Dot cx={10} cy={10} r={4} />
  </Surface>
));
if (!html.includes("<svg") || !html.includes("<circle")) {
  throw new Error("solid-recharts SSR smoke did not render its SVG primitives");
}
`,
  );

  run("pnpm", ["install"], fixtureRoot);
  run("pnpm", ["smoke"], fixtureRoot);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
