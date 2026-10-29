import { defineConfig } from "vite-plus";
import type { DummyRuleMap } from "vite-plus/lint";
import solid from "@solidjs/vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Resolve paths against THIS file's location, not the cwd: the config is loaded from the
// repo root, or from the package dir via `--config ../../vite.config.ts` (vite-plus 1.x
// resolves its config from the working directory), so a cwd-relative `test.root` would
// double up (packages/solid-recharts/packages/…).
const here = dirname(fileURLToPath(import.meta.url));
const libRoot = resolve(here, "packages/solid-recharts");

// Solid 2.0 lint rules: eslint-plugin-solid@0.18 `configs["v2-strict"]`, written out
// so the rule set is static (importing the plugin here would load it on every `vp`
// command, test runs included) and with every `warn` promoted to `error` — the
// project policy is zero findings. Re-sync with the plugin's config when upgrading.
const solidRules: DummyRuleMap = {
  "solid/jsx-no-duplicate-props": "error",
  "solid/jsx-no-undef": "error",
  "solid/jsx-uses-vars": "error",
  "solid/no-unknown-namespaces": "error",
  "solid/no-innerhtml": "error",
  "solid/jsx-no-script-url": "error",
  "solid/components-return-once": "error",
  "solid/no-destructure": "error",
  "solid/prefer-for": "error",
  // `registerInStore` / `collectCells` take reactive thunks (their compute runs in a
  // tracking scope), so signals and props may be read inside the function they receive.
  "solid/reactivity": ["error", { customReactiveFunctions: ["registerInStore", "collectCells"] }],
  "solid/event-handlers": "error",
  "solid/imports": "error",
  "solid/style-prop": "error",
  "solid/no-react-specific-props": "error",
  "solid/self-closing-comp": "error",
  "solid/removed-api": "error",
  "solid/no-single-arg-create-effect": "error",
  "solid/no-store-mutation-outside-setter": "error",
  "solid/no-write-in-pure-computation": "error",
  "solid/no-unused-signal": "error",
  "solid/no-accessor-as-prop": "error",
  "solid/no-boolean-enumerated-attribute": "error",
  "solid/prefer-structured-class": "error",
  "solid/valid-use-server": "error",
  "solid/require-async-server-function": "error",
  "solid/no-invalid-server-capture": "error",
  "solid/no-browser-globals-in-server-function": "error",
  "solid/no-module-scope-reactive-primitive": "error",
  "solid/prefer-onSettled-for-side-effects": "error",
  "solid/no-restated-default-options": "error",
};

// Single workspace-root config (per AGENTS.md). Vite+ (`vp`) reads this for the
// whole monorepo: dev/test transform, the test runner, and Oxlint (`vp lint` /
// `vp check`). The library package no longer carries its own vite.config — tests
// are scoped to it via `test.root` below so `vp test` from the root never globs
// the vendored recharts reference under vendor/.
export default defineConfig({
  plugins: [solid()],
  // Solid 2.0's dev runtime (the `development` export condition, which carries
  // the diagnostics channel `@solidjs/diagnostics` captures) is selected by
  // @solidjs/vite-plugin itself under vitest — no manual `resolve.conditions`
  // or `define` flags are needed (the old `_SOLID_DEV_`/`__DEV__` globals no
  // longer exist in the runtime).
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
    server: {
      deps: {
        // @solidjs/testing-library and @solidjs/diagnostics import the Solid runtime
        // themselves. @solidjs/vite-plugin only inlines the runtime consumers it finds
        // in the Vite root's package.json, and ours are declared in the library
        // package (the root here is the workspace). Left external, Node would load
        // them with its own conditions: the SSR build of @solidjs/web ("Client-only
        // API called on the server side") and a second @solidjs/signals instance the
        // diagnostics channel never hears from.
        inline: [/@solidjs[\\/]testing-library/, /@solidjs[\\/]diagnostics/],
      },
    },
  },

  // Oxfmt (`vp fmt` / `vp check`): keep the formatter out of the vendored recharts
  // reference (its `www/` app has unresolved imports that abort `vp check`) and
  // build output. ignorePatterns here mirrors the lint ignore below.
  // *.gen.ts files are tool-generated (e.g. TanStack Router's routeTree.gen.ts in
  // app/docs) — reformatting them just creates churn against the generator.
  fmt: {
    ignorePatterns: [
      "vendor/**",
      "**/dist/**",
      "node_modules/**",
      "scripts/**",
      "bench/**",
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
    // eslint-plugin-solid runs as an Oxlint JS plugin (its rules are registered
    // under the `solid/` prefix). `settings.solid.version` switches it to the
    // Solid 2.0 rule semantics.
    jsPlugins: ["eslint-plugin-solid"],
    settings: { solid: { version: 2 } },
    // bench/ is a standalone npm project (react entries have no @types/react —
    // the type-aware rules would flood it with false unsafe-* errors).
    // *.gen.ts files are tool-generated (see the fmt ignore above).
    ignorePatterns: [
      "vendor/**",
      "**/dist/**",
      "node_modules/**",
      "scripts/**",
      "bench/**",
      "**/*.gen.ts",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      ...solidRules,
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
