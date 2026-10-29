// Not a recharts port: enforces the repo's rule that a lint finding is fixed in the
// code (or the type), never silenced with an `eslint-disable` / `oxlint-disable`
// comment. Rule-level policy lives in `vite.config.ts` (and its test overrides); a
// file a tool generates (`*.gen.ts`, e.g. TanStack Router's route tree, which writes
// its own `/* eslint-disable */` header and is excluded from lint by config) is the
// only exception.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SUPPRESSION = /\b(?:eslint|oxlint)-disable/;
const SCANNED_ROOTS = ["packages", "app", "e2e", "scripts", "bench"];
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "vendor",
  "dist",
  ".output",
  ".vercel",
  ".tanstack",
  ".nitro",
  "test-results",
]);
const SCANNED_EXTENSIONS = /\.(?:[cm]?[jt]sx?|mdx?)$/;

function repoRoot(): string {
  let directory = process.cwd();
  while (!statSync(join(directory, "pnpm-workspace.yaml"), { throwIfNoEntry: false })?.isFile()) {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error("pnpm-workspace.yaml not found above the working directory");
    }
    directory = parent;
  }
  return directory;
}

function sourceFiles(directory: string): ReadonlyArray<string> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(path);
    }
    return SCANNED_EXTENSIONS.test(entry.name) && !entry.name.endsWith(".gen.ts") ? [path] : [];
  });
}

describe("lint suppressions", () => {
  it("are not used anywhere in the repo's own sources", () => {
    const root = repoRoot();
    const thisFile = resolve(import.meta.dirname, "noLintSuppressions.spec.ts");
    const offenders = SCANNED_ROOTS.flatMap((name) => {
      const directory = join(root, name);
      return statSync(directory, { throwIfNoEntry: false })?.isDirectory()
        ? sourceFiles(directory)
        : [];
    })
      .filter((file) => file !== thisFile)
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            SUPPRESSION.test(line) ? [`${relative(root, file)}:${index + 1}: ${line.trim()}`] : [],
          ),
      );

    expect(offenders).toEqual([]);
  });
});
