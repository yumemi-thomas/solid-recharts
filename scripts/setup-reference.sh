#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
SHA=7a23854d847ad21aaeec6cd446fe2a37a7edb8c1
DIR=vendor/recharts-reference
if [ -d "$DIR/.git" ]; then echo "reference already present at $DIR"; exit 0; fi
mkdir -p vendor
git clone --filter=blob:none https://github.com/recharts/recharts.git "$DIR"
git -C "$DIR" checkout "$SHA"
echo "✓ recharts reference pinned at $SHA"
