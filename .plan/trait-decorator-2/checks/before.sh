#!/usr/bin/env bash
# Runs this branch's versions of the plugin's test files, except helpers.ts,
# against the plugin source of a baseline checkout: which new rows fail there.
# Usage: before.sh BASE, where BASE is a built checkout at 645410c12.
set -euo pipefail

BASE="${1:?usage: before.sh BASE}"
ROOT=$(git rev-parse --show-toplevel)
cd "${BASE:?}/packages/vite-traits-plugin"
echo "## baseline: $(git rev-parse --short HEAD)"
for file in declarations diagnostics trait-module attributes flatten; do
  cp "${ROOT:?}/packages/vite-traits-plugin/tests/${file}.node.test.ts" tests/
done
aube exec vitest run -c vitest.config.ts \
  tests/declarations.node.test.ts tests/diagnostics.node.test.ts \
  tests/trait-module.node.test.ts tests/attributes.node.test.ts \
  tests/flatten.node.test.ts 2>&1 |
  grep -E '^ +× |Tests ' | sed -E 's/ [0-9]+ms$//' || true
git checkout -- tests
