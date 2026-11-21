#!/usr/bin/env bash
# reviewer-1's remediation: runs this branch's tests of the load stage against
# the stage at REV, the commit the review read, and restores the stage.
# Usage: reviewer-1-before.sh [REV], from a clean checkout.
set -euo pipefail

REV="${1:-84ca8cd26}"
ROOT=$(git rev-parse --show-toplevel)
cd "${ROOT:?}/packages/vite-traits-plugin"
echo "## the stage at $(git rev-parse --short "${REV}"), the tests at $(git rev-parse --short HEAD)"
git show "${REV}:packages/vite-traits-plugin/src/declaration-doc.ts" > src/declaration-doc.ts
aube exec vitest run -c vitest.config.ts \
  tests/declarations.node.test.ts tests/diagnostics.node.test.ts 2>&1 |
  grep -E '^ +× |Tests |Test Files |^ FAIL |TypeError' | sed -E 's/ [0-9]+ms$//' || true
git checkout -- src/declaration-doc.ts
echo "## the stage at $(git rev-parse --short HEAD)"
aube exec vitest run -c vitest.config.ts \
  tests/declarations.node.test.ts tests/diagnostics.node.test.ts 2>&1 |
  grep -E '^ +× |Tests |Test Files |^ FAIL |TypeError' | sed -E 's/ [0-9]+ms$//' || true
