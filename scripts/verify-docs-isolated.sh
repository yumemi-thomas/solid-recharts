#!/usr/bin/env bash
# Builds the docs app the way Vercel does: in a copy that has the docs workspace
# and the library SOURCE (which the docs alias imports) but none of the monorepo's
# node_modules. A plain `pnpm build` inside app/docs resolves the library's own
# dependencies (d3-scale, d3-shape, ...) from the repo root and so cannot notice
# that the docs workspace's separate lockfile is missing one.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/solid-recharts-docs-isolated.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/app" "$TMP/packages"
rsync -a --exclude node_modules --exclude .output --exclude .vercel --exclude .tanstack \
  --exclude .nitro --exclude dist "$ROOT/app/docs/" "$TMP/app/docs/"
rsync -a --exclude node_modules "$ROOT/packages/solid-recharts/" "$TMP/packages/solid-recharts/"
cp "$ROOT/tsconfig.base.json" "$TMP/"

cd "$TMP/app/docs"
pnpm install --frozen-lockfile
pnpm build
echo "✓ docs app builds in isolation (frozen lockfile, no monorepo node_modules)"
