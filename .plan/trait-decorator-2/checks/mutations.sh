#!/usr/bin/env bash
# The mutations of proofs 1 and 2, and the before run of proof 3's removals.
# Each mutation edits one committed source file of the traits plugin, runs the
# tests that witness it, and restores the file from git. Run from the
# repository root of a clean checkout, after the plugin's tests pass.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
PLUGIN="${ROOT:?}/packages/vite-traits-plugin"
cd "${PLUGIN:?}"

# mutate NAME FILE PERL TESTS...
mutate() {
  local name=$1 file=$2 expression=$3
  shift 3
  echo "## ${name}"
  perl -0pi -e "${expression}" "${file}"
  if git diff --quiet -- "${file}"; then
    echo "mutation did not apply"
    exit 1
  fi
  aube exec vitest run -c vitest.config.ts "$@" 2>&1 |
    grep -E '^ +(✓|×) |Tests ' |
    sed -E 's/ [0-9]+ms$//' || true
  git checkout -- "${file}"
}

echo "## unmutated"
aube exec vitest run -c vitest.config.ts \
  tests/declarations.node.test.ts tests/diagnostics.node.test.ts 2>&1 |
  grep -E 'Tests ' || true

mutate 'proof 1: only whitespace between the JSDoc and the first decorator' \
  src/declaration-doc.ts \
  "s/comment\.value\.startsWith\('\*'\);/comment.value.startsWith('*') \&\&\n        code.slice(comment.end, first.start).trim() === '';/" \
  tests/declarations.node.test.ts -t 'JSDoc'

mutate 'proof 1: ExportDefaultDeclaration skipped' \
  src/declaration-doc.ts \
  "s/statement\.type === 'ExportDefaultDeclaration' &&\n    statement\.declaration\.type === 'ClassDeclaration'/false/" \
  tests/declarations.node.test.ts -t 'JSDoc'

mutate 'proof 2: the default span left out of the record' \
  src/declaration-doc.ts \
  "s/exports\.add\(exported\.exportName\);/if (exported.exportName !== 'default') {\n      exports.add(exported.exportName);\n    }/" \
  tests/diagnostics.node.test.ts -t 'without the stage'

mutate 'proof 3: a declaration with an inline type left keeps it' \
  src/syntax.ts \
  "s/!\(spec\.type === 'ImportSpecifier' && spec\.importKind === 'type'\)/true/" \
  tests/trait-module.node.test.ts tests/attributes.node.test.ts \
  tests/flatten.node.test.ts -t 'import'

mutate 'proof 3: compose is never removed' \
  src/composition/lower.ts \
  "s/if \(references > 0\) \{/if (references >= 0) {/" \
  tests/flatten.node.test.ts -t 'import|compose'
