#!/usr/bin/env node
//
// Porting queue for the recharts → SolidJS port.
//
// Ranks the un-ported recharts source files by how cheap they are to port next
// (fewest blocking dependencies, then fewest deps, then smallest), so you can
// always pull the next low-risk unit off the top.
//
// Beyond a naïve file-diff, it knows three things that actually matter here:
//
//   1. SKIP LIST — files that should NOT be ported because the Solid-native
//      architecture replaces them (React-isms, reselect/Redux helpers, types
//      already inlined elsewhere). These are excluded from the queue and listed
//      separately with a reason, so they stop resurfacing every run.
//
//   2. EXPORT-LEVEL deps — a local dependency counts as "ported" only if the
//      Solid file it resolves to actually EXPORTS the names this file imports
//      from it. A file that exists but is a partial seed (e.g. util/types grown
//      incrementally) leaves importers with STALE deps that won't compile; those
//      are surfaced and treated as blocking, so the recommended file always
//      type-checks once its listed blockers are cleared.
//
//   3. SPEC awareness — whether a dedicated `*.spec`/`*.test` exists in the
//      sibling test tree (the port is spec-first), shown per candidate.
//
// Usage:
//   node scripts/porting-queue.mjs [reactDir] [solidDir] [mode]
//   modes: --text (default) | --json | --next-json | --skipped
import fs from "node:fs";
import path from "node:path";

const reactDir = process.argv[2] ?? "vendor/recharts-reference/src";
const solidDir = process.argv[3] ?? "packages/solid-recharts/src";
const mode = process.argv[4] ?? "--text";

const exts = [".ts", ".tsx", ".js", ".jsx"];

const ignoreDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  "storybook-static",
  ".turbo",
]);

// ───────────────────────────────────────────────────────────────────────────
// SKIP LIST — intentionally NOT ported. Each entry: { pattern, reason } where
// `pattern` is an exact relative path (no extension) or a RegExp tested against
// the relative path. Keep reasons short; they're printed in the --skipped report
// and explain WHY the Solid port doesn't need this file. Mirror of the standing
// skip list in the project memory; update both together.
// ───────────────────────────────────────────────────────────────────────────
const SKIP = [
  { pattern: "util/typedDataKey", reason: "already inlined as TypedDataKey in util/types.ts" },
  { pattern: "util/resolveDefaultProps", reason: "React defaultProps shim — use Solid merge()" },
  {
    pattern: "util/createEventProxy",
    reason: "React SyntheticEvent/.persist() event pooling — Solid uses native DOM events",
  },
  {
    pattern: "state/selectors/arrayEqualityCheck",
    reason: "reselect resultEqualityCheck — Solid memoizes via createMemo, not needed",
  },
  {
    pattern: "state/selectors/numberDomainEqualityCheck",
    reason: "reselect resultEqualityCheck — Solid memoizes via createMemo, not needed",
  },
  {
    pattern: /(^|\/)RechartsReduxContext$/,
    reason: "Redux react-redux context — Solid-native store, no Redux",
  },
  {
    pattern: "component/Customized",
    reason:
      "deprecated React-element-cloning shim (cloneElement/createElement/isValidElement) — Solid has no element cloning; render components directly",
  },
  {
    pattern: "util/types",
    reason: "grown incrementally as consumers need types; never whole-file ported",
  },
];

function skipReason(relative) {
  for (const entry of SKIP) {
    if (typeof entry.pattern === "string") {
      if (entry.pattern === relative) return entry.reason;
    } else if (entry.pattern.test(relative)) {
      return entry.reason;
    }
  }
  return null;
}

// Builds the documented stub written for a skipped file (`--write-skips`). The
// stub records the reason at the file's real Solid path so the skip is visible
// in the repo (not just in this script) and the queue stops resurfacing it.
function skipStubContents(relative, reason) {
  return `// SKIPPED — intentionally NOT ported to the SolidJS port.
//
// Reason: ${reason}
//
// TODO: do not port this file as-is. The Solid-native port replaces it (see the
// reason above). If a consumer needs this path, wire it to the Solid equivalent
// instead. Tracked in scripts/porting-queue.mjs SKIP list and project memory.
export {};
`;
}

function walk(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignoreDirs.has(entry.name)) continue;

      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        visit(full);
      } else if (exts.includes(path.extname(entry.name))) {
        files.push(full);
      }
    }
  }

  visit(dir);
  return files;
}

function withoutExt(file) {
  return file.replace(/\.(ts|tsx|js|jsx)$/, "");
}

