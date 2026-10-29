// Not a recharts port: keeps AGENTS.md's description of the pnpm `overrides` true. An
// override that points at an `npm:` alias *remaps* a package (`vite` → the Vite+ core
// engine); a plain version *pins* it (`vitest` → the stock release `vite-plus` bundles,
// because vite-plus 1.x ships no separate test engine). AGENTS.md must say which is
// which, in the form "`name` is remapped to …" / "`name` is pinned to …".
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

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

type Treatment = "remapped" | "pinned";

function isTreatment(value: string): value is Treatment {
  return value === "remapped" || value === "pinned";
}

/** `overrides:` entries of pnpm-workspace.yaml as `[package, value]` (`vite@*` → `vite`). */
function workspaceOverrides(workspaceYaml: string): ReadonlyArray<readonly [string, string]> {
  const block = (workspaceYaml.split(/^overrides:[ \t]*$/m)[1] ?? "").split(/^\S/m)[0] ?? "";
  return [...block.matchAll(/^ {2}(\S+?)@\*:[ \t]*"?([^"\n]+?)"?[ \t]*$/gm)].flatMap((match) => {
    const [, name, value] = match;
    return name !== undefined && value !== undefined ? [[name, value] as const] : [];
  });
}

describe("toolchain docs", () => {
  const root = repoRoot();
  const overrides = workspaceOverrides(readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"));

  it("AGENTS.md says which pnpm overrides remap a package and which pin a version", () => {
    const actual = overrides.map(
      ([name, value]) => `${name} ${value.startsWith("npm:") ? "remapped" : "pinned"}`,
    );
    const documented = [
      ...readFileSync(join(root, "AGENTS.md"), "utf8").matchAll(
        /`([^`]+)`\s+is\s+(remapped|pinned)\s+to\b/g,
      ),
    ].flatMap(([, name, treatment]) =>
      name !== undefined && treatment !== undefined && isTreatment(treatment)
        ? [`${name} ${treatment}`]
        : [],
    );

    expect(actual.length).toBeGreaterThan(0);
    expect(documented.toSorted()).toEqual(actual.toSorted());
  });

  it("pins vitest to the release the installed vite-plus bundles", () => {
    const vitestPin = overrides.find(([name]) => name === "vitest")?.[1];
    const vitePlus: unknown = JSON.parse(
      readFileSync(join(root, "node_modules/vite-plus/package.json"), "utf8"),
    );
    const bundled =
      typeof vitePlus === "object" &&
      vitePlus !== null &&
      "dependencies" in vitePlus &&
      typeof vitePlus.dependencies === "object" &&
      vitePlus.dependencies !== null &&
      "vitest" in vitePlus.dependencies
        ? vitePlus.dependencies.vitest
        : undefined;

    expect(typeof bundled).toBe("string");
    expect(vitestPin).toBe(bundled);
  });
});
