#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
SHA=b3451050c027a23957ffa50a2665c9119df21e47
DIR=vendor/recharts-reference
if [ -d "$DIR/.git" ]; then echo "reference already present at $DIR"; exit 0; fi
mkdir -p vendor
git clone --filter=blob:none https://github.com/recharts/recharts.git "$DIR"
git -C "$DIR" checkout "$SHA"
echo "✓ recharts reference pinned at $SHA"
