import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import compileSolid from "unplugin-solid/rolldown";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Resolve paths against THIS file's location, not the cwd: `vp` walks up to find
// this root config whether invoked from the repo root or from the package dir, so
// a cwd-relative `test.root` would double up (packages/solid-recharts/packages/…).
const here = dirname(fileURLToPath(import.meta.url));
const libRoot = resolve(here, "packages/solid-recharts");
const packageBuildTarget = process.env.SOLID_RECHARTS_BUILD_TARGET;
const isServerPackageBuild = packageBuildTarget === "server";

// Single workspace-root config (per AGENTS.md). Vite+ (`vp`) reads this for the
// whole monorepo: dev/test transform, the test runner, and Oxlint (`vp lint` /
// `vp check`). The library package no longer carries its own vite.config — tests
// are scoped to it via `test.root` below so `vp test` from the root never globs
// the vendored recharts reference under vendor/.
export default defineConfig({
  plugins: [solid()],
  pack: {
    cwd: libRoot,
    entry: ["src/index.ts"],
    root: "src",
    outDir: isServerPackageBuild ? "dist/server" : "dist/browser",
    clean: isServerPackageBuild ? false : ["dist"],
    platform: "neutral",
    format: ["esm"],
    fixedExtension: false,
    unbundle: true,
    report: false,
    dts: !isServerPackageBuild,
    deps: {
      neverBundle: [/^solid-js(?:\/|$)/, /^d3-(?:scale|shape)(?:\/|$)/],
      onlyBundle: false,
    },
    plugins: [
      compileSolid({
        solid: {
          generate: isServerPackageBuild ? "ssr" : "dom",
          hydratable: true,
        },
      }),
    ],
  },
  test: {
    // Scope the test run to the library package: include/setup globs resolve under
    // this dir, so the vendored reference (vendor/recharts-reference/test) is never
    // collected — whether `vp test` runs from the repo root or the package.
    root: libRoot,
    environment: "jsdom",
    globals: true,
    // Force UTC so the d3 scaleTime / toLocaleDateString golden values (computed
    // under UTC, like recharts' CI) match on any host — the time-axis specs are
    // `it.skipIf(getTimezoneOffset() !== 0)`, so this makes them always run.
    env: { TZ: "UTC" },
    // Match the recharts reference vitest config: auto-restore `vi.spyOn` mocks and
    // `vi.stubGlobal` stubs after each test so spy call-counts and stubbed globals
    // (requestAnimationFrame/performance in the animation timers) don't leak.
    restoreMocks: true,
    unstubGlobals: true,
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.spec.ts?(x)", "test/**/*.test.ts?(x)"],
  },

  // Oxfmt (`vp fmt` / `vp check`): keep the formatter out of the vendored recharts
  // reference (its `www/` app has unresolved imports that abort `vp check`), the
  // independently installed Solid 2 docs app, and build output. ignorePatterns
  // here mirrors the lint ignore below.
  // *.gen.ts files are tool-generated (e.g. TanStack Router's routeTree.gen.ts in
  // app/docs) — reformatting them just creates churn against the generator.
  fmt: {
    ignorePatterns: [
      "vendor/**",
      "**/dist/**",
      "node_modules/**",
      "scripts/**",
      "bench/**",
      "app/docs/**",
      "**/*.gen.ts",
    ],
  },

  // ── Oxlint (`vp lint` / `vp check`) ───────────────────────────────────────
  // Enforces the project's type discipline (AGENTS.md "Types"): no `any`, no `as`
  // assertions, no non-null `!`. The `no-unsafe-*` family is type-aware — run with
  // `vp lint --type-aware --tsconfig ./packages/solid-recharts/tsconfig.json` (or
  // `vp check`) so they engage. `as const` is a const assertion and stays allowed.
  lint: {
    plugins: ["typescript"],
    // bench/ is a standalone npm project (react entries have no @types/react —
    // the type-aware rules would flood it with false unsafe-* errors).
    // *.gen.ts files are tool-generated (see the fmt ignore above).
    ignorePatterns: [
      "vendor/**",
      "**/dist/**",
      "node_modules/**",
      "scripts/**",
      "bench/**",
      "app/docs/**",
      "**/*.gen.ts",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      // No `any`.
      "typescript/no-explicit-any": "error",
      // No `as` type assertions (const assertions like `as const` are exempt).
      "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "typescript/prefer-as-const": "error",
      // No non-null assertions (`x!`) or the confusing `a! == b` form.
      "typescript/no-non-null-assertion": "error",
      "typescript/no-confusing-non-null-assertion": "error",
      // Type-aware: stop `any` leaking in through untyped values/boundaries.
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-argument": "error",
      // Flag assertions that don't change the type (push toward real types).
      "typescript/no-unnecessary-type-assertion": "error",
    },
    overrides: [
      {
        // Ported specs mirror recharts' tests verbatim, which legitimately use
        // `as never` / `: any` test fixtures and `@ts-expect-error` cases. The
        // discipline targets `src/`; relax the strict type rules for tests.
        files: ["**/test/**", "**/*.spec.ts", "**/*.spec.tsx", "**/*.test.ts", "**/*.test.tsx"],
        rules: {
          "typescript/no-explicit-any": "off",
          "typescript/consistent-type-assertions": "off",
          "typescript/no-non-null-assertion": "off",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-return": "off",
          "typescript/no-unsafe-argument": "off",
        },
      },
    ],
  },
});