function normalizeRelative(file, root) {
  return withoutExt(path.relative(root, file)).replaceAll(path.sep, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineCount(source) {
  return source.split(/\r?\n/).length;
}

// Parse import/export-from statements into { specifier, names, hasDefault,
// hasNamespace }. `names` are the source-side names this file pulls from the
// specifier (the part before `as`), which is what the dependency must export.
function getImportBindings(source) {
  const bindings = [];

  const stmt =
    /(?:import|export)\s+(?:type\s+)?([^'"]*?)\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = stmt.exec(source))) {
    const clause = match[1].trim();
    const specifier = match[2];

    const names = new Set();
    let hasDefault = false;
    let hasNamespace = false;

    if (/\*\s+as\s+[\w$]+/.test(clause)) {
      hasNamespace = true;
    }

    const brace = clause.match(/\{([^}]*)\}/);
    if (brace) {
      for (let part of brace[1].split(",")) {
        part = part.trim().replace(/^type\s+/, "");
        if (!part) continue;
        const asMatch = part.match(/^([\w$]+)\s+as\s+[\w$]+/);
        const name = asMatch ? asMatch[1] : part.split(/\s+/)[0];
        if (name) names.add(name);
      }
    }

    // A leading bare identifier (before any `{` or `,`, and not `* as ns`) is a
    // default import.
    const beforeBrace = clause
      .split("{")[0]
      .replace(/\*\s+as\s+[\w$]+/, "")
      .replace(/,/g, " ")
      .trim();
    if (beforeBrace && /^[\w$]+$/.test(beforeBrace) && beforeBrace !== "type") {
      hasDefault = true;
    }

    bindings.push({ specifier, names: [...names], hasDefault, hasNamespace });
  }

  return bindings;
}

// Best-effort set of names a Solid file exports, plus whether it re-exports a
// wildcard (`export * from`) — in which case we can't be sure which names flow
// through, so we don't flag missing names against it.
function getExportedNames(source) {
  const names = new Set();
  let hasWildcard = false;
  let hasDefault = false;

  for (const m of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (let part of m[1].split(",")) {
      part = part.trim().replace(/^type\s+/, "");
      if (!part) continue;
      const asMatch = part.match(/\bas\s+([\w$]+)\s*$/);
      const name = asMatch ? asMatch[1] : part.split(/\s+/)[0];
      if (!name) continue;
      if (name === "default") {
        hasDefault = true;
      } else {
        names.add(name);
      }
    }
  }

  for (const m of source.matchAll(
    /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s+abstract\s+class\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s+\*\s+as\s+([\w$]+)\s+from/g)) {
    names.add(m[1]);
  }

  if (/export\s+\*\s+from/.test(source)) hasWildcard = true;
  if (/export\s+default\b/.test(source)) hasDefault = true;

  return { names, hasWildcard, hasDefault };
}

function resolveLocalImport(fromFile, specifier, rootFilesSet, rootDir) {
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.dirname(fromFile);
  const absoluteBase = path.resolve(fromDir, specifier);
  const relativeBase = withoutExt(
    path.relative(rootDir, absoluteBase),
  ).replaceAll(path.sep, "/");

  const candidates = [relativeBase, `${relativeBase}/index`];

  for (const candidate of candidates) {
    if (rootFilesSet.has(candidate)) return candidate;
  }

  return relativeBase;
}

function findMatchingExistingFile(rootDir, relativeNoExt) {
  for (const ext of exts) {
    const candidate = path.join(rootDir, `${relativeNoExt}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function classifyFile(relative) {
  const lower = relative.toLowerCase();

  if (lower.includes("test") || lower.includes("spec")) return "test";
  if (lower.includes("story") || lower.includes("stories")) return "story";
  if (lower.includes("type") || lower.endsWith("types")) return "types";
  if (lower.includes("util") || lower.includes("helper")) return "utility";
  if (lower.includes("constant")) return "constant";
  if (lower.includes("context")) return "context";
  if (lower.includes("hook") || lower.startsWith("hooks/")) return "hook";
  if (
    lower.includes("component") ||
    lower.includes("chart") ||
    lower.includes("cartesian") ||
    lower.includes("polar")
  )
    return "component";

  return "source";
}

function portingPriorityKind(kind) {
  const priorities = {
    constant: 0,
    types: 1,
    utility: 2,
    hook: 3,
    context: 4,
    source: 5,
    component: 6,
    story: 7,
    test: 8,
  };

  return priorities[kind] ?? 99;
}

// ───────────────────────────────────────────────────────────────────────────
// Spec index: the port is spec-first, so knowing whether a dedicated spec exists
// (in the sibling `test/` tree) is a first-class signal. Maps a source basename
// to the spec's relative path under the test dir.
// ───────────────────────────────────────────────────────────────────────────
function buildSpecIndex(reactSrcDir) {
  const parent = path.dirname(reactSrcDir);
  const base = path.basename(reactSrcDir);
  if (base !== "src") return new Map();
  const testDir = path.join(parent, "test");
  const byBasename = new Map();
  for (const file of walk(testDir)) {
    const name = path.basename(file);
    const m = name.match(/^(.*)\.(spec|test)\.(ts|tsx|js|jsx)$/);
    if (m && !byBasename.has(m[1])) {
      byBasename.set(m[1], path.relative(testDir, file).replaceAll(path.sep, "/"));
    }
  }
  return byBasename;
}

const reactFiles = walk(reactDir);
const solidFiles = walk(solidDir);

if (reactFiles.length === 0) {
  throw new Error(`No source files found under reactDir: ${reactDir}`);
}

const reactSet = new Set(reactFiles.map((file) => normalizeRelative(file, reactDir)));
const solidSet = new Set(solidFiles.map((file) => normalizeRelative(file, solidDir)));

const specIndex = buildSpecIndex(reactDir);

// Cache of parsed exports for Solid dep files, keyed by relative-no-ext.
const solidExportsCache = new Map();
function solidExportsFor(depRelative) {
  if (solidExportsCache.has(depRelative)) return solidExportsCache.get(depRelative);
  const file =
    findMatchingExistingFile(solidDir, depRelative) ??
    findMatchingExistingFile(solidDir, `${depRelative}/index`);
  const result = file ? getExportedNames(read(file)) : null;
  solidExportsCache.set(depRelative, result);
  return result;
}

const rows = [];
const skipped = [];

for (const reactFile of reactFiles) {
  const relative = normalizeRelative(reactFile, reactDir);

  if (solidSet.has(relative)) continue;

  const reason = skipReason(relative);
  if (reason) {
    skipped.push({ file: relative, reason });
    continue;
  }

  const source = read(reactFile);
  const bindings = getImportBindings(source);

  const localDeps = [];
  const seenDeps = new Set();
  const externalDeps = new Set();

  for (const binding of bindings) {
    if (binding.specifier.startsWith(".")) {
      const dep = resolveLocalImport(reactFile, binding.specifier, reactSet, reactDir);
      if (dep == null) continue;
      if (!seenDeps.has(dep)) {
        seenDeps.add(dep);
        localDeps.push(dep);
      }
    } else {
      externalDeps.add(binding.specifier);
    }
  }

  const unportedLocalDeps = localDeps.filter((dep) => !solidSet.has(dep));
  const portedLocalDeps = localDeps.filter((dep) => solidSet.has(dep));

  // STALE deps: the Solid file exists but doesn't export everything this file
  // imports from it (partial seed). These block compilation just like unported
  // deps, so they're surfaced and counted as blocking.
  const staleDeps = [];
  for (const binding of bindings) {
    if (!binding.specifier.startsWith(".")) continue;
    const dep = resolveLocalImport(reactFile, binding.specifier, reactSet, reactDir);
    if (dep == null || !solidSet.has(dep)) continue;
    if (binding.hasNamespace) continue; // can't verify namespace imports
    const exp = solidExportsFor(dep);
    if (exp == null || exp.hasWildcard) continue; // unknown / re-exports everything
    const missing = binding.names.filter((name) => !exp.names.has(name));
    if (binding.hasDefault && !exp.hasDefault) missing.push("default");
    if (missing.length) {
      staleDeps.push({ dep, missing });
    }
  }

  const kind = classifyFile(relative);
  const loc = lineCount(source);
  const basename = path.posix.basename(relative);
  const specPath = specIndex.get(basename) ?? null;

  const suggestedSolidPath =
    findMatchingExistingFile(solidDir, relative) ??
    path.join(solidDir, `${relative}${path.extname(reactFile)}`);

  const blockingCount = unportedLocalDeps.length + staleDeps.length;

  rows.push({
    file: relative,
    reactPath: reactFile,
    suggestedSolidPath,
    kind,
    loc,
    localDeps,
    unportedLocalDeps,
    portedLocalDeps,
    staleDeps,
    blockingCount,
    externalDeps: [...externalDeps],
    hasSpec: specPath != null,
    specPath,
    score:
      blockingCount * 1000 +
      localDeps.length * 100 +
      externalDeps.size * 10 +
      portingPriorityKind(kind) * 5 +
      Math.min(loc, 500) / 100,
  });
}

rows.sort(
  (a, b) =>
    a.score - b.score ||
    a.blockingCount - b.blockingCount ||
    a.localDeps.length - b.localDeps.length ||
    a.externalDeps.length - b.externalDeps.length ||
    a.loc - b.loc ||
    a.file.localeCompare(b.file),
);

if (mode === "--json") {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

if (mode === "--next-json") {
  console.log(JSON.stringify(rows[0] ?? null, null, 2));
  process.exit(0);
}

// All skip-matched react files (independent of whether a Solid stub already
// exists), with their mirrored Solid path and reason.
function allSkipTargets() {
  const targets = [];
  for (const reactFile of reactFiles) {
    const relative = normalizeRelative(reactFile, reactDir);
    const reason = skipReason(relative);
    if (!reason) continue;
    const ext = path.extname(reactFile);
    const destRelative = `${relative}${ext}`;
    targets.push({
      file: relative,
      reason,
      dest: path.join(solidDir, destRelative),
      exists: solidSet.has(relative),
    });
  }
  return targets.sort((a, b) => a.file.localeCompare(b.file));
}

if (mode === "--skipped") {
  console.log("Skipped (intentionally not ported)");
  console.log("==================================");
  for (const t of allSkipTargets()) {
    console.log(`  ${t.file}  ${t.exists ? "[stub written]" : "[no stub]"}`);
    console.log(`      ${t.reason}`);
  }
  console.log("");
  console.log("Run with --write-skips to materialize a documented stub for any missing one.");
  process.exit(0);
}

if (mode === "--write-skips") {
  let created = 0;
  for (const t of allSkipTargets()) {
    if (t.exists || fs.existsSync(t.dest)) continue;
    fs.mkdirSync(path.dirname(t.dest), { recursive: true });
    fs.writeFileSync(t.dest, skipStubContents(t.file, t.reason));
    console.log(`wrote ${path.relative(process.cwd(), t.dest)}`);
    created += 1;
  }
  console.log(created ? `\nCreated ${created} skip stub(s).` : "All skip stubs already present.");
  process.exit(0);
}

const next = rows[0];

if (!next) {
  console.log("All files appear to be implemented in the Solid folder.");
  process.exit(0);
}

console.log("Recommended next file to port");
console.log("=============================");
console.log(`file:                 ${next.file}`);
console.log(`kind:                 ${next.kind}`);
console.log(`react path:           ${next.reactPath}`);
console.log(`suggested solid path: ${next.suggestedSolidPath}`);
console.log(`lines:                ${next.loc}`);
console.log(`spec:                 ${next.specPath ? `test/${next.specPath}` : "none"}`);
console.log(`blocking deps:        ${next.blockingCount}`);
console.log(`unported local deps:  ${next.unportedLocalDeps.length}`);
console.log(`stale local deps:     ${next.staleDeps.length}`);
console.log(`ported local deps:    ${next.portedLocalDeps.length}`);
console.log(`external deps:        ${next.externalDeps.length}`);
console.log("");

if (next.unportedLocalDeps.length) {
  console.log("Blocking unported local deps:");
  for (const dep of next.unportedLocalDeps) {
    console.log(`  - ${dep}`);
  }
  console.log("");
} else {
  console.log("Blocking unported local deps: none");
  console.log("");
}

if (next.staleDeps.length) {
  console.log("Stale deps (file exists but missing these exports — backfill first):");
  for (const { dep, missing } of next.staleDeps) {
    console.log(`  - ${dep}  (missing: ${missing.join(", ")})`);
  }
  console.log("");
}

if (next.externalDeps.length) {
  console.log("External deps:");
  for (const dep of next.externalDeps) {
    console.log(`  - ${dep}`);
  }
  console.log("");
}

// How many candidates to print (override with PORTING_QUEUE_TOP=N).
const topN = Number(process.env.PORTING_QUEUE_TOP) || 50;

console.log(
  `Top ${topN} candidates  (block = unported+stale; columns: block u s ext loc kind spec? file)`,
);
console.log("======================================================================================");

for (const row of rows.slice(0, topN)) {
  console.log(
    [
      String(row.blockingCount).padStart(2),
      String(row.unportedLocalDeps.length).padStart(2),
      String(row.staleDeps.length).padStart(2),
      String(row.externalDeps.length).padStart(3),
      String(row.loc).padStart(4),
      row.kind.padEnd(9),
      (row.hasSpec ? "spec" : "  - ").padEnd(4),
      row.file,
    ].join("  "),
  );
}

console.log("");
console.log(
  `Skipped (intentional): ${skipped.length}  — run with --skipped to list them with reasons.`,
);
