import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Resolve paths against THIS file's location, not the cwd: `vp` walks up to find
// this root config whether invoked from the repo root or from the package dir, so
// a cwd-relative `test.root` would double up (packages/solid-recharts/packages/…).
const here = dirname(fileURLToPath(import.meta.url));
const libRoot = resolve(here, "packages/solid-recharts");

// Single workspace-root config (per AGENTS.md). Vite+ (`vp`) reads this for the
// whole monorepo: dev/test transform, the test runner, and Oxlint (`vp lint` /
// `vp check`). The library package no longer carries its own vite.config — tests
// are scoped to it via `test.root` below so `vp test` from the root never globs
// the vendored recharts reference under vendor/.
export default defineConfig({
  plugins: [solid()],
  // Solid 2.0's `development` export condition selects `dist/dev.js`, the build
  // that emits structured diagnostics (the `node` default selects the SSR build,
  // where reactivity — and diagnostics — are stripped). Forcing it on means our
  // test discipline (`expectClean`/`expectOnly`) has events to assert against.
  resolve: { conditions: ["development", "browser"] },
  // Belt-and-suspenders: force Solid's dev guards on so vite-plugin-solid compiles
  // in dev-only registration (owner names, graph hooks) for richer diagnostics.
  define: {
    _SOLID_DEV_: "true",
    __DEV__: "true",
  },
  test: {
    // Scope the test run to the library package: include/setup globs resolve under
    // this dir, so the vendored reference (vendor/recharts-reference/test) is never
    // collected — whether `vp test` runs from the repo root or the package.
    root: libRoot,
    environment: "jsdom",
    globals: true,
    // Match the recharts reference vitest config: auto-restore `vi.spyOn` mocks and
    // `vi.stubGlobal` stubs after each test so spy call-counts and stubbed globals
    // (requestAnimationFrame/performance in the animation timers) don't leak.
    restoreMocks: true,
    unstubGlobals: true,
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.spec.ts?(x)", "test/**/*.test.ts?(x)"],
  },

  // Oxfmt (`vp fmt` / `vp check`): keep the formatter out of the vendored recharts
  // reference (its `www/` app has unresolved imports that abort `vp check`) and
  // build output. ignorePatterns here mirrors the lint ignore below.
  fmt: {
    ignorePatterns: ["vendor/**", "**/dist/**", "node_modules/**", "scripts/**"],
  },

  // ── Oxlint (`vp lint` / `vp check`) ───────────────────────────────────────
  // Enforces the project's type discipline (AGENTS.md "Types"): no `any`, no `as`
  // assertions, no non-null `!`. The `no-unsafe-*` family is type-aware — run with
  // `vp lint --type-aware --tsconfig ./packages/solid-recharts/tsconfig.json` (or
  // `vp check`) so they engage. `as const` is a const assertion and stays allowed.
  lint: {
    plugins: ["typescript"],
    ignorePatterns: ["vendor/**", "**/dist/**", "node_modules/**", "scripts/**"],
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
      {
        // The vendored Solid-2.0 testing-library is framework glue kept as close to
        // upstream solid-testing-library as possible (so re-syncs stay mechanical);
        // it intentionally uses the assertions/any that upstream does. The type
        // discipline is for the recharts port, not this vendored package.
        files: ["packages/solid-testing-library/**"],
        rules: {
          "typescript/no-explicit-any": "off",
          "typescript/consistent-type-assertions": "off",
          "typescript/no-non-null-assertion": "off",
          "typescript/no-unnecessary-type-assertion": "off",
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
