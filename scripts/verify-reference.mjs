import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHA = "ffb918798051ef040bb7f9922d3850c9c189f39f";
const DIR = resolve(ROOT, "vendor/recharts-reference");

if (!existsSync(`${DIR}/.git`)) {
  console.error("✗ recharts reference missing — run: npm run ref:setup");
  process.exit(1);
}
const head = execSync(`git -C "${DIR}" rev-parse HEAD`).toString().trim();
if (head !== SHA) {
  console.error(`✗ reference at ${head}, expected ${SHA} — run: npm run ref:setup`);
  process.exit(1);
}
console.log(`✓ recharts reference present, pinned at ${SHA}`);
