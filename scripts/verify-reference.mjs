import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHA = "b3451050c027a23957ffa50a2665c9119df21e47";
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
